#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, contractclient,
    Address, BytesN, Env, String, Vec, vec, symbol_short, token,
};

/// Minimal interface for initializing a deployed SEP-41 token contract.
#[contractclient(name = "TokenInitClient")]
pub trait TokenInit {
    fn initialize(env: Env, admin: Address, decimal: u32, name: String, symbol: String);
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenInfo {
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub creator: Address,
    pub created_at: u64,
    /// Whether burning is enabled for this token. Defaults to true.
    pub burn_enabled: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct FactoryState {
    pub admin: Address,
    pub paused: bool,
    pub treasury: Address,
    pub fee_token: Address,
    pub base_fee: i128,
    pub metadata_fee: i128,
    pub token_count: u32,
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Error {
    InsufficientFee = 1,
    Unauthorized = 2,
    InvalidParameters = 3,
    TokenNotFound = 4,
    MetadataAlreadySet = 5,
    AlreadyInitialized = 6,
    BurnAmountExceedsBalance = 7,
    BurnNotEnabled = 8,
    InvalidBurnAmount = 9,
    ContractPaused = 10,
}

#[contract]
pub struct TokenFactory;

#[contractimpl]
impl TokenFactory {
    pub fn initialize(
        env: Env,
        admin: Address,
        treasury: Address,
        fee_token: Address,
        base_fee: i128,
        metadata_fee: i128,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&symbol_short!("init")) {
            return Err(Error::AlreadyInitialized);
        }
        let state = FactoryState {
            admin: admin.clone(),
            paused: false,
            treasury,
            fee_token,
            base_fee,
            metadata_fee,
            token_count: 0,
        };
        env.storage().instance().set(&symbol_short!("state"), &state);
        env.storage().instance().set(&symbol_short!("init"), &true);
        env.events().publish((symbol_short!("init"),), (admin,));
        Ok(())
    }

    fn load_state(env: &Env) -> FactoryState {
        env.storage().instance().get(&symbol_short!("state")).unwrap()
    }

    fn save_state(env: &Env, state: &FactoryState) {
        env.storage().instance().set(&symbol_short!("state"), state);
    }

    fn require_not_paused(env: &Env) -> Result<(), Error> {
        if Self::load_state(env).paused {
            return Err(Error::ContractPaused);
        }
        Ok(())
    }

    /// Deploy a new token contract from `token_wasm_hash`, initialize it,
    /// and register it with the factory. `salt` must be unique per creator.
    pub fn create_token(
        env: Env,
        creator: Address,
        salt: BytesN<32>,
        token_wasm_hash: BytesN<32>,
        name: String,
        symbol: String,
        decimals: u32,
        initial_supply: i128,
        fee_payment: i128,
    ) -> Result<Address, Error> {
        Self::require_not_paused(&env)?;
        creator.require_auth();

        let mut state = Self::load_state(&env);

        if fee_payment < state.base_fee {
            return Err(Error::InsufficientFee);
        }

        // Transfer fee to treasury using the stored fee token
        token::TokenClient::new(&env, &state.fee_token).transfer(
            &creator,
            &state.treasury,
            &fee_payment,
        );

        // Deploy token contract deterministically from creator + salt
        let token_address = env
            .deployer()
            .with_address(creator.clone(), salt)
            .deploy(token_wasm_hash);

        // Initialize the deployed token
        TokenInitClient::new(&env, &token_address).initialize(
            &creator,
            &decimals,
            &name,
            &symbol,
        );

        // Mint initial supply to creator if requested
        if initial_supply > 0 {
            token::StellarAssetClient::new(&env, &token_address).mint(&creator, &initial_supply);
        }

        state.token_count += 1;
        let index = state.token_count;

        env.storage().instance().set(&index, &TokenInfo {
            name,
            symbol,
            decimals,
            creator: creator.clone(),
            created_at: env.ledger().timestamp(),
            burn_enabled: true,
        });
        Self::save_state(&env, &state);

        let creator_key = (symbol_short!("crtoks"), creator.clone());
        let mut list: Vec<u32> = env
            .storage()
            .instance()
            .get(&creator_key)
            .unwrap_or_else(|| vec![&env]);
        list.push_back(index);
        env.storage().instance().set(&creator_key, &list);

        // Store reverse mapping: token_address -> index (for burn_enabled lookup)
        env.storage().instance().set(&(&token_address, symbol_short!("idx")), &index);

        env.events()
            .publish((symbol_short!("created"),), (token_address.clone(), creator, index));
        Ok(token_address)
    }

    pub fn set_metadata(
        env: Env,
        token_address: Address,
        admin: Address,
        metadata_uri: String,
        fee_payment: i128,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        admin.require_auth();

        let state = Self::load_state(&env);

        if fee_payment < state.metadata_fee {
            return Err(Error::InsufficientFee);
        }

        token::TokenClient::new(&env, &state.fee_token).transfer(
            &admin,
            &state.treasury,
            &fee_payment,
        );

        env.storage()
            .instance()
            .set(&(&token_address, symbol_short!("meta")), &metadata_uri);

        env.events()
            .publish((symbol_short!("meta"),), (token_address, metadata_uri));
        Ok(())
    }

    pub fn mint_tokens(
        env: Env,
        token_address: Address,
        admin: Address,
        to: Address,
        amount: i128,
        fee_payment: i128,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        admin.require_auth();

        let state = Self::load_state(&env);

        if fee_payment < state.base_fee {
            return Err(Error::InsufficientFee);
        }

        token::TokenClient::new(&env, &state.fee_token).transfer(
            &admin,
            &state.treasury,
            &fee_payment,
        );

        token::StellarAssetClient::new(&env, &token_address).mint(&to, &amount);

        env.events()
            .publish((symbol_short!("minted"),), (token_address, to, amount));
        Ok(())
    }

    pub fn burn(
        env: Env,
        token_address: Address,
        from: Address,
        amount: i128,
    ) -> Result<(), Error> {
        from.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidBurnAmount);
        }

        // Check burn_enabled via reverse index lookup
        let idx_key = (&token_address, symbol_short!("idx"));
        if let Some(index) = env.storage().instance().get::<_, u32>(&idx_key) {
            let info: TokenInfo = env.storage().instance().get(&index).unwrap();
            if !info.burn_enabled {
                return Err(Error::BurnNotEnabled);
            }
        }

        token::TokenClient::new(&env, &token_address).burn(&from, &amount);

        env.events()
            .publish((symbol_short!("burned"),), (token_address, from, amount));
        Ok(())
    }

