# PrivateStream — Architecture Deep Dive

## Overview

PrivateStream implements a **Zero-Trust State Channel with Soroban Escrow** — a design pattern that combines the speed of off-chain computation with the security guarantees of on-chain escrow and trustless settlement.

---

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                                                              │
│  ┌──────────────┐   signs tx   ┌───────────────────────┐    │
│  │  Next.js 16  │ ──────────► │  Freighter Extension   │    │
│  │   Frontend   │              │  (Stellar Wallet)      │    │
│  └──────┬───────┘              └───────────────────────┘    │
│         │ REST API                                           │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐     Soroban RPC    ┌──────────────────────┐
│   Node.js Express   │ ─────────────────► │  Stellar Testnet      │
│   Backend Relay     │ ◄───────────────── │  Soroban Contract     │
│                     │    Events / State  │  (Marketplace Escrow) │
│  ┌───────────────┐  │                    └──────────────────────┘
│  │  Upstash Redis│  │
│  │  (Session     │  │     PostgreSQL
│  │   Cache)      │  │ ──────────────►  Neon DB (Prisma)
│  └───────────────┘  │
└─────────────────────┘
```

---

## The State Channel Pattern

Traditional payment systems require a blockchain transaction for every payment. PrivateStream uses a **State Channel** model:

```
OPEN                   STREAM                  SETTLE
  │                      │                       │
  ▼                      ▼                       ▼
User signs         Backend tracks           Backend submits
open_session()     spending off-chain       settle_session()
via Freighter      (every 2 seconds)        to Soroban
  │                                              │
  ▼                                              ▼
Escrow locked                            Contract splits:
in contract                              - Provider gets earned
                                         - User gets refund
                                         - Platform gets fee
```

### Why This Design?

1. **Speed:** Blockchain confirmation takes 5-7 seconds on Stellar. Real-time streaming needs sub-second metering. Off-chain state channels solve this.

2. **Cost:** If every second of data consumption triggered a blockchain transaction, fees would make the service economically unviable.

3. **Security:** Unlike pure off-chain systems (like payment channels in Lightning), the escrow is locked on-chain — neither party can cheat.

---

## Session Lifecycle (On-Chain State Machine)

```
                    ┌──────────┐
                    │   None   │ (session_id not in storage)
                    └────┬─────┘
                         │ open_session()
                         │ consumer.require_auth()
                         │ token.transfer(consumer → contract)
                         ▼
                    ┌──────────┐
                    │  Active  │
                    └────┬─────┘
            ┌────────────┴────────────────┐
            │                             │
            │ settle_session()            │ dispute_session()
            │ fee_collector.require_auth()│ consumer.require_auth()
            │                             │ must be > 24h after open
            ▼                             ▼
       ┌──────────┐                ┌──────────────┐
       │ Settled  │                │  Disputed    │
       └──────────┘                └──────────────┘
       Provider paid               Full refund to consumer
       Consumer refunded           Provider receives nothing
       Fee collected
```

---

## Token Flow Diagram

```
                  OPEN SESSION
 ┌──────────┐    token.transfer()    ┌──────────────────┐
 │ Consumer │ ─────────────────────► │  Soroban Contract │
 │  Wallet  │    budget (stroops)    │  (Escrow Vault)   │
 └──────────┘                        └────────┬─────────┘
                                              │
                  SETTLE SESSION              │
                                              │ token.transfer()
                         ┌────────────────────┤
                         │                    │
                         ▼                    ▼
                  ┌────────────┐      ┌──────────────┐
                  │  Provider  │      │   Consumer   │
                  │  Wallet    │      │   Wallet     │
                  └────────────┘      └──────────────┘
                  (earned amount)     (unspent budget)
                         
                         + ─ ─ ─ ─ ─ ─► Fee Collector
                                         (platform fee)
```

---

## Backend: Session Poller

The backend runs a Soroban RPC event listener that watches for `SETT_SESS` and `DISP_SESS` events emitted by the contract. When detected, it updates the PostgreSQL database to mark sessions as closed — keeping the off-chain DB in sync with on-chain truth.

```typescript
// api/src/services/sessionPoller.ts
const events = await sorobanServer.getEvents({
  startLedger,
  filters: [{ type: 'contract', contractIds: [MARKETPLACE_CONTRACT_ID] }]
})
```

---

## Security Model

| Threat | Mitigation |
|---|---|
| Provider never settles | `dispute_session()` — 24h timeout allows consumer full refund |
| Backend tries to steal escrow | Contract requires `fee_collector.require_auth()` — backend can only claim its configured fee |
| Consumer tries double-spend | Session status is on-chain; `settle_session` asserts `Active` state |
| Over-charging | `consumed_amount > budget` assertion in contract |
| Endpoint URL exposed | Only SHA-256 hash stored on-chain |
| Private key in code | All secrets loaded from env vars; Freighter handles user keys |
