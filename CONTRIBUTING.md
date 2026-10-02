# Contributing to PrivateStream

First off, thank you for considering contributing to PrivateStream! 🎉

We welcome all kinds of contributions — bug reports, feature requests, documentation improvements, and code changes. This guide will help you get started.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Convention](#commit-message-convention)
- [Project Structure](#project-structure)

---

## Code of Conduct

This project adheres to our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/PrivateStream.git
   cd PrivateStream
   ```
3. **Add the upstream remote** so you can pull in future changes:
   ```bash
   git remote add upstream https://github.com/shivam-s-dev/PrivateStream.git
   ```

---

## Development Setup

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 22.x | Frontend & Backend runtime |
| Rust | stable (≥ 1.84) | Soroban smart contracts |
| `stellar-cli` | latest | Contract deployment & testing |
| PostgreSQL | ≥ 14 | Database (or use Neon) |
| Redis | ≥ 7 | Session caching (or use Upstash) |

### Steps

1. **Install dependencies:**
   ```bash
   # Frontend
   npm install

   # Backend
   cd api && npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Set up the database:**
   ```bash
   cd api
   npx prisma db push
   ```

4. **Run the development servers:**
   ```bash
   # Backend (in one terminal)
   cd api && npm run dev

   # Frontend (in another terminal)
   npm run dev
   ```

5. **Run Soroban contract tests:**
   ```bash
   cd contracts/marketplace
   cargo test
   ```

---

## How to Contribute

### Reporting Bugs

- Search [existing issues](https://github.com/shivam-s-dev/PrivateStream/issues) first to avoid duplicates.
- Use the **Bug Report** issue template.
- Include: steps to reproduce, expected vs. actual behavior, screenshots if applicable.

### Suggesting Features

- Open a [Feature Request](https://github.com/shivam-s-dev/PrivateStream/issues/new?template=feature_request.md) issue.
- Describe the motivation and expected behavior clearly.

### Working on Issues

- Comment on an issue to let others know you are working on it.
- For large changes, open an issue or discussion **before** writing code.
- Look for issues tagged [`good first issue`](https://github.com/shivam-s-dev/PrivateStream/labels/good%20first%20issue) if you're new.

---

## Pull Request Process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following the [Coding Standards](#coding-standards) below.

3. **Write or update tests** as appropriate:
   - Soroban contracts → `cargo test` in `contracts/marketplace/`
   - Backend → `npm run test` in `api/`
   - Frontend → `npm run build` must succeed

4. **Commit your changes** using the [Commit Message Convention](#commit-message-convention).

5. **Push to your fork** and open a Pull Request against the `main` branch.

6. **Fill out the PR template** completely. PRs without descriptions may be closed.

7. **Address review feedback** promptly. PRs inactive for 14+ days may be closed.

### PR Checklist

- [ ] All tests pass locally (`cargo test`, `npm run test`, `npm run build`)
- [ ] Code follows the style guidelines
- [ ] Documentation is updated if needed
- [ ] No secrets or private keys are committed
- [ ] The PR title follows the commit message convention

---

## Coding Standards

### TypeScript (Frontend & Backend)
- Use TypeScript strict mode — no `any` without a comment explaining why.
- Prefer `async/await` over raw Promises.
- Components must be functional (no class components).
- Keep components small and single-purpose.

### Rust (Soroban Contracts)
- Follow standard Rust formatting (`cargo fmt`).
- All public functions must have doc comments.
- No `unwrap()` in contract logic — use proper error handling with `panic!` only where intentional.
- Every new function must have a corresponding test in `test.rs`.

### General
- No hardcoded secrets or API keys anywhere in the codebase.
- All environment variables must be documented in `.env.example`.

---

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

### Types

| Type | Description |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, no logic changes |
| `refactor` | Code change that is neither a fix nor feature |
| `test` | Adding or updating tests |
| `chore` | Build process, CI/CD, tooling |
| `contract` | Changes to Soroban smart contracts |

### Examples

```
feat(session): add dispute timeout to open_session contract call
fix(backend): handle invalid provider address in settle_session
docs(readme): update architecture diagram for state channel model
contract(escrow): implement on-chain SessionStatus state machine
```

---

## Project Structure

```
PrivateStream/
├── .github/
│   ├── ISSUE_TEMPLATE/     # Bug report & feature request templates
│   └── workflows/          # CI/CD GitHub Actions
├── app/                    # Next.js 16 App Router (Frontend)
│   ├── dashboard/          # Provider & Buyer analytics
│   ├── explore/            # Dataset marketplace browser
│   ├── session/[id]/       # Live streaming session view
│   └── onboard/            # Dataset listing flow
├── api/                    # Node.js + Express backend relay
│   ├── prisma/             # Database schema
│   └── src/
│       ├── routes/         # REST API endpoints
│       ├── services/       # Soroban RPC, Redis, session poller
│       └── __tests__/      # Jest unit tests
├── components/             # Shared React components
├── contracts/
│   └── marketplace/        # Soroban smart contract (Rust)
│       └── src/
│           ├── lib.rs      # Contract implementation
│           └── test.rs     # Rust unit tests
└── assets/                 # Screenshots & diagrams for docs
```

---

## Questions?

Feel free to open a [Discussion](https://github.com/shivam-s-dev/PrivateStream/discussions) if you need help or have questions. We're happy to assist!
