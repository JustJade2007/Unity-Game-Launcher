# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a Vulnerability

We take the security of Unity Game Launcher seriously. If you discover a security vulnerability, please do not open a public issue.

Instead, please send an email to the repository maintainer or open a private security advisory on GitHub:
- Maintainer: [@JustJade2007](https://github.com/JustJade2007)

Please include:
- A description of the issue and its potential impact.
- Steps to reproduce or a proof of concept.
- Any suggested remediations or mitigations.

## Environment & Secrets Policy
- **Never commit `.env` or sensitive secret files.** All local API keys and user credentials must reside in ignored environment files.
- Only safe, public tokens (such as Supabase `anon` / public keys guarded by Row Level Security) should be referenced client-side.
- **External Configuration & Data**: The user's external runtime `config.json` and `games.json` files reside in `%APPDATA%\Unity Game Launcher` (in installed mode) or within the `data\` directory alongside the portable executable. Users running the portable binary on shared or removable media should protect their USB drives with BitLocker or drive-level encryption if sensitive session or account tokens are stored.

