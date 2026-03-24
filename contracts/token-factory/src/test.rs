#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

// ── helpers ───────────────────────────────────────────────────────────────────

struct Setup {
    env: Env,
    client: TokenFactoryClient<'static>,
    admin: Address,
    treasury: Address,
    /// XLM-like fee token; admin is its issuer so we can mint to payers
    fee_token: Address,
}

impl Setup {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TokenFactory);
        let client = TokenFactoryClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let treasury = Address::generate(&env);

        // Register a stellar-asset contract to use as the fee token
        let fee_token = env.register_stellar_asset_contract_v2(admin.clone()).address();

        client.initialize(&admin, &treasury, &1_000, &500);

        Setup { env, client, admin, treasury, fee_token }
    }

    /// Mint `amount` of fee tokens to `recipient` so they can pay fees.
    fn fund(&self, recipient: &Address, amount: i128) {
        StellarAssetClient::new(&self.env, &self.fee_token).mint(recipient, &amount);
    }

    /// Register a fresh stellar-asset token and return its address.
    fn new_token(&self, issuer: &Address) -> Address {
        self.env.register_stellar_asset_contract_v2(issuer.clone()).address()
    }
}

// ── initialize ────────────────────────────────────────────────────────────────

#[test]
fn test_initialize() {
    let s = Setup::new();
    let state = s.client.get_state();
    assert_eq!(state.admin, s.admin);
    assert_eq!(state.treasury, s.treasury);
    assert_eq!(state.base_fee, 1_000);
    assert_eq!(state.metadata_fee, 500);
    assert!(!state.paused);
    assert_eq!(state.token_count, 0);
}

#[test]
fn test_initialize_already_initialized() {
    let s = Setup::new();
    let result = s.client.try_initialize(&s.admin, &s.treasury, &1_000, &500);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

// ── create_token ──────────────────────────────────────────────────────────────

#[test]
fn test_create_token() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 1_000);

    let token_addr = s.new_token(&creator);
    let index = s.client.create_token(
        &creator,
        &token_addr,
        &String::from_str(&s.env, "MyToken"),
        &String::from_str(&s.env, "MTK"),
        &7,
        &1_000,
        &s.fee_token,
    );

    assert_eq!(index, 1);
    // Fee was transferred to treasury
    assert_eq!(
        TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury),
        1_000
    );
}

#[test]
fn test_create_token_insufficient_fee() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 999);

    let token_addr = s.new_token(&creator);
    let result = s.client.try_create_token(
        &creator,
        &token_addr,
        &String::from_str(&s.env, "MyToken"),
        &String::from_str(&s.env, "MTK"),
        &7,
        &999, // below base_fee of 1_000
        &s.fee_token,
    );
    assert_eq!(result, Err(Ok(Error::InsufficientFee)));
}

// ── set_metadata ──────────────────────────────────────────────────────────────

#[test]
fn test_set_metadata() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 500);

    let token_addr = s.new_token(&admin);
    let uri = String::from_str(&s.env, "ipfs://Qm123");

    s.client.set_metadata(&token_addr, &admin, &uri, &500, &s.fee_token);

    // Fee transferred to treasury
    assert_eq!(
        TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury),
        500
    );
}

#[test]
fn test_set_metadata_insufficient_fee() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    let token_addr = s.new_token(&admin);

    let result = s.client.try_set_metadata(
        &token_addr,
        &admin,
        &String::from_str(&s.env, "ipfs://Qm123"),
        &100, // below metadata_fee of 500
        &s.fee_token,
    );
    assert_eq!(result, Err(Ok(Error::InsufficientFee)));
}

// ── mint_tokens ───────────────────────────────────────────────────────────────

#[test]
fn test_mint_tokens() {
    let s = Setup::new();
    let token_admin = Address::generate(&s.env);
    s.fund(&token_admin, 1_000);

    let token_addr = s.new_token(&token_admin);
    let recipient = Address::generate(&s.env);

    s.client.mint_tokens(
        &token_addr,
        &token_admin,
        &recipient,
        &5_000,
        &1_000,
        &s.fee_token,
    );

    assert_eq!(
        TokenClient::new(&s.env, &token_addr).balance(&recipient),
        5_000
    );
}

// ── burn ──────────────────────────────────────────────────────────────────────

#[test]
fn test_burn() {
    let s = Setup::new();
    let token_admin = Address::generate(&s.env);
    let token_addr = s.new_token(&token_admin);

    // Mint some tokens to the burner first
    let burner = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &token_addr).mint(&burner, &1_000);

    s.client.burn(&token_addr, &burner, &400);

    assert_eq!(
        TokenClient::new(&s.env, &token_addr).balance(&burner),
        600
    );
}

#[test]
fn test_burn_invalid_amount() {
    let s = Setup::new();
    let token_addr = s.new_token(&s.admin);
    let burner = Address::generate(&s.env);

    let result = s.client.try_burn(&token_addr, &burner, &0);
    assert_eq!(result, Err(Ok(Error::InvalidBurnAmount)));
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

    let result = s.client.try_update_fees(&stranger, &Some(2_000_i128), &None);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

// ── get_token_info ────────────────────────────────────────────────────────────

#[test]
fn test_get_token_info() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 1_000);

    let token_addr = s.new_token(&creator);
    s.client.create_token(
        &creator,
        &token_addr,
        &String::from_str(&s.env, "MyToken"),
        &String::from_str(&s.env, "MTK"),
        &7,
        &1_000,
        &s.fee_token,
    );

    let info = s.client.get_token_info(&1);
    assert_eq!(info.name, String::from_str(&s.env, "MyToken"));
    assert_eq!(info.symbol, String::from_str(&s.env, "MTK"));
    assert_eq!(info.decimals, 7);
    assert_eq!(info.creator, creator);
}

#[test]
fn test_get_token_info_not_found() {
    let s = Setup::new();
    let result = s.client.try_get_token_info(&99);
    assert_eq!(result, Err(Ok(Error::TokenNotFound)));
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

#[test]
fn test_create_token_blocked_when_paused() {
    let s = Setup::new();
    s.client.pause(&s.admin);

    let creator = Address::generate(&s.env);
    let token_addr = s.new_token(&creator);
    let result = s.client.try_create_token(
        &creator,
        &token_addr,
        &String::from_str(&s.env, "T"),
        &String::from_str(&s.env, "T"),
        &7,
        &1_000,
        &s.fee_token,
    );
    assert_eq!(result, Err(Ok(Error::ContractPaused)));
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
    s.fund(&creator, 2_000);

    let t1 = s.new_token(&creator);
    let t2 = s.new_token(&creator);

    s.client.create_token(
        &creator, &t1,
        &String::from_str(&s.env, "A"), &String::from_str(&s.env, "A"),
        &7, &1_000, &s.fee_token,
    );
    s.client.create_token(
        &creator, &t2,
        &String::from_str(&s.env, "B"), &String::from_str(&s.env, "B"),
        &7, &1_000, &s.fee_token,
    );

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
