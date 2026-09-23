# Unity Game Launcher 🎮

> **Unify** all your game launchers, store pages, accounts, and local games into one comprehensive library — with maximum automation and minimum fluff.

[![License](https://img.shields.io/github/license/JustJade2007/Unity-Game-Launcher)](LICENSE)
[![Issues](https://img.shields.io/github/issues/JustJade2007/Unity-Game-Launcher)](https://github.com/JustJade2007/Unity-Game-Launcher/issues)
[![Last Commit](https://img.shields.io/github/last-commit/JustJade2007/Unity-Game-Launcher)](https://github.com/JustJade2007/Unity-Game-Launcher/commits)

---

## 📖 Overview

Unity Game Launcher is a desktop application designed to be the **single hub** for all your gaming needs. Instead of juggling Steam, Epic, GOG, Xbox, and a dozen other launchers, Unity brings everything together in a clean, unified interface.

**Core Philosophy:**
- 🔗 Aggregate — one place for every game you own
- ⚙️ Automate — smart detection, updates, and launch workflows
- 🧹 Simplify — no bloat, no ads, no friction

---

## ✨ Features

| Feature | Status |
|---|---|
| Unified game library framework | ✅ Implemented |
| Achievements & badge showcase | ✅ Implemented |
| Live friends activity & rich presence | ✅ Implemented |
| Playtime tracking & categories | ✅ Implemented |
| Multiple launcher integration (Steam, Epic, GOG, EA, Ubisoft, Xbox, BNet) | ✅ Implemented |
| Local client, account, & installed game discovery (Registry & Disks) | ✅ Implemented |
| Steam Web API owned uninstalled sync | ✅ Implemented |
| Native launcher URI execution & install routing | ✅ Implemented |
| Live Steam Web API achievement synchronization | ✅ Implemented |
| SteamDB Image Enrichment & Fallback System | ✅ Implemented |
| Progressive artwork fallback & hero banner healing | ✅ Implemented |
| Intelligent category & genre classification engine | ✅ Implemented |
| Software & tools isolation (invisible by default in games) | ✅ Implemented |
| Authentic store release dates (Zero "Invalid Date") | ✅ Implemented |
| Cross-launcher duplicate reconciliation & installed state prioritization | ✅ Implemented |
| Local directory & custom game management | ✅ Implemented |
| Native executable picker & directory scanner | ✅ Implemented |
| Windows binary metadata parser (PE headers & icons) | ✅ Implemented |
| Custom launch arguments & working directories | ✅ Implemented |
| Manual entry edit forms & library maintenance | ✅ Implemented |
| Title deletion & soft-hide mechanism | ✅ Implemented |
| Cloud storage sync indicator (Supabase) | ✅ Implemented |
| Account management | 🗓️ Planned |
| Automatic updates | 🗓️ Planned |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or later (v22+ recommended)
- **npm**: v9.0.0 or later

### Quick Start (Windows)

- **Launch Development / Desktop App**: Double-click **`launch.bat`** in the root directory. It verifies dependencies, compiles assets, and launches the app directly.
- **Build Executables**: Double-click **`build-executables.bat`** to package either or both the **NSIS Setup Installer** and **Standalone Portable Executable**.

### Manual Setup & Commands

```bash
# Clone the repository
git clone https://github.com/JustJade2007/Unity-Game-Launcher.git
cd Unity-Game-Launcher

# Install dependencies
npm install

# Launch desktop application in development mode
npm run dev

# Run compiled desktop app
npm start
```

---

## 📦 Packaging & Executables

Build native Windows binaries targeting either a standard system installer or a zero-install portable executable:

```bash
# Build BOTH the NSIS Installer and Standalone Portable EXE
npm run dist:all

# Build ONLY the NSIS Setup Installer (.exe)
npm run dist:installer

# Build ONLY the Standalone Portable (.exe)
npm run dist:portable
```

All compiled binaries are placed inside the **`release/`** directory:
- **`Unity Game Launcher Setup <version>.exe`**: Standard Windows installer with custom directory picker, desktop/start-menu shortcuts, and uninstaller.
- **`Unity-Game-Launcher-Portable-<version>.exe`**: Standalone executable that runs without installation.

### ⚙️ External Configuration & Data Storage

Unity Game Launcher keeps runtime configurations separate from application binaries:
- **Installed Mode**: Config and library files are stored in `%APPDATA%\Unity Game Launcher\` (`config.json` and `games.json`).
- **Portable Mode**: Config and library files are kept inside a local `data\` folder adjacent to the portable `.exe`, making it 100% self-contained for USB drives.
- **Quick Access**: Click the **Config** button in the top TitleBar at any time to open the active configuration directory in Windows File Explorer.

---

## 🛠️ Development

Launch the desktop app in development mode (with hot-reload):

```bash
npm run dev
```

Build application assets:

```bash
npm run build
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please use the [issue templates](.github/ISSUE_TEMPLATE/) for bug reports and feature requests.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

## 📬 Contact

**JustJade2007** — [@JustJade2007](https://github.com/JustJade2007)

Project Link: [https://github.com/JustJade2007/Unity-Game-Launcher](https://github.com/JustJade2007/Unity-Game-Launcher)

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full history of changes.
