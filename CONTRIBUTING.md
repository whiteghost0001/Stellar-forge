# Contributing to StellarForge

Thank you for your interest in contributing to StellarForge! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

- **Rust**: For building Soroban contracts
- **Node.js** (v18+): For frontend development
- **Soroban CLI**: For contract deployment and testing
- **Git**: Version control

### Initial Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Stellar-forge.git
   cd Stellar-forge
   ```

3. Install dependencies:
   ```bash
   # Install root dependencies (husky, lint-staged)
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   ```

4. Set up Soroban environment:
   ```bash
   ./scripts/setup-soroban.sh
   ```

### Pre-commit Hooks

This project uses **husky** and **lint-staged** to ensure code quality before commits.

#### What Happens on Commit

When you commit changes, the pre-commit hook automatically:
- Runs ESLint on staged `.ts` and `.tsx` files
- Auto-fixes fixable linting errors
- Runs TypeScript type checking (`tsc --noEmit`)
- **Blocks the commit** if there are linting or TypeScript errors

#### Setup

Pre-commit hooks are automatically installed when you run `npm install` in the root directory (via the `prepare` script).

If hooks aren't working, manually reinstall:
```bash
npm run prepare
```

#### Bypassing Hooks (Not Recommended)

In rare cases where you need to bypass hooks:
```bash
git commit --no-verify -m "your message"
```

**Note**: This is discouraged as it may introduce code quality issues.

## Development Workflow

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates

### Making Changes

1. Make your changes in the appropriate directory (`contracts/` or `frontend/`)
2. Write tests for new functionality
3. Ensure all tests pass:
   ```bash
   # Frontend tests
   cd frontend
   npm run test
   
   # Contract tests
   cd contracts/token-factory
   cargo test
   ```

4. Run linting:
   ```bash
   cd frontend
   npm run lint
   ```

5. Commit your changes (pre-commit hooks will run automatically):
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

### Commit Message Guidelines

Follow conventional commits format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test updates
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

Example:
```bash
git commit -m "feat: add mainnet deployment confirmation modal"
git commit -m "fix: resolve wallet connection timeout issue"
```

### Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a Pull Request on GitHub
3. Fill out the PR template with:
   - Description of changes
   - Related issue number (use `Closes #XX` to auto-close issues)
   - Testing performed
   - Screenshots (if UI changes)

4. Wait for review and address any feedback

## Code Standards

### Frontend (TypeScript/React)

- Use TypeScript for all new files
- Follow React best practices and hooks patterns
- Use functional components
- Ensure accessibility (ARIA labels, semantic HTML)
- Write unit tests for utilities and hooks
- Use Tailwind CSS for styling

### Smart Contracts (Rust)

- Follow Rust naming conventions
- Add comprehensive tests for all contract functions
- Document public functions with doc comments
- Handle errors appropriately
- Consider gas optimization

## Testing

### Frontend Tests
```bash
cd frontend
npm run test              # Run tests
npm run test:ui           # Run tests with UI
npm run test:coverage     # Generate coverage report
```

### Contract Tests
```bash
cd contracts/token-factory
cargo test
```

## Security

- Review our [Security Policy](SECURITY.md) before contributing
- Never commit sensitive data (private keys, API secrets)
- Always test on testnet before mainnet
- Report security vulnerabilities privately (see SECURITY.md)

## Questions?

If you have questions or need help:
- Open a GitHub Discussion
- Check existing issues and PRs
- Review the README.md for project documentation

Thank you for contributing to StellarForge!
