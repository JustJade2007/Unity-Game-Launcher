# Changelog

All notable changes to **Unity Game Launcher** will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Windows NSIS Setup Installer**: Production-ready setup installer (`Unity Game Launcher Setup <version>.exe`) allowing custom installation directory selection, Start Menu & Desktop shortcut generation, and full Windows uninstallation support.
- **Standalone Portable Executable**: Zero-install portable executable (`Unity Game Launcher-Portable-<version>.exe`) designed to run anywhere (including removable USB media).
- **External Configuration & Data System**: Isolated runtime configuration (`config.json`) and external game library database (`games.json`) stored in `%APPDATA%\Unity Game Launcher` (in installed mode) or within a local `data\` directory adjacent to the executable (in portable mode).
- **Explorer Quick-Access & Mode Badge**: TitleBar indicator showing active portable state and one-click "Config" button to open the active configuration directory in Windows File Explorer.
- **One-Click Build Automation**: Added `build-executables.bat` script and npm commands (`dist`, `dist:installer`, `dist:portable`, `dist:all`) to compile installer and portable executables.
- Environment configuration templates (`.env.example` and `keys.env.example`) documenting Supabase URL and anon API key parameters for cloud authentication and storage.

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

[Unreleased]: https://github.com/JustJade2007/Unity-Game-Launcher/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/JustJade2007/Unity-Game-Launcher/releases/tag/v0.1.0
