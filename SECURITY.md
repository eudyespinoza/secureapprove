# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Security Standards

### Authentication & Authorization
- **WebAuthn Only**: Passwordless authentication with biometric verification
- **mTLS**: Mutual TLS for API-to-API communication
- **JWT Tokens**: Short-lived with secure rotation
- **Role-Based Access**: Granular permissions system

### Data Protection
- **Encryption at Rest**: AES-256 for sensitive data
- **Encryption in Transit**: TLS 1.3 minimum
- **PII Handling**: GDPR/CCPA compliant data processing
- **Audit Logging**: Immutable audit trail for all actions

### Infrastructure Security
- **Container Security**: Distroless images, minimal attack surface
- **Network Segmentation**: Isolated microservices communication
- **Rate Limiting**: Advanced throttling and DDoS protection
- **Input Validation**: Strict schema validation on all endpoints

## Reporting a Vulnerability

If you discover a security vulnerability, please:

1. **DO NOT** create a public GitHub issue
2. Email security@secureapprove.com with details
3. Include steps to reproduce the vulnerability
4. Allow 48 hours for initial response
5. Work with our team on responsible disclosure

### Response Timeline
- **Initial Response**: Within 48 hours
- **Severity Assessment**: Within 5 business days  
- **Fix Implementation**: Based on severity (Critical: 24-48h, High: 1 week, Medium: 2 weeks)
- **Public Disclosure**: After fix deployment + 90 days

### Scope
Security issues in the following are in scope:
- Authentication bypass
- Authorization escalation
- Data exposure or injection
- Remote code execution
- Denial of service vulnerabilities

Out of scope:
- Social engineering attacks
- Physical security issues
- Third-party dependencies (report to maintainers)
- Issues requiring physical device access

## Security Contacts
- **Primary**: security@secureapprove.com
- **Emergency**: +1-XXX-XXX-XXXX (24/7 response)
- **PGP Key**: Available at keybase.io/secureapprove

Thank you for helping keep SecureApprove secure!