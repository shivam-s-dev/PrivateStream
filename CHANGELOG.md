# Changelog

All notable changes to PrivateStream are documented here.

This project follows [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/).

---

## [Unreleased]

### Added
- Soroban event poller (`api/src/services/sessionPoller.ts`) to index `SessionSettled` events from the Stellar RPC.

---

## [0.4.0] - 2026-08-29 — State Channel Escrow Upgrade

### Added
- **`open_session` contract function:** Consumer now cryptographically locks USDC budget directly in the Soroban contract via `token.transfer()` — a true on-chain escrow.
- **`dispute_session` contract function:** Time-locked (24-hour) refund mechanism if provider fails to settle.
- **`get_session` contract function:** On-chain session state readable by anyone via Soroban RPC.
- **`Session` struct and `SessionStatus` enum** stored persistently on-chain, creating a full state machine (`Active → Settled / Disputed`).
- **Frontend escrow signing:** `app/session/[id]/page.tsx` now builds and sends the `open_session` Soroban transaction through Freighter for user signing.
- **`@stellar/stellar-sdk`** added as a frontend dependency for direct Soroban RPC calls.
- **`sessionPoller.ts`:** Backend Soroban RPC event listener boilerplate.
- **`cd.yml` workflow:** Full GitHub Actions Continuous Deployment pipeline for both Vercel (frontend) and `stellar contract deploy` (contract).

### Changed
- **`settle_session`** now distributes funds from the **contract's own escrow balance** rather than from the relayer wallet. The backend no longer holds user funds.
- **`confidential.ts`** updated to call new `settle_session` signature with `(session_id, consumed_amount)`.
- **README:** Architecture section upgraded to reflect State Channel Escrow model.

### Fixed
- Soroban SDK `wasm32-unknown-unknown` → `wasm32v1-none` target in `ci.yml` (required by Soroban SDK v25.3.2+).

---

## [0.3.0] - 2026-08-12 — UI/UX & Feedback Iteration

### Added
- Full 56-character wallet addresses displayed across Dashboard, Explore, and Dataset pages.
- `ConnectWalletButton` dropdown with Freighter (live) + xBull/Albedo (Coming Soon badges).
- Max Price filter on the Explore Datasets page.
- MPP tooltip on the dataset detail page for new users.
- Dataset Market Guide onboarding banner on Explore page.
- Prominent solid-red "Close & Settle" button on session page.
- 10-user feedback table in README with verbatim real feedback from testnet testers.

### Changed
- Dashboard "Total Earned" card now shows a loading spinner while fetching.
- Feedback table expanded from 4 columns to 6 columns.

---

## [0.2.0] - 2026-08-11 — SDK Integration & CI Fixes

### Added
- **`confidential.ts`** rewritten to use `@stellar/stellar-sdk` v16 — `rpc.Server`, `Contract`, `nativeToScVal`, `sorobanServer.prepareTransaction()`, and `sorobanServer.sendTransaction()`.
- Full CI workflow (`ci.yml`) for building and testing both frontend and Soroban contract.
- Contracts-specific workflow (`contracts.yml`) that builds WASM artifact.
- Backend workflow (`backend.yml`) for Jest API tests.
- CD workflow (`cd.yml`) for Vercel + stellar-cli deployment.

### Fixed
- WASM target corrected to `wasm32v1-none` across all workflows.

---

## [0.1.0] - 2026-08-10 — Initial Release

### Added
- Initial Soroban marketplace smart contract (`lib.rs`) with `Dataset` struct, `DataKey` enum, `initialize`, `register_dataset`, `settle_session`, `toggle_dataset`, and `get_*` functions.
- Next.js 16 frontend with App Router: Landing, Explore, Dashboard, Session, Onboard pages.
- Node.js + Express backend relay with Prisma + PostgreSQL and Upstash Redis.
- Freighter wallet integration via `@stellar/freighter-api`.
- Contract deployed to Stellar Testnet: `CDBD72VIJTM4QNV2MR3C3OBRQUHA56PSBFSUJFRHZBYUSUOCQ5TUUNBE`.
- Vercel deployment at [privatestream-stellar.vercel.app](https://privatestream-stellar.vercel.app).
