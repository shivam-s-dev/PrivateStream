#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient;

/// Helper to deploy and initialize the contract with a mock USDC token
fn setup() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(MarketplaceContract, ());
    let admin = Address::generate(&env);
    
    // Deploy a mock SAC token for testing
    let token_admin = Address::generate(&env);
    let usdc_token = env.register_stellar_asset_contract_v2(token_admin.clone());

    let client = MarketplaceContractClient::new(&env, &contract_id);
    client.initialize(&usdc_token.address(), &admin, &50u32); // 0.5% fee

    (env, contract_id, admin, usdc_token.address(), token_admin)
}

#[test]
fn test_initialize_sets_dataset_count_to_zero() {
    let (env, contract_id, _, _, _) = setup();
    let client = MarketplaceContractClient::new(&env, &contract_id);
    assert_eq!(client.get_dataset_count(), 0);
}

#[test]
fn test_register_dataset_increments_count() {
    let (env, contract_id, _, _, _) = setup();
    let client = MarketplaceContractClient::new(&env, &contract_id);
    let provider = Address::generate(&env);

    let id = client.register_dataset(
        &provider,
        &String::from_str(&env, "DEX Analytics"),
        &1u32,
        &42i128,
        &String::from_str(&env, "sha256hashofendpoint"),
    );

    assert_eq!(id, 1);
    assert_eq!(client.get_dataset_count(), 1);
}

#[test]
fn test_state_channel_lifecycle() {
    let (env, contract_id, fee_collector, usdc_token, _token_admin) = setup();
    let client = MarketplaceContractClient::new(&env, &contract_id);
    let token = TokenClient::new(&env, &usdc_token);
    let stellar_token = StellarAssetClient::new(&env, &usdc_token);
    
    let provider = Address::generate(&env);
    let consumer = Address::generate(&env);
    
    // Mint some mock USDC to consumer
    stellar_token.mint(&consumer, &1000);

    let dataset_id = client.register_dataset(
        &provider,
        &String::from_str(&env, "Price Feeds"),
        &2u32,
        &18i128,
        &String::from_str(&env, "abc123hash"),
    );

    let session_id = String::from_str(&env, "session-123");
    
    // 1. Open Session (Locks 1000 USDC)
    client.open_session(&consumer, &session_id, &dataset_id, &1000);
    
    // Verify escrow
    assert_eq!(token.balance(&consumer), 0);
    assert_eq!(token.balance(&contract_address_from_id(&env, &contract_id)), 1000);

    let session = client.get_session(&session_id);
    assert_eq!(session.status, SessionStatus::Active);
    assert_eq!(session.budget, 1000);

    // 2. Settle Session (Consumes 500 USDC)
    client.settle_session(&session_id, &500);

    // Fee is 0.5% of 500 = 2 stroops (rounding down)
    // Provider gets 498, Fee Collector gets 2, Consumer gets 500 refunded
    assert_eq!(token.balance(&consumer), 500);
    assert_eq!(token.balance(&provider), 498);
    assert_eq!(token.balance(&fee_collector), 2);
    
    let settled_session = client.get_session(&session_id);
    assert_eq!(settled_session.status, SessionStatus::Settled);
}

fn contract_address_from_id(_env: &Env, id: &Address) -> Address {
    id.clone()
}
