#![no_std]
use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype,
    Address, Env, String, Vec,
    token::Client as TokenClient,
};

// ─── Contract Events (modern #[contractevent] macro) ───────────────────────

#[contractevent]
pub struct DatasetRegistered {
    pub dataset_id: u64,
}

#[contractevent]
pub struct SessionOpened {
    pub session_id: String,
    pub consumer: Address,
    pub budget: i128,
}

#[contractevent]
pub struct SessionSettled {
    pub session_id: String,
    pub consumed_amount: i128,
    pub provider_amount: i128,
    pub refund_amount: i128,
}

#[contractevent]
pub struct SessionDisputed {
    pub session_id: String,
    pub consumer: Address,
}

// ─── Storage Types ──────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq, Debug, Eq)]
pub enum SessionStatus {
    Active,
    Settled,
    Disputed,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Session {
    pub id: String,
    pub dataset_id: u64,
    pub consumer: Address,
    pub provider: Address,
    pub budget: i128,
    pub price_per_second: i128,
    pub opened_at: u64,
    pub status: SessionStatus,
}

#[contracttype]
#[derive(Clone)]
pub struct Dataset {
    pub id: u64,
    pub provider: Address,
    pub title: String,
    pub category: u32,
    pub price_per_second: i128,  // in stroops (USDC 7 decimals)
    pub endpoint_hash: String,   // SHA-256 hash of endpoint URL (not stored plaintext)
    pub is_active: bool,
    pub total_earned: i128,
    pub session_count: u32,
}

#[contracttype]
pub enum DataKey {
    Dataset(u64),
    DatasetCount,
    ProviderDatasets(Address),
    FeeRate,       // basis points, e.g. 50 = 0.5%
    FeeCollector,
    UsdcToken,
    Session(String),
}

// ─── Contract ───────────────────────────────────────────────────────────────

#[contract]
pub struct MarketplaceContract;

#[contractimpl]
impl MarketplaceContract {
    /// Initialize the contract with USDC token and fee config.
    /// Must be called once after deployment.
    pub fn initialize(
        env: Env,
        usdc_token: Address,
        fee_collector: Address,
        fee_rate_bps: u32,  // 50 = 0.5%
    ) {
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::FeeCollector, &fee_collector);
        env.storage().instance().set(&DataKey::FeeRate, &fee_rate_bps);
        env.storage().instance().set(&DataKey::DatasetCount, &0u64);
    }

    /// Register a new dataset on-chain. Provider's wallet must sign.
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

        env.events().publish_event(&DatasetRegistered { dataset_id: id });

        id
    }

    /// Open a state channel session and lock consumer's budget in escrow.
    /// Consumer's wallet must sign — funds are pulled from their account.
    pub fn open_session(
        env: Env,
        consumer: Address,
        session_id: String,
        dataset_id: u64,
        budget: i128,
    ) {
        consumer.require_auth();

        assert!(
            !env.storage().persistent().has(&DataKey::Session(session_id.clone())),
            "Session already exists"
        );

        let dataset: Dataset = env.storage().persistent()
            .get(&DataKey::Dataset(dataset_id))
            .expect("Dataset not found");
        assert!(dataset.is_active, "Dataset inactive");
        assert!(budget > 0, "Budget must be positive");

        // Lock funds in the contract (Escrow)
        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token = TokenClient::new(&env, &usdc);
        let contract_address = env.current_contract_address();
        token.transfer(&consumer, &contract_address, &budget);

        let session = Session {
            id: session_id.clone(),
            dataset_id,
            consumer: consumer.clone(),
            provider: dataset.provider,
            budget,
            price_per_second: dataset.price_per_second,
            opened_at: env.ledger().timestamp(),
            status: SessionStatus::Active,
        };
        env.storage().persistent().set(&DataKey::Session(session_id.clone()), &session);

        env.events().publish_event(&SessionOpened {
            session_id,
            consumer,
            budget,
        });
    }

    /// Settle a completed session: distribute escrowed funds to provider,
    /// collect platform fee, and refund unspent budget to consumer.
    /// Only callable by the fee_collector (backend relayer).
    pub fn settle_session(
        env: Env,
        session_id: String,
        consumed_amount: i128,
    ) {
        let fee_collector: Address = env.storage().instance()
            .get(&DataKey::FeeCollector).unwrap();
        fee_collector.require_auth();

        let mut session: Session = env.storage().persistent()
            .get(&DataKey::Session(session_id.clone()))
            .expect("Session not found");
        assert!(session.status == SessionStatus::Active, "Session not active");
        assert!(consumed_amount <= session.budget, "Consumed amount exceeds budget");

        session.status = SessionStatus::Settled;
        env.storage().persistent().set(&DataKey::Session(session_id.clone()), &session);

        let fee_rate: u32 = env.storage().instance().get(&DataKey::FeeRate).unwrap_or(50);
        let fee_amount = (consumed_amount * fee_rate as i128) / 10_000;
        let provider_amount = consumed_amount - fee_amount;
        let refund_amount = session.budget - consumed_amount;

        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token = TokenClient::new(&env, &usdc);
        let contract_address = env.current_contract_address();

        if provider_amount > 0 {
            token.transfer(&contract_address, &session.provider, &provider_amount);
        }
        if fee_amount > 0 {
            token.transfer(&contract_address, &fee_collector, &fee_amount);
        }
        if refund_amount > 0 {
            token.transfer(&contract_address, &session.consumer, &refund_amount);
        }

        // Update dataset statistics
        let mut dataset: Dataset = env.storage().persistent()
            .get(&DataKey::Dataset(session.dataset_id)).unwrap();
        dataset.total_earned += consumed_amount;
        dataset.session_count += 1;
        env.storage().persistent().set(&DataKey::Dataset(session.dataset_id), &dataset);

        env.events().publish_event(&SessionSettled {
            session_id,
            consumed_amount,
            provider_amount,
            refund_amount,
        });
    }

    /// Dispute a session if provider fails to settle within 24 hours.
    /// Consumer receives a full refund of the locked budget.
    pub fn dispute_session(env: Env, session_id: String) {
        let mut session: Session = env.storage().persistent()
            .get(&DataKey::Session(session_id.clone()))
            .expect("Session not found");

        session.consumer.require_auth();
        assert!(session.status == SessionStatus::Active, "Session not active");

        // 24-hour timeout
        let current_time = env.ledger().timestamp();
        assert!(
            current_time >= session.opened_at + 86400,
            "Dispute period not yet reached (24h required)"
        );

        session.status = SessionStatus::Disputed;
        env.storage().persistent().set(&DataKey::Session(session_id.clone()), &session);

        // Full refund to consumer
        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token = TokenClient::new(&env, &usdc);
        let contract_address = env.current_contract_address();

        if session.budget > 0 {
            token.transfer(&contract_address, &session.consumer, &session.budget);
        }

        env.events().publish_event(&SessionDisputed {
            session_id,
            consumer: session.consumer,
        });
    }

    // ─── Read-only functions ────────────────────────────────────────────────

    pub fn get_session(env: Env, session_id: String) -> Session {
        env.storage().persistent().get(&DataKey::Session(session_id)).unwrap()
    }

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

mod test;
