# Contributing to StellarForge

Thanks for your interest in contributing. This guide covers everything you need to go from a fresh clone to a running local environment and a submitted pull request.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Rust | stable | Install via [rustup](https://rustup.rs) |
| Node.js | 18+ | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| Stellar CLI | latest | Installed by `./scripts/setup-soroban.sh` |
| Freighter Wallet | latest | [Browser extension](https://www.freighter.app/) |

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/<your-fork>/Stellar-forge.git
cd Stellar-forge
```

### 2. Install Stellar CLI and configure testnet

```bash
./scripts/setup-soroban.sh
```

This installs Rust (if missing), adds the `wasm32-unknown-unknown` target, installs `stellar-cli`, and registers the testnet network config.

### 3. Build the smart contract

```bash
cd contracts/token-factory
cargo build --target wasm32-unknown-unknown --release
```

### 4. Run contract tests

```bash
cargo test
```

All tests should pass before you open a PR.

### 5. Install frontend dependencies

```bash
cd ../../frontend
npm install
```

### 6. Configure environment variables

```bash
cp .env.example .env   # if it exists, otherwise create .env manually
```

Minimum required variables:

```env
VITE_NETWORK=testnet
VITE_FACTORY_CONTRACT_ID=<your-deployed-contract-id>
VITE_IPFS_API_KEY=<pinata-api-key>
VITE_IPFS_API_SECRET=<pinata-api-secret>
```

### 7. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 8. Run frontend tests and lint

```bash
npm run test    # runs vitest in watch mode
npm run lint    # ESLint
```

Use `npm run test -- --run` for a single-pass test run (useful in CI).

## Deploying a Test Contract

```bash
# From contracts/token-factory
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/token_factory.wasm \
  --source <your-testnet-secret-key> \
  --network testnet

# Initialize it
stellar contract invoke \
  --id <contract-id> \
  --source <your-testnet-secret-key> \
  --network testnet \
  -- \
  initialize \
  --admin <admin-address> \
  --treasury <treasury-address> \
  --base_fee 70000000 \
  --metadata_fee 30000000
```

Copy the contract ID into `VITE_FACTORY_CONTRACT_ID` in your `.env`.

## Contribution Workflow

1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes. Keep commits focused and use [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation only
   - `refactor:` code change with no feature/fix
   - `test:` adding or updating tests

3. Ensure all tests pass:
   ```bash
   # Contract tests
   cd contracts/token-factory && cargo test

   # Frontend tests
   cd frontend && npm run test -- --run && npm run lint
   ```

4. Push and open a pull request against `main`.

5. Fill in the PR description — what changed, why, and how to test it.

## Code Style

- **Rust**: `cargo fmt` and `cargo clippy` before committing
- **TypeScript/React**: ESLint config is enforced via `npm run lint`; follow existing patterns for component structure and hook usage
- **No `any` types** in TypeScript unless absolutely necessary and commented

## Reporting Issues

Open a GitHub issue with:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behaviour
- Environment details (OS, browser, Node version, Stellar CLI version)
