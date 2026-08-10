#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Vec, Map,
    token::Client as TokenClient,
};

#[contracttype]
#[derive(Clone)]
pub struct Dataset {
    pub id: u64,
    pub provider: Address,
    pub title: String,
    pub category: u32,
    pub price_per_second: i128,  // in stroops (USDC 7 decimals)
    pub endpoint_hash: String,   // SHA256 hash of endpoint URL (not stored plaintext)
    pub is_active: bool,
    pub total_earned: i128,
    pub session_count: u32,
}

#[contracttype]
pub enum DataKey {
    Dataset(u64),
    DatasetCount,
    ProviderDatasets(Address),
    FeeRate,          // basis points, e.g. 50 = 0.5%
    FeeCollector,
    UsdcToken,
}

#[contract]
pub struct MarketplaceContract;

#[contractimpl]
impl MarketplaceContract {
    // Initialize the contract with USDC token and fee config
    pub fn initialize(
        env: Env,
        usdc_token: Address,
        fee_collector: Address,
        fee_rate_bps: u32,     // 50 = 0.5%
    ) {
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::FeeCollector, &fee_collector);
        env.storage().instance().set(&DataKey::FeeRate, &fee_rate_bps);
        env.storage().instance().set(&DataKey::DatasetCount, &0u64);
    }

    // Provider registers a new dataset
    pub fn register_dataset(
        env: Env,
        provider: Address,
        title: String,
        category: u32,
        price_per_second: i128,
        endpoint_hash: String,
    ) -> u64 {
        provider.require_auth();

        let count: u64 = env.storage().instance()
            .get(&DataKey::DatasetCount).unwrap_or(0);
        let id = count + 1;

        let dataset = Dataset {
            id,
            provider: provider.clone(),
            title,
            category,
            price_per_second,
            endpoint_hash,
            is_active: true,
            total_earned: 0,
            session_count: 0,
        };

        env.storage().persistent().set(&DataKey::Dataset(id), &dataset);
        env.storage().instance().set(&DataKey::DatasetCount, &id);

        // Track provider's datasets
        let mut provider_datasets: Vec<u64> = env.storage().persistent()
            .get(&DataKey::ProviderDatasets(provider.clone()))
            .unwrap_or(Vec::new(&env));
        provider_datasets.push_back(id);
        env.storage().persistent()
            .set(&DataKey::ProviderDatasets(provider), &provider_datasets);

        env.events().publish(
            (symbol_short!("REGISTER"),),
            (id,)
        );

        id
    }

    // Settle a completed session: split payment between provider and fee collector
    pub fn settle_session(
        env: Env,
        dataset_id: u64,
        provider: Address,
        gross_amount: i128,
    ) {
        // Only callable by the platform (fee_collector address acts as admin here)
        let fee_collector: Address = env.storage().instance()
            .get(&DataKey::FeeCollector).unwrap();
        fee_collector.require_auth();

        let fee_rate: u32 = env.storage().instance()
            .get(&DataKey::FeeRate).unwrap_or(50);

        let fee_amount = (gross_amount * fee_rate as i128) / 10_000;
        let provider_amount = gross_amount - fee_amount;

        let usdc: Address = env.storage().instance()
            .get(&DataKey::UsdcToken).unwrap();
        let token = TokenClient::new(&env, &usdc);

        // Transfer to provider
        token.transfer(&fee_collector, &provider, &provider_amount);

        // Fee stays with fee_collector (no-op transfer needed, already there)

        // Update dataset stats
        let mut dataset: Dataset = env.storage().persistent()
            .get(&DataKey::Dataset(dataset_id)).unwrap();
        dataset.total_earned += gross_amount;
        dataset.session_count += 1;
        env.storage().persistent().set(&DataKey::Dataset(dataset_id), &dataset);

        env.events().publish(
            (symbol_short!("SETTLE"),),
            (dataset_id, provider_amount, fee_amount)
        );
    }

    // Read functions
    pub fn get_dataset(env: Env, id: u64) -> Dataset {
        env.storage().persistent().get(&DataKey::Dataset(id)).unwrap()
    }

    pub fn get_dataset_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::DatasetCount).unwrap_or(0)
    }

    pub fn get_provider_datasets(env: Env, provider: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::ProviderDatasets(provider))
            .unwrap_or(Vec::new(&env))
    }

    pub fn toggle_dataset(env: Env, provider: Address, dataset_id: u64) {
        provider.require_auth();
        let mut dataset: Dataset = env.storage().persistent()
            .get(&DataKey::Dataset(dataset_id)).unwrap();
        assert!(dataset.provider == provider, "Not your dataset");
        dataset.is_active = !dataset.is_active;
        env.storage().persistent().set(&DataKey::Dataset(dataset_id), &dataset);
    }
}
