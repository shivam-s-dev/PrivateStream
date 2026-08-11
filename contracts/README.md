# 📜 PrivateStream Smart Contracts (Soroban)

This directory contains the core on-chain logic and smart contracts powering the **PrivateStream** data marketplace on the Stellar blockchain. The project leverages **Soroban (Stellar's smart contract platform)** alongside the **Micropayment Protocol (MPP)** to enable real-time, trustless, and confidential data streaming.

## 🏗 Blockchain Architecture

PrivateStream utilizes a hybrid on-chain/off-chain architecture to maximize speed and minimize transaction fees while retaining cryptographic guarantees:

1. **Soroban Smart Contracts**: Handle dataset registration, global provider registries, and final payment settlement validation.
2. **Micropayment Protocol (MPP)**: An off-chain state channel protocol that allows buyers to continuously stream nano-payments (e.g., fraction of a cent per second) directly to data providers.
3. **Confidential Tokens**: Ensures that the specific dollar amounts being settled for high-value proprietary data feeds remain hidden from the public ledger, protecting business intelligence.

## 🔗 Deployed Contracts (Stellar Testnet)

The following contracts are currently deployed and actively verified on the **Stellar Testnet**:

| Contract Name | Contract Address / ID | Explorer Link |
| --- | --- | --- |
| **Marketplace Registry** | `CDHYKZOFKDQNS5S4RY2AGBYWB7VDRN3INFBFKNKLULD2KA24W2RE66UD` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDHYKZOFKDQNS5S4RY2AGBYWB7VDRN3INFBFKNKLULD2KA24W2RE66UD) |
| **Confidential Wrapper** | `CDHYKZOFKDQNS5S4RY2AGBYWB7VDRN3INFBFKNKLULD2KA24W2RE66UD` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDHYKZOFKDQNS5S4RY2AGBYWB7VDRN3INFBFKNKLULD2KA24W2RE66UD) |

> *Note: The marketplace logic currently routes through the primary contract ID above.*

## 📂 Directory Structure

```text
contracts/
├── marketplace/                 # Main Soroban workspace
│   ├── contracts/               # Individual smart contracts
│   │   ├── registry/            # Data provider & dataset registration
│   │   └── settlement/          # MPP state channel resolution
│   ├── Cargo.toml               # Workspace configuration
│   └── README.md                
└── README.md                    # This documentation file
```

## ⚙️ Development & Testing

To compile and test the Soroban contracts locally, you need the Rust toolchain and the Stellar CLI.

### 1. Prerequisites
- [Rust](https://rustup.rs/) (latest stable)
- `target`: `wasm32-unknown-unknown` (`rustup target add wasm32-unknown-unknown`)
- [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)

### 2. Building the Contracts
Navigate to the `marketplace` workspace and build the WASM binaries:
```bash
cd marketplace
stellar contract build
```

### 3. Running Unit Tests
```bash
cargo test
```

## 🔄 The Settlement Flow

When a streaming session ends in the application (e.g., the user clicks "End & Settle"), the following lifecycle executes:
1. The **Buyer** submits the final aggregated, cryptographically signed MPP state proof to the API.
2. The **API/Provider** verifies the signature against the buyer's public key.
3. The provider submits the final settlement transaction to the Soroban `settlement` contract on the Stellar Testnet.
4. The smart contract validates the channel constraints, unlocks the escrowed USDC, and transfers the finalized amount to the provider, returning the unspent remainder to the buyer.

For a live demonstration of this settlement flow, initialize a streaming session in the PrivateStream frontend and monitor the transaction hash returned on the UI in [Stellar Expert](https://stellar.expert).
