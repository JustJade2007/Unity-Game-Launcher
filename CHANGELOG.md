# Changelog

All notable changes to **Unity Game Launcher** will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Multi-Platform Launcher Detection & Scanning (Ubisoft, EA, GOG, Battle.net, Xbox)**:
  - Built high-performance Windows Registry and system helper utility (`electron/adapters/registryHelper.cjs`) enabling safe, fast detection across 32-bit and 64-bit registry hives without native binary dependencies. Improved `findGameExecutable` to recursively discover nested binaries (such as `SwGame\Binaries\Win64\JediSurvivor.exe`) while ignoring installer, redist, and cleanup utilities.
  - Implemented comprehensive Ubisoft Connect adapter (`ubisoftAdapter.cjs`) detecting launcher installations across registry keys, Windows uninstall entries, and local directories; discovering active user accounts via local savegame stores and launcher logs; parsing installed game manifests (`Installs/*`, `configurations`, and uninstall entries); resolving executable paths (`UNO.exe`); computing disk sizes; and extracting game artwork.
  - Implemented GOG Galaxy native SQLite library integration (`gogAdapter.cjs`) querying `galaxy-2.0.db` via `node:sqlite`. Extracts owned library releases, developer/publisher metadata, critic scores, and native GOG CDN artwork (vertical covers, backgrounds, logos, screenshots). Automatically deduplicates base releases from Amazon Prime promotion variants, detects disk installations, and wires `goggalaxy://openGameView/{id}` protocol URIs.
  - Implemented Battle.net adapter (`battlenetAdapter.cjs`) discovering Battle.net client paths from registry and uninstall databases, reading active account credentials from `Battle.net.config`, and parsing `%APPDATA%\Battle.net\Battle.net.config` and `C:\ProgramData\Battle.net\Agent\product.db` in `scanOwnedGames()` to detect owned Blizzard titles (StarCraft II, StarCraft, Diablo IV, Overwatch 2, etc.) along with lifetime `LastPlayed` timestamps, official artwork, and `battlenet://{productCode}` launch/install URIs.
  - Implemented EA App & Origin adapter (`eaAdapter.cjs`) detecting EA Desktop and legacy Origin client installations, identifying active player user IDs from `user_*.ini`, and parsing `Origin\LocalContent` manifests (`.dat`, `.mfst`), cloudsync state, and launch history in `scanOwnedGames()`. Discovers installed and owned titles (STAR WARS Battlefront II, STAR WARS Jedi: Survivor, STAR WARS Jedi: Fallen Order, The Sims 4, A Way Out) with `origin2://game/launch/?offerIds={offerId}` and download protocol URIs.
  - Implemented Xbox adapter (`xboxAdapter.cjs`) discovering games installed in `C:\XboxGames`, `D:\XboxGames`, and Microsoft Store gaming libraries, resolving launch helpers (`gamelaunchhelper.exe`) and direct executables, parsing AppxManifest.xml, and querying Microsoft Store Display Catalog for high-res box art and screenshots.
  - Added real-time multi-launcher background discovery and live update channel (`onLibraryUpdated`) ensuring existing libraries automatically discover and ingest non-Steam titles on startup.
