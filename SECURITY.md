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
- **Steam Web API Keys**: The Steam Web API key is used exclusively for read-only library and achievement querying. API keys must remain strictly in ignored `.env` or local configuration stores and never committed to source control.
- **Native Protocol & Process Execution**: Unity Game Launcher invokes registered OS protocols (e.g. `steam://`, `com.epicgames.launcher://`, `goggalaxy://`, `origin2://`, `uplay://`, `battlenet://`, `xbox:`) via Electron's `shell.openExternal`. All launcher IDs and URIs are sanitized before execution.
- **Read-Only System & Registry Discovery**: Local client and game detection inspects standard Windows Registry hives and game installation folders strictly in read-only mode using built-in OS utilities (`reg query`). It does not require elevated administrator privileges and performs zero modifications to Windows system hives or launcher configuration stores.
- **External Configuration & Data**: The user's external runtime `config.json` and `games.json` files reside in `%APPDATA%\Unity Game Launcher` (in installed mode) or within the `data\` directory alongside the portable executable. Users running the portable binary on shared or removable media should protect their USB drives with BitLocker or drive-level encryption if sensitive session or account tokens are stored.
- **External Asset & Image Fetching**: SteamDB and Steam static CDN queries use public endpoints (`shared.fastly.steamstatic.com`, `shared.akamai.steamstatic.com`, `cdn.akamai.steamstatic.com`, and `store.steampowered.com/api/`). These requests are strictly read-only HTTPS GET queries for public store metadata, capsule images, hero art, and headers. They do not send or require user identifiers, private tokens, or session secrets.

