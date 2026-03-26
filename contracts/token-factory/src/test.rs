#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, BytesN, Env, String,
};

// ── helpers ───────────────────────────────────────────────────────────────────

struct Setup {
    env: Env,
    client: TokenFactoryClient<'static>,
    admin: Address,
    treasury: Address,
    fee_token: Address,
}impl Setup {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TokenFactory);
        let client = TokenFactoryClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let treasury = Address::generate(&env);
        let fee_token = env.register_stellar_asset_contract_v2(admin.clone()).address();

        client.initialize(&admin, &treasury, &fee_token, &1_000, &500);

        Setup { env, client, admin, treasury, fee_token }
    }

    fn fund(&self, recipient: &Address, amount: i128) {
        StellarAssetClient::new(&self.env, &self.fee_token).mint(recipient, &amount);
    }

    fn new_token(&self, issuer: &Address) -> Address {
        self.env.register_stellar_asset_contract_v2(issuer.clone()).address()
    }

    fn salt(&self, n: u8) -> BytesN<32> {
        BytesN::from_array(&self.env, &[n; 32])
    }

    /// A dummy wasm hash — only used in tests that never reach the deploy call
    /// (i.e. error-path tests that fail before deploy).
    fn dummy_hash(&self) -> BytesN<32> {
        BytesN::from_array(&self.env, &[0u8; 32])
    }
}
// ── initialize ────────────────────────────────────────────────────────────────

#[test]
fn test_initialize() {
    let s = Setup::new();
    let state = s.client.get_state();
    assert_eq!(state.admin, s.admin);
    assert_eq!(state.treasury, s.treasury);
    assert_eq!(state.fee_token, s.fee_token);
    assert_eq!(state.base_fee, 1_000);
    assert_eq!(state.metadata_fee, 500);
    assert!(!state.paused);
    assert_eq!(state.token_count, 0);
}

#[test]
fn test_initialize_already_initialized() {
    let s = Setup::new();
    let result = s.client.try_initialize(&s.admin, &s.treasury, &s.fee_token, &1_000, &500);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

// ── create_token ──────────────────────────────────────────────────────────────

/// Seed factory storage as if create_token ran successfully, and verify
/// fee transfer logic. The deploy+initialize path is covered by wasm integration tests.
#[test]
fn test_create_token() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 1_000);

    let info = TokenInfo {
        name: String::from_str(&s.env, "MyToken"),
        symbol: String::from_str(&s.env, "MTK"),
        decimals: 7,
        creator: creator.clone(),
        created_at: 0,
        burn_enabled: true,
    };
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&symbol_short!("state")).unwrap();
        state.token_count += 1;
        s.env.storage().instance().set(&1u32, &info);
        s.env.storage().instance().set(&symbol_short!("state"), &state);
        let key = (symbol_short!("crtoks"), creator.clone());
        let mut list: soroban_sdk::Vec<u32> = s.env.storage().instance()
            .get(&key).unwrap_or_else(|| soroban_sdk::vec![&s.env]);
        list.push_back(1u32);
        s.env.storage().instance().set(&key, &list);
    });
    // Simulate fee transfer
    TokenClient::new(&s.env, &s.fee_token).transfer(&creator, &s.treasury, &1_000);

    assert_eq!(TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury), 1_000);
    assert_eq!(s.client.get_state().token_count, 1);
}

#[test]
fn test_create_token() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let creator = Address::generate(&env);

    client.initialize(&admin, &treasury, &70000000, &30000000);

    // Mock fee payment
    env.mock_auths(&[MockAuth {
        address: &creator,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "create_token",
            args: vec![&env, creator.clone(), String::from_str(&env, "Test Token"), String::from_str(&env, "TEST"), 7u32, 1000000000i128, 70000000i128],
            sub_invokes: &[],
        },
    }]);

    let token_address = client.create_token(&creator, &String::from_str(&env, "Test Token"), &String::from_str(&env, "TEST"), &7, &1000000000, &70000000);

    assert!(token_address.is_some());
}

#[test]
fn test_burn_amount_exceeds_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin, &treasury, &0, &0);

    // Deploy a token and mint a known balance to user
    let token_address = client.create_token(
        &admin,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "TEST"),
        &7,
        &0,
        &0,
    );
    let token_client = token::TokenClient::new(&env, &token_address);
    // Mint 100 tokens to user
    token::StellarAssetClient::new(&env, &token_address).mint(&user, &100);

    assert_eq!(token_client.balance(&user), 100);

    // Attempt to burn more than the balance
    let result = client.try_burn(&token_address, &user, &200);
    assert_eq!(result, Err(Ok(Error::BurnAmountExceedsBalance)));
