# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| main (unreleased) | ✅ Supported |
| < 1.0.0 | ❌ Not supported |

## Reporting a Vulnerability

We take security seriously. **Please do not open a public issue for security problems.**

To report a vulnerability:

1. Use GitHub's **private vulnerability reporting** on this repository:
   `https://github.com/TejaPriyan/myself-tejapriyan/security/advisories`
2. Or, if that's unavailable, open a GitHub issue with the `security` label and **do not include exploit details** — just say "security issue" and the maintainer will reply privately.

Please include:

- The affected file/endpoint.
- Steps to reproduce (minimal, without leaking sensitive data).
- Impact assessment (what an attacker could do).
- Suggested fix, if you have one.

## What to Expect

- **Acknowledgment** — you'll get a response within 72 hours.
- **Resolution** — we'll aim to fix confirmed issues promptly and publish a security advisory when appropriate.
- **Credit** — reporters of accepted findings are credited in the advisory (unless you prefer anonymity).

## Security Notes for Maintainers & Deployers

- `server.js` already blocks public access to `.env`, `server.js`, `image-api-new.js`, `package.json`, `package-lock.json`, and non-whitelisted JSON files — don't relax this.
- `database.json` and `generated-images/` are runtime data; keep them out of version control (they are in `.gitignore`).
- Never commit real API keys. Only commit to `.env.example` with placeholder values.
- Keep dependencies updated: `npm audit` and `npm update` regularly.
