# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do NOT open a public GitHub issue.**

Instead, email **hello@getomnix.dev** with:

- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Security Practices

This library follows these security practices:

- **No credential echoing** — OAuth error messages never include raw gateway response bodies
- **Buffer.from for Base64** — uses Node-native encoding, not browser `btoa`
- **Input validation at boundaries** — Zod schemas validate all external data
- **Immutable interfaces** — all types use `readonly` to prevent accidental mutation
- **No hardcoded secrets** — credentials flow through parameters, never stored in code
- **URL encoding** — all dynamic path segments use `encodeURIComponent`