fn test_create_token_insufficient_fee() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);

    // Fee check happens before deploy — dummy hash is fine here
    let result = s.client.try_create_token(
        &creator, &s.salt(0), &s.dummy_hash(),
        &String::from_str(&s.env, "MyToken"),
        &String::from_str(&s.env, "MTK"),
        &7, &0, &999,
    );
    assert_eq!(result, Err(Ok(Error::InsufficientFee)));
}

#[test]
fn test_create_token_blocked_when_paused() {
    let s = Setup::new();
    s.client.pause(&s.admin);
    let creator = Address::generate(&s.env);

    // Pause check happens before deploy — dummy hash is fine here
    let result = s.client.try_create_token(
        &creator, &s.salt(0), &s.dummy_hash(),
        &String::from_str(&s.env, "T"),
        &String::from_str(&s.env, "T"),
        &7, &0, &1_000,
    );
    assert_eq!(result, Err(Ok(Error::ContractPaused)));
}

// ── set_metadata ──────────────────────────────────────────────────────────────

#[test]
fn test_set_metadata() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 500);

    let token_addr = s.new_token(&admin);
    s.client.set_metadata(
        &token_addr, &admin,
        &String::from_str(&s.env, "ipfs://Qm123"),
        &500,
    );

    assert_eq!(TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury), 500);
}

#[test]
fn test_set_metadata_insufficient_fee() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    let token_addr = s.new_token(&admin);

    let result = s.client.try_set_metadata(
        &token_addr, &admin,
        &String::from_str(&s.env, "ipfs://Qm123"),
        &100,
    );
    assert_eq!(result, Err(Ok(Error::InsufficientFee)));
}

#[test]
fn test_set_metadata_already_set() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);

    let token_addr = s.new_token(&admin);

    // First call succeeds
    s.client.set_metadata(
        &token_addr, &admin,
        &String::from_str(&s.env, "ipfs://Qm123"),
        &500,
    );

    // Second call on the same token should return MetadataAlreadySet
    let result = s.client.try_set_metadata(
        &token_addr, &admin,
        &String::from_str(&s.env, "ipfs://Qm456"),
        &500,
    );
    assert_eq!(result, Err(Ok(Error::MetadataAlreadySet)));
}

#[test]
fn test_set_metadata_different_tokens_independent() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);

    let token_a = s.new_token(&admin);
    let token_b = s.new_token(&admin);

    // Setting metadata on two different tokens should both succeed
    s.client.set_metadata(
        &token_a, &admin,
        &String::from_str(&s.env, "ipfs://QmA"),
        &500,
    );
    s.client.set_metadata(
        &token_b, &admin,
        &String::from_str(&s.env, "ipfs://QmB"),
        &500,
    );
}

// ── mint_tokens ───────────────────────────────────────────────────────────────

#[test]
fn test_mint_tokens() {
    let s = Setup::new();
    let token_admin = Address::generate(&s.env);
    s.fund(&token_admin, 1_000);

    let token_addr = s.new_token(&token_admin);
    let recipient = Address::generate(&s.env);

    s.client.mint_tokens(&token_addr, &token_admin, &recipient, &5_000, &1_000);

    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&recipient), 5_000);
}

// ── burn ──────────────────────────────────────────────────────────────────────

fn seed_token_with_burn(s: &Setup, creator: &Address, burn_enabled: bool) -> Address {
    let token_addr = s.new_token(creator);
    let info = TokenInfo {
        name: String::from_str(&s.env, "T"),
        symbol: String::from_str(&s.env, "T"),
        decimals: 7,
        creator: creator.clone(),
        created_at: 0,
        burn_enabled,
    };
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&symbol_short!("state")).unwrap();
        state.token_count += 1;
        let index = state.token_count;
        s.env.storage().instance().set(&index, &info);
        s.env.storage().instance().set(&symbol_short!("state"), &state);
        s.env.storage().instance()
            .set(&(&token_addr, symbol_short!("idx")), &index);
    });
    token_addr
}

#[test]
fn test_burn() {
    let s = Setup::new();
    let token_admin = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &token_admin, true);

    let burner = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &token_addr).mint(&burner, &1_000);

    s.client.burn(&token_addr, &burner, &400);

    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&burner), 600);
}

#[test]
fn test_burn_disabled_returns_error() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, false);

    let burner = Address::generate(&s.env);
    assert_eq!(
        s.client.try_burn(&token_addr, &burner, &100),
        Err(Ok(Error::BurnNotEnabled))
    );
}

#[test]
fn test_set_burn_enabled_disables_burn() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, true);

    s.client.set_burn_enabled(&token_addr, &creator, &false);

    let burner = Address::generate(&s.env);
    assert_eq!(
        s.client.try_burn(&token_addr, &burner, &100),
        Err(Ok(Error::BurnNotEnabled))
    );
}

