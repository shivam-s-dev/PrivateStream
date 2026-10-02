# Security Policy

## Supported Versions

PrivateStream is currently in active development. Security patches are applied to the `main` branch.

| Version | Supported          |
|---------|--------------------|
| latest (main) | ✅ Yes |
| older branches | ❌ No |

---

## Reporting a Vulnerability

**Please do NOT open a public GitHub Issue for security vulnerabilities.**

If you discover a security vulnerability, please report it responsibly by:

1. **Email:** Send details to the project maintainer privately (open a GitHub Discussion marked as private, or contact via the GitHub profile).
2. **Include in your report:**
   - Description of the vulnerability and its potential impact
   - Steps to reproduce the issue
   - Any proof-of-concept code (if applicable)
   - Your suggested fix (if you have one)

We will acknowledge your report within **48 hours** and aim to provide a full response within **7 days**.

---

## Security Architecture

PrivateStream has been designed with security in mind at every layer:

### Smart Contract Security
- All mutating functions use `require_auth()` — no function can be called without a valid cryptographic signature from the authorized party.
- The Soroban contract holds user escrow funds directly; the backend relayer **never** holds user funds.
- Budget over-spend is prevented on-chain with an assertion in `settle_session`.
- Time-locked dispute resolution prevents providers from holding funds hostage indefinitely.

### Backend Security
- The settlement relayer secret key is loaded exclusively from environment variables (`SETTLEMENT_RELAYER_SECRET`) — never hardcoded.
- All API routes validate wallet addresses before processing.
- Provider endpoint URLs are stored as **SHA-256 hashes** in the smart contract — the plaintext URL is never written on-chain.

### Frontend Security
- No private keys are ever stored in the browser.
- All blockchain signing is delegated to the Freighter wallet extension.
- Environment variables prefixed with `NEXT_PUBLIC_` contain no secrets.

---

## Known Limitations (Testnet)

- The current deployment is on **Stellar Testnet** only. Do not use real funds.
- The `SETTLEMENT_RELAYER_SECRET` must be kept secure and rotated if compromised.
- The dispute timeout is set for demonstration purposes and should be adjusted for production.
