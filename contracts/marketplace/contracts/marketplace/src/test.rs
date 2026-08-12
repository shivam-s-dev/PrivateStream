#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

/// Helper to deploy and initialize the contract with a mock USDC token
fn setup() -> (Env, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(MarketplaceContract, ());
    let admin = Address::generate(&env);
    // In tests we use the admin as both fee_collector and the mock USDC token
    let usdc_token = Address::generate(&env);

    let client = MarketplaceContractClient::new(&env, &contract_id);
    client.initialize(&usdc_token, &admin, &50u32); // 0.5% fee

    (env, contract_id, admin, usdc_token)
}

#[test]
fn test_initialize_sets_dataset_count_to_zero() {
    let (env, contract_id, _, _) = setup();
    let client = MarketplaceContractClient::new(&env, &contract_id);
    assert_eq!(client.get_dataset_count(), 0);
}

#[test]
fn test_register_dataset_increments_count() {
    let (env, contract_id, _, _) = setup();
    env.mock_all_auths();

    let client = MarketplaceContractClient::new(&env, &contract_id);
    let provider = Address::generate(&env);

    let id = client.register_dataset(
        &provider,
        &String::from_str(&env, "DEX Analytics"),
        &1u32,
        &42i128,  // price_per_second in stroops
        &String::from_str(&env, "sha256hashofendpoint"),
    );

    assert_eq!(id, 1);
    assert_eq!(client.get_dataset_count(), 1);
}

#[test]
fn test_register_dataset_stores_correct_data() {
    let (env, contract_id, _, _) = setup();
    env.mock_all_auths();

    let client = MarketplaceContractClient::new(&env, &contract_id);
    let provider = Address::generate(&env);

    let id = client.register_dataset(
        &provider,
        &String::from_str(&env, "Price Feeds"),
        &2u32,
        &18i128,
        &String::from_str(&env, "abc123hash"),
    );

    let dataset = client.get_dataset(&id);

    assert_eq!(dataset.id, 1);
    assert_eq!(dataset.category, 2);
    assert_eq!(dataset.price_per_second, 18);
    assert!(dataset.is_active);
    assert_eq!(dataset.total_earned, 0);
    assert_eq!(dataset.session_count, 0);
}

#[test]
fn test_register_multiple_datasets() {
    let (env, contract_id, _, _) = setup();
    env.mock_all_auths();

    let client = MarketplaceContractClient::new(&env, &contract_id);
    let provider = Address::generate(&env);

    let id1 = client.register_dataset(&provider, &String::from_str(&env, "Dataset 1"), &1u32, &10i128, &String::from_str(&env, "hash1"));
    let id2 = client.register_dataset(&provider, &String::from_str(&env, "Dataset 2"), &2u32, &20i128, &String::from_str(&env, "hash2"));
    let id3 = client.register_dataset(&provider, &String::from_str(&env, "Dataset 3"), &3u32, &30i128, &String::from_str(&env, "hash3"));

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(id3, 3);
    assert_eq!(client.get_dataset_count(), 3);
}

#[test]
fn test_get_provider_datasets() {
    let (env, contract_id, _, _) = setup();
    env.mock_all_auths();

    let client = MarketplaceContractClient::new(&env, &contract_id);
    let provider = Address::generate(&env);

    client.register_dataset(&provider, &String::from_str(&env, "D1"), &1u32, &10i128, &String::from_str(&env, "h1"));
    client.register_dataset(&provider, &String::from_str(&env, "D2"), &2u32, &20i128, &String::from_str(&env, "h2"));

    let ids = client.get_provider_datasets(&provider);
    assert_eq!(ids.len(), 2);
}

#[test]
fn test_toggle_dataset_deactivates() {
    let (env, contract_id, _, _) = setup();
    env.mock_all_auths();

    let client = MarketplaceContractClient::new(&env, &contract_id);
    let provider = Address::generate(&env);

    let id = client.register_dataset(&provider, &String::from_str(&env, "D1"), &1u32, &10i128, &String::from_str(&env, "h1"));

    assert!(client.get_dataset(&id).is_active);
    client.toggle_dataset(&provider, &id);
    assert!(!client.get_dataset(&id).is_active);
    client.toggle_dataset(&provider, &id);
    assert!(client.get_dataset(&id).is_active);
}