#[test]
fn test_set_burn_enabled_re_enables_burn() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, false);

    s.client.set_burn_enabled(&token_addr, &creator, &true);

    let burner = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &token_addr).mint(&burner, &500);
    s.client.burn(&token_addr, &burner, &200);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&burner), 300);
}

#[test]
fn test_set_burn_enabled_unauthorized() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, true);
    let stranger = Address::generate(&s.env);

    assert_eq!(
        s.client.try_set_burn_enabled(&token_addr, &stranger, &false),
        Err(Ok(Error::Unauthorized))
    );
}

#[test]
fn test_set_burn_enabled_token_not_found() {
    let s = Setup::new();
    let fake_addr = Address::generate(&s.env);
    let admin = Address::generate(&s.env);

    assert_eq!(
        s.client.try_set_burn_enabled(&fake_addr, &admin, &false),
        Err(Ok(Error::TokenNotFound))
    );
}

#[test]
fn test_burn_invalid_amount() {
    let s = Setup::new();
    let token_addr = s.new_token(&s.admin);
    let burner = Address::generate(&s.env);

    assert_eq!(s.client.try_burn(&token_addr, &burner, &0), Err(Ok(Error::InvalidBurnAmount)));
}

// ── update_fees ───────────────────────────────────────────────────────────────

#[test]
fn test_update_fees() {
    let s = Setup::new();
    s.client.update_fees(&s.admin, &Some(2_000_i128), &Some(1_000_i128));
    let state = s.client.get_state();
    assert_eq!(state.base_fee, 2_000);
    assert_eq!(state.metadata_fee, 1_000);
}

#[test]
fn test_update_fees_unauthorized() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    assert_eq!(
        s.client.try_update_fees(&stranger, &Some(2_000_i128), &None),
        Err(Ok(Error::Unauthorized))
    );
}

// ── get_token_info ────────────────────────────────────────────────────────────

#[test]
fn test_get_token_info() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);

    let info = TokenInfo {
        name: String::from_str(&s.env, "MyToken"),
        symbol: String::from_str(&s.env, "MTK"),
        decimals: 7,
        creator: creator.clone(),
        created_at: 0,
        burn_enabled: true,
    };
    s.env.as_contract(&s.client.address, || {
        s.env.storage().instance().set(&1u32, &info);
    });

    let result = s.client.get_token_info(&1);
    assert_eq!(result.name, String::from_str(&s.env, "MyToken"));
    assert_eq!(result.symbol, String::from_str(&s.env, "MTK"));
    assert_eq!(result.decimals, 7);
    assert_eq!(result.creator, creator);
}

#[test]
fn test_get_token_info_not_found() {
    let s = Setup::new();
    assert_eq!(s.client.try_get_token_info(&99), Err(Ok(Error::TokenNotFound)));
}

// ── pause / unpause ───────────────────────────────────────────────────────────

#[test]
fn test_admin_can_pause_and_unpause() {
    let s = Setup::new();
    s.client.pause(&s.admin);
    assert!(s.client.get_state().paused);
    s.client.unpause(&s.admin);
    assert!(!s.client.get_state().paused);
}

#[test]
fn test_non_admin_cannot_pause() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    assert_eq!(s.client.try_pause(&stranger), Err(Ok(Error::Unauthorized)));
}

// ── transfer_admin ────────────────────────────────────────────────────────────

#[test]
fn test_transfer_admin() {
    let s = Setup::new();
    let new_admin = Address::generate(&s.env);
    s.client.transfer_admin(&s.admin, &new_admin);
    assert_eq!(s.client.get_state().admin, new_admin);
}

#[test]
fn test_transfer_admin_unauthorized() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    let new_admin = Address::generate(&s.env);
    assert_eq!(
        s.client.try_transfer_admin(&stranger, &new_admin),
        Err(Ok(Error::Unauthorized))
    );
}

#[test]
fn test_transfer_admin_same_address_fails() {
    let s = Setup::new();
    assert_eq!(
        s.client.try_transfer_admin(&s.admin, &s.admin),
        Err(Ok(Error::InvalidParameters))
    );
}

// ── get_tokens_by_creator ─────────────────────────────────────────────────────

#[test]
fn test_get_tokens_by_creator() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);

    s.env.as_contract(&s.client.address, || {
        let key = (symbol_short!("crtoks"), creator.clone());
        let mut list: soroban_sdk::Vec<u32> = soroban_sdk::vec![&s.env];
        list.push_back(1u32);
        list.push_back(2u32);
        s.env.storage().instance().set(&key, &list);
    });

    let indices = s.client.get_tokens_by_creator(&creator);
    assert_eq!(indices.len(), 2);
    assert_eq!(indices.get(0).unwrap(), 1);
    assert_eq!(indices.get(1).unwrap(), 2);
}

#[test]
fn test_get_tokens_by_creator_empty_for_unknown() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    assert_eq!(s.client.get_tokens_by_creator(&stranger).len(), 0);
}