    /// Enable or disable burning for a token. Only the token creator can call this.
    pub fn set_burn_enabled(
        env: Env,
        token_address: Address,
        admin: Address,
        enabled: bool,
    ) -> Result<(), Error> {
        admin.require_auth();

        let idx_key = (&token_address, symbol_short!("idx"));
        let index: u32 = env
            .storage()
            .instance()
            .get(&idx_key)
            .ok_or(Error::TokenNotFound)?;

        let mut info: TokenInfo = env.storage().instance().get(&index).unwrap();

        if info.creator != admin {
            return Err(Error::Unauthorized);
        }

        info.burn_enabled = enabled;
        env.storage().instance().set(&index, &info);
        Ok(())
    }

    pub fn pause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        let mut state = Self::load_state(&env);
        if state.admin != admin {
            return Err(Error::Unauthorized);
        }
        state.paused = true;
        Self::save_state(&env, &state);
        Ok(())
    }

    pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        let mut state = Self::load_state(&env);
        if state.admin != admin {
            return Err(Error::Unauthorized);
        }
        state.paused = false;
        Self::save_state(&env, &state);
        Ok(())
    }

    pub fn update_fees(
        env: Env,
        admin: Address,
        base_fee: Option<i128>,
        metadata_fee: Option<i128>,
    ) -> Result<(), Error> {
        admin.require_auth();
        let mut state = Self::load_state(&env);
        if admin != state.admin {
            return Err(Error::Unauthorized);
        }
        if let Some(fee) = base_fee {
            state.base_fee = fee;
        }
        if let Some(fee) = metadata_fee {
            state.metadata_fee = fee;
        }
        Self::save_state(&env, &state);
        env.events()
            .publish((symbol_short!("fees"),), (base_fee, metadata_fee));
        Ok(())
    }

    pub fn transfer_admin(env: Env, admin: Address, new_admin: Address) -> Result<(), Error> {
        admin.require_auth();
        let mut state = Self::load_state(&env);
        if state.admin != admin {
            return Err(Error::Unauthorized);
        }
        if admin == new_admin {
            return Err(Error::InvalidParameters);
        }
        state.admin = new_admin;
        Self::save_state(&env, &state);
        Ok(())
    }

    pub fn get_state(env: Env) -> FactoryState {
        Self::load_state(&env)
    }

    pub fn get_base_fee(env: Env) -> i128 {
        Self::load_state(&env).base_fee
    }

    pub fn get_metadata_fee(env: Env) -> i128 {
        Self::load_state(&env).metadata_fee
    }

    pub fn get_token_info(env: Env, index: u32) -> Result<TokenInfo, Error> {
        env.storage()
            .instance()
            .get(&index)
            .ok_or(Error::TokenNotFound)
    }

    pub fn get_tokens_by_creator(env: Env, creator: Address) -> Vec<u32> {
        let key = (symbol_short!("crtoks"), creator);
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| vec![&env])
    }
}

#[cfg(test)]
mod test;
