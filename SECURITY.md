# Security Policy

## Supported Versions

We actively support the following versions of StellarForge:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| develop | :white_check_mark: |
| < 1.0   | :x:                |

Security updates are applied to the `main` branch and backported to active release branches when applicable.

## Reporting a Vulnerability

We take security seriously and appreciate responsible disclosure of vulnerabilities. If you discover a security issue, please follow these steps:

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities by:

1. **Email**: Send details to [security contact email - replace with actual email]
2. **GitHub Security Advisories**: Use the [private vulnerability reporting feature](https://github.com/Ejirowebfi/Stellar-forge/security/advisories/new)

### What to Include

Please provide as much information as possible:

- Type of vulnerability (e.g., contract exploit, frontend XSS, wallet integration issue)
- Steps to reproduce the issue
- Potential impact and severity assessment
- Suggested fix (if available)
- Your contact information for follow-up questions

### Response Timeline

- **Initial Response**: Within 48 hours of report submission
- **Status Update**: Within 7 days with assessment and planned actions
- **Fix Timeline**: Critical issues will be addressed within 30 days; lower severity issues within 90 days
- **Disclosure**: Coordinated disclosure after fix is deployed and users have time to update

## Security Best Practices

### For Users

- **Always Test on Testnet First**: Deploy and test your tokens on testnet before mainnet deployment
- **Verify Contract Addresses**: Double-check the factory contract ID in your environment configuration
- **Review Parameters**: Use the mainnet deployment checklist to review all token parameters before deployment
- **Secure Your Keys**: Never share your wallet private keys or seed phrases
- **Check Transaction Details**: Review all transaction details in Freighter before signing

### For Developers

- **Smart Contract Security**: All contract changes should be reviewed for reentrancy, overflow, and access control issues
- **Dependency Updates**: Keep dependencies up to date, especially Soroban SDK and Stellar SDK
- **Input Validation**: Validate all user inputs on both frontend and contract level
- **Test Coverage**: Maintain comprehensive test coverage for contracts and critical frontend logic
- **Audit Before Mainnet**: Consider professional security audits before mainnet deployment

## Known Considerations

- This project is in active development and has not undergone a formal security audit
- Smart contracts are immutable once deployed - thorough testing is essential
- Users are responsible for securing their own wallet credentials
- Transaction fees and token creation fees are paid in XLM and are non-refundable

## Disclosure Policy

- We follow a coordinated disclosure policy
- Security researchers will be credited (with permission) in release notes
- We aim to disclose vulnerabilities publicly after fixes are deployed and users have had reasonable time to update (typically 30 days)
- Critical vulnerabilities may require immediate disclosure if actively exploited

## Security Updates

Security updates will be announced through:
- GitHub Security Advisories
- Release notes in CHANGELOG.md
- Repository README updates

## Contact

For security-related questions or concerns, please contact:
- Email: [security contact email]
- GitHub: [@Ejirowebfi](https://github.com/Ejirowebfi)

Thank you for helping keep StellarForge and its users safe!