- **Cross-Launcher Duplicate Reconciliation Engine**: Ingests installed and owned titles across all 7 platforms into unified entries with multi-store attribution (`ownershipSources`), prioritizing installed copies for one-click launch while providing launcher switchers in the game detail modal. Multi-launcher games (e.g. Star Wars Battlefront II on Steam + EA, Rainbow Six Siege on Steam + Ubisoft) allow filtering by any owning platform.
- **Optimized Library Performance & Zero-Latency Enrichment**: Optimized `libraryEngine.cjs` and `steamdbImageService.cjs` to skip network searches when valid covers and backdrops already exist, reducing complete multi-launcher sync time to under 3 seconds.
- **One-Click Protocol Installation**: Exposed `installGame` in `preload.cjs` allowing uninstalled cloud library games to trigger launcher installation protocols directly from the card hover action or detail modal.
- **Gameplay Process Lifecycle & Session Tracking**: Electron process tracker capturing gameplay duration, incrementing playtime in real-time, and updating last played timestamps.
- **Launchers & Sync Dashboard**: Top bar indicator and dedicated modal displaying explicit connection status, detected account names, game counts across all 7 platforms, and cloud upload status.
- **Zero-Config Automatic Startup Discovery**: Automatically initiates local client and Steam game discovery when the library database is empty, instantly populating installed and owned games on initial launch without requiring manual user interaction.
- **Windows NSIS Setup Installer**: Production-ready setup installer (`Unity Game Launcher Setup <version>.exe`) allowing custom installation directory selection, Start Menu & Desktop shortcut generation, and full Windows uninstallation support.
- **Standalone Portable Executable**: Zero-install portable executable (`Unity Game Launcher-Portable-<version>.exe`) designed to run anywhere (including removable USB media).
- **External Configuration & Data System**: Isolated runtime configuration (`config.json`) and external game library database (`games.json`) stored in `%APPDATA%\Unity Game Launcher` (in installed mode) or within a local `data\` directory adjacent to the executable (in portable mode).
- **Explorer Quick-Access & Mode Badge**: TitleBar indicator showing active portable state and one-click "Config" button to open the active configuration directory in Windows File Explorer.
- **Live Achievement Synchronization**: Integrated Steam Web API endpoints (`GetSchemaForGame`, `GetPlayerAchievements`, `GetGlobalAchievementPercentagesForApp`) in `SteamAdapter` and `LibraryEngine` to fetch real game achievements, player unlock timestamps, secret status, and global rarity percentages on demand, caching results directly into the external `games.json` store.
- **Enhanced Achievement Showcase UI**: Real-time progress bar, dynamic category chips (All, Unlocked, Locked), animated refresh button, and responsive loading skeleton in `GameDetailView`.
- **SteamDB Image Enrichment & Fallback Architecture**: Built dedicated `SteamDBImageService` (`steamdbImageService.cjs`) resolving high-resolution game artwork for titles lacking default covers (including non-Steam games from Epic/GOG/etc., legacy Steam games, and modern apps with hash-based CDN URLs). Integrates Steam store catalog search by title, store metadata asset extraction, and progressive CDN fallback chains. Completely replaced external placeholder images with self-contained gamer-aesthetic fallback cards.
- **Bulk Image Enrichment Action**: Added "Fetch SteamDB Images" action in the Launchers modal and automatic media enrichment during library sync and game detail inspection.
- **One-Click Build Automation**: Added `build-executables.bat` script and npm commands (`dist`, `dist:installer`, `dist:portable`, `dist:all`) to compile installer and portable executables.
- Environment configuration templates (`.env.example` and `keys.env.example`) documenting Steam Web API key, Supabase URL, and anon API key parameters.

---

## [0.2.0] - 2026-09-22

- **Native Desktop Application**: Integrated Electron desktop shell with frameless dark window and custom titlebar (minimize, maximize/restore, close controls).
- **One-Click Windows Launcher**: Added `launch.bat` to verify build assets and launch the desktop application directly.
- **Base Game Library Framework**: Core domain models and TypeScript interfaces for games, achievements, friend activities, playtimes, and media.
- **Rich Interactive UI**: Modern gamer-aesthetic desktop interface built with React 18, Vite, TypeScript, and Tailwind CSS.
- **Dynamic Hero Showcase**: Backdrop image crossfades, logo display, quick action launcher, lifetime playtime counter, and live friends stack.
- **Comprehensive Game Detail Modal**:
  - Overview tab with extended synopsis, developer info, install paths, and screenshot gallery lightbox.
  - Achievements tab with progress bar (unlocked vs. locked counts), rarity percentages, points, unlock dates, and status filters.
  - Friends tab with live "Currently Playing" rich presence indicators and list of friends who own the title.
- **Multi-Launcher & Category Filtering**: Support for Steam, Epic Games, GOG, Xbox, and Local games with live tag filtering and multi-criteria sorting.
- **Clean State Architecture**: Library framework operates cleanly without any template or mock placeholder data, with persistent storage and dynamic empty-state support.

## [0.1.0] - 2026-09-21

### Added
- Initial commit — project concept and structure established

---

<!-- 
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in upcoming releases

### Removed
- Features removed in this release

### Fixed
- Bug fixes

### Security
- Security vulnerability fixes
-->
