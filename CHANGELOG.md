# Changelog

All notable changes to **Unity Game Launcher** will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [0.3.2] - 2026-09-27

### Added
- **GitHub Issue Enhancer Workflow**:
  - **Automated Issue Structuring**: Integrated the `JustJade2007/github-issue-enhancer@1.0.0` reusable GitHub Action workflow (`.github/workflows/enhance-issue.yml`) triggered on new issue submissions (`issues: [opened]`).
  - **Gemini Flash Lite Intelligence**: Automatically rewords, clarifies, and formats opened issues into professional GitHub Flavored Markdown (Summary, Details, Context, Logs) without introducing assumptions or inventing details, preserving the author's original raw text in an expandable `<details>` section for transparency.
  - **Secure Secrets Integration**: Configured workflow with repository secrets (`GEMINI_API_KEY`) and default `GITHUB_TOKEN` permissions (`issues: write`, `contents: read`).
  - **Secrets & Configuration Documentation**: Updated `SECURITY.md`, `.env.example`, and `keys.env.example` with CI/CD secret guidance.

## [0.3.1] - 2026-09-23

### Added
- **Interactive Random Game Selector (Roulette Wheel & Natural Language Picker)**:
  - **Animated Spinning Roulette Canvas Wheel with Sound FX**: Implemented a dynamic canvas-based spinning wheel component with up to 16 slice segments, smooth inertia physics deceleration curve, randomized multi-rotation target calculation, and celebration state upon winner selection. Added synthesized Web Audio API sound effects with decelerating mechanical clicks/ticks during spin rotation and a 4-chord celebration fanfare on winner landing, with full mute/unmute control.
  - **"Hide from this wheel type" Selection Override**: Added a dedicated button on the winner celebration card allowing users to instantly hide any misselected or unwanted game from the active wheel category or general pool, with persistent storage and a live exclusion counter/reset button in the pool statistics bar.
  - **Strict Multiplayer Classification for "Play with Friends"**: Upgraded "Play with Friends" with an explicit, rigorous multiplayer classifier (`isMultiplayerGame`), ensuring singleplayer-only games are never mistakenly selected. Matches official multiplayer/co-op categories, whole-word boundaries, and curated party/friend-slop titles (*PEAK*, *Repo*, *Lethal Company*, *Content Warning*, *Among Us*, *Jackbox*, *Overcooked*, *Gang Beasts*, *Duck Game*, *Stick Fight*, *Rainbow Six Siege*, *Battlefield*, *CS2*, *Destiny 2*, *Helldivers*, *Deep Rock Galactic*, etc.).
  - **Smooth Hardware-Accelerated Toggle Switches**: Fixed switch slider knob translation for "Exclude uninstalled titles" and "Unplayed backlog titles only" using smooth 200ms `translateX` transitions that travel completely across the pill track in both on/off states.
  - **Natural-Language Selection Prompt Parser**: Built a fast, local rule-based intent and keyword parser matching phrases such as *"relaxing co-op game under 10 hours"* or *"unplayed shooter"* against game titles, genres, custom tags, and playtime metrics without external API latency.
  - **Mood-Based Filter Presets**: Added one-click mood selector chips (*Cozy & Relaxing*, *High Adrenaline*, *Spooky & Horror*, *Play with Friends*, *Quick Coffee Break*) that dynamically tune the candidate pool.
  - **Smart Selection Rationale**: The winning card provides an explicit, human-readable rationale explanation (e.g., *"Picked because it is installed & ready to play, currently unplayed in your backlog, and matches your 'Cozy & Relaxing' mood"*).
  - **Strict Exclusion Rules**: Excludes uninstalled, broken, or software utilities from the roulette pool with quick one-click "Play Now" and "View Details" actions directly from the celebration card.
- **Custom Tag-Based Organization & Unified Filtering**:
  - **Arbitrary Custom Tag Creation**: Users can assign arbitrary custom tags (e.g. `#backlog`, `#co-op-night`, `#steam-deck`) to any title from the Game Details view, with full disk persistence.
  - **Unified Genre & Custom Tag Sidebar**: Custom tags dynamically appear in the Sidebar navigation under a dedicated "Custom Tags" section with active filter counts and clear toggles.
  - **Multi-Tag Combinatorial Filtering**: Supports compound multi-tag filtering combining both official store categories and user tags without UI delay.
- **Automated Smart Collections**:
  - **Dynamic Presets in Sidebar**: Added live-updating collections with badge counters:
    - ⏳ **Unplayed**: Titles with 0 recorded playtime minutes.
    - 📥 **Backlog (Ready to Play)**: Installed games with 0 playtime minutes.
    - 🏆 **High Progress**: Games with >=80% unlocked achievements or 30+ hours playtime.
    - 🆕 **Recently Added**: Newly imported or added games.
- **Comprehensive Sorting Engine**:
  - Added full bi-directional sorting across the library:
    - **Recently Played** & **Least Recently Played**
    - **Playtime (High to Low)** & **Playtime (Low to High)**
    - **Alphabetical (A - Z)** & **Alphabetical (Z - A)**
    - **Release Date (Newest)** & **Release Date (Oldest)**
    - **Date Added (Newest)** & **Date Added (Oldest)**
    - **Genre / Primary Tag**
    - **Source Launcher**
- **Embedded Platform Integration (Store & Community Pages)**:
  - **Embedded Store & Discussions Tab**: Added a dedicated "Store & Community" tab to `GameDetailView` displaying live storefronts and community discussion hubs for linked platforms (Steam, GOG, Epic Games).
  - **Resilient Fallback & Timeout Protection**: Gracefully handles storefronts with frame embedding restrictions (`X-Frame-Options`) or load timeouts via a styled fallback with a direct, secure "Open in Browser" action using Electron's native `shell.openExternal`.

## [0.3.0] - 2026-09-23

### Added
- **Genre Accuracy & Removal of Erroneous "Indie" Classifications**:
  - **Accurate Categorization for Minecraft & Major Titles**: Resolved issue where Minecraft was incorrectly labeled as "Indie". Mapped curated genres in `categoryService.cjs` for Minecraft (`['Sandbox', 'Survival', 'Adventure']`), StarCraft II (`['Strategy', 'RTS']`), Fallout 4 (`['RPG', 'Action', 'Open World']`), DOOM (`['Action', 'Shooter', 'FPS']`), Destiny 2, Battlefield 2042, The Sims 4, Death Stranding, and other major games.
  - **Eliminated Forced "Indie" Fallbacks**: Removed aggressive fallback in `categoryService.cjs` that coerced standalone `Action` tags and non-Steam games into "Indie". Real action and genre titles now retain their authentic store and catalog categories.
  - **Complete Store Genre Ingestion**: Integrated official Steam store genres across `storeDetailsCache.json` and healed all local databases (`release/data/games.json`, `%APPDATA%\Unity Game Launcher\games.json`, `%APPDATA%\unity-game-launcher\games.json`), restoring true multi-genre tags (Action, Simulation, Adventure, Strategy, Casual, Shooter, RPG, Sandbox, Survival).
- **Persistent Release Date Preservation & Store Details Architecture**:
  - **Fixed Destructive Overwrites in `syncAll`**: Resolved critical bug in `libraryEngine.cjs` where scanned items from launcher adapters with empty strings overwrote existing authentic release dates in `games.json`. Unified deduplication and merge logic now strictly preserves prior `releaseDate`, `description`, `developer`, `publisher`, `genres`, and `media`.
  - **Persistent Offline Store Details Cache**: Implemented disk-backed cache (`electron/data/storeDetailsCache.json`) loaded at engine startup and consulted directly by `steamAdapter.cjs`. Installed and owned games now receive authentic release dates, application types, and verified genres immediately upon scan with zero network latency and complete immunity to API rate-limiting.
  - **Timezone-Accurate Calendar Date Formatting**: Upgraded `formatReleaseDate` in `GameDetailView.tsx` with explicit `YYYY-MM-DD` component extraction, preventing UTC midnight rollback in American timezones (such as EDT/EST) and correctly rendering calendar release dates (e.g. `Feb 20, 2024`, `Aug 21, 2012`, `Dec 1, 2015`, `Jul 27, 2010`).
  - **Zero "TBA" Guarantee Across Active Library**: Added enrichment triggers for missing dates in `libraryEngine.cjs`, `steamdbImageService.cjs`, and `GameDetailView.tsx`, with catalog fallback for non-Steam titles (`KNOWN_NON_STEAM_METADATA`). Synchronized all 171 titles across `%APPDATA%\Unity Game Launcher\games.json`, `%APPDATA%\unity-game-launcher\games.json`, and portable `release/data/games.json`, eliminating all false "TBA" occurrences across the entire collection.
- **Software & Tools Category Isolation (Invisible by Default in Game List)**:
  - **Complete Separation of Software from Games**: Implemented strict separation of non-game software, desktop companions, servers, and utilities (`Mouse X`, `Scope X`, `Crosshair X`, `tiny desktop pals`, `VoiceAttack`, `Soundpad Demo`, `Lossless Scaling`, `VRoid Studio`, `Insurgency: Sandstorm Dedicated Server`, `Tom Clancy's Rainbow Six Siege - Test Server`, `tModLoader`) into a dedicated "Software & Tools" category.
  - **Invisible by Default**: By default, software items are excluded from "All Games", "Favorites", "Installed", and all genre views. The hero banner showcase strictly displays authentic games.
  - **Dedicated Sidebar View & Navigation**: Added "Software & Tools" navigation item in the Sidebar with dedicated icon (`AppWindow`) and badge counter (`totalSoftwareCount`), allowing users to browse and launch their tools separately from their gaming collection.
  - **Custom Executable Software Flag**: Added an "Application Type" toggle in `CustomGameModal.tsx` allowing user-added executables, scripts, and utilities to be designated as software.
  - **Intelligent Category Classifier & Pattern Matcher**: Created `softwareClassifier.ts` on the frontend and updated `categoryService.cjs` on the backend with comprehensive patterns and curated lookup for instant detection.
- **Release Date Resolution & Zero "Invalid Date" Guarantee**:
  - **Safe Date Formatter**: Implemented `formatReleaseDate` in `GameDetailView.tsx` and across the frontend, eliminating all occurrences of `"Invalid Date"` and gracefully falling back to clean formatted dates, year strings, or `"Coming Soon"` / `"TBA"`.
  - **Safe Sorting**: Protected library sorting by release date against empty or unparseable timestamps.
  - **Steam Store Release Date Enrichment**: Upgraded `steamdbImageService.cjs` and `libraryEngine.cjs` to fetch and persist official store release dates from Steam store details API.
  - **Active Library Sweep**: Healed all 158 library entries across `%APPDATA%\Unity Game Launcher\games.json` and `%APPDATA%\unity-game-launcher\games.json`, populating authentic release dates for 100% of store games with 0 invalid dates.
- **Intelligent Category & Genre Classification Engine**:
  - **Accurate Software & Utility Categorization**: Built dedicated categorization engine (`electron/engine/categoryService.cjs`) eliminating misleading `"Action"` tags from software applications, utilities, servers, and non-action games. Software utilities (such as `Crosshair X`, `Scope X`, `Mouse X`, `Lossless Scaling`, `VoiceAttack`, `Soundpad Demo`, `VRoid Studio`) are now accurately categorized as `['Utilities', 'Software']`, `['Tools', 'Server']`, or specialized software tags (e.g. `Audio Production`, `Animation & Modeling`, `Design & Illustration`), with strict exclusion of action/gaming tags.
  - **Dedicated Server & Tool Identification**: Added pattern recognition identifying dedicated server daemons (e.g. `Insurgency: Sandstorm Dedicated Server`) and assigning appropriate `['Tools', 'Server']` tags rather than generic game action genres.
  - **True Store Genre Extraction & Enrichment**: Upgraded Steam store metadata parsing (`steamdbImageService.cjs`) to extract genuine genre descriptors (`genres`) and application types (`type`) from Steam `appdetails`. Integrated classification resolution during library sync and media enrichment passes.
  - **Launcher & Platform Tag Isolation**: Normalized category aggregation across the UI and adapters (`steamAdapter`, `xboxAdapter`, `ubisoftAdapter`, `gogAdapter`, `epicAdapter`, `eaAdapter`, `battlenetAdapter`, `binaryMetadataParser`) by removing launcher names (`Steam`, `Xbox`, `Ubisoft`, `GOG`, `Epic Games`, `EA`, `Battle.net`, `Local`, `Custom`) from genre tags. `Sidebar.tsx` and `LibraryContext.tsx` now display exclusively authentic game genres and utility categories.
  - **Comprehensive Library Healing**: Swept and healed all active library entries in `%APPDATA%\Unity Game Launcher\games.json` and `%APPDATA%\unity-game-launcher\games.json`, reclassifying 158 titles into accurate genre distributions (Indie, Simulation, Action, Strategy, Casual, Shooter, Software, Utilities, RPG, Racing, Puzzle, etc.) and reducing spurious Action tags from 42 to 14 legitimate action titles.
- **Progressive Artwork Fallback & Hero Banner Auto-Healing**:
  - **Hero Banner Card Fallback**: Enhanced `GameCard.tsx`'s progressive image fallback candidate chain (`fallbackCandidates`) to include `game.media.heroUrl`, Fastly & Akamai `library_hero.jpg`, `page_bg_generated_v6b.jpg`, multi-resolution capsules, headers, and all screenshot assets. Wide 16:9 banner art centers and crops cleanly to the 2:3 card format via `object-cover object-center`, guaranteeing that any game with a banner displays a rich, high-resolution thumbnail instead of an empty placeholder.
  - **Reactive Image State Lifecycle**: Added reactive reset `useEffect` to `GameCard.tsx` (`[game.id, game.media.coverUrl, game.media.heroUrl]`), preventing stale failure states when switching views or updating metadata.
  - **Resilient List View Thumbnails**: Extracted `GameListThumbnail` component in `GameGrid.tsx` with identical progressive fallback candidates and error recovery, replacing broken image elements with fallback artwork or styled gamepad badges.
  - **Live Reachability Verification & Cover Healing**: Updated `SteamDBImageService` (`electron/engine/steamdbImageService.cjs`) to actively test reachability of `coverUrl` and `heroUrl` via HTTP HEAD checks before skipping enrichment. When a game's vertical cover returns 404 but hero artwork or banners succeed, `coverUrl` is automatically healed to the working hero banner URL.
  - **Custom Game Artwork Fallbacks**: Updated `CustomGameModal.tsx` to automatically default `coverUrl` to `heroUrl.trim()` when a custom game is saved with a hero backdrop but no separate cover.
  - **Active Library Sweep**: Healed and updated persisted library entries across `%APPDATA%\Unity Game Launcher\games.json` and `%APPDATA%\unity-game-launcher\games.json` for titles with missing 600x900 covers (including `Scope X`, `How to Fish`, `PEAK`, `Mouse X`, `MECCHA CHAMELEON`, `tiny desktop pals`, `Watch_Dogs`, `WheelMates - Friend's Pass`, `Spacewar`, `Cry of Fear`, `Star Trek: Bridge Crew`, `Freddy Fazbear's Pizzeria Simulator`, and `Super Battle Golf`).
- **Local Directory & Custom Game Management (Issue #4)**:
  - **Native File and Directory Selection Dialogs**: Integrated Electron's native `dialog.showOpenDialog` via IPC channels (`dialog-select-executable`, `dialog-select-directory`), enabling native OS file pickers filtered to executables (`.exe`, `.bat`, `.cmd`) and folder pickers for custom titles and directory scanning.
  - **Custom Executable Tooling & Detached Runtime Execution**: Built `LocalAdapter` (`electron/adapters/localAdapter.cjs`) allowing arbitrary local standalone binaries to be launched cleanly with custom working directories and command-line arguments using detached child processes, fully integrated with `processTracker` for lifetime and recent playtime tracking.
  - **Local Binary Metadata Parser**: Built `binaryMetadataParser.cjs` extracting Windows PE VersionInfo headers (ProductName, FileDescription, ProductVersion, CompanyName), file sizes, native high-res application icons via Electron's `app.getFileIcon()`, and intelligent title heuristics.
  - **Automated SteamDB Fallback Enrichment for Custom Titles**: Custom binaries automatically query Steam store search by inferred title, retrieving high-resolution vertical cover posters, cinematic hero backdrops, logos, and screenshots.
  - **Automated Directory Scanner**: Implemented directory scanning utility searching local gaming folders (up to 2 levels deep) for game binaries, filtering out setup/uninstaller/crash-reporter binaries, and presenting a one-click import list.
  - **Manual Entry & Edit Forms**: Built `CustomGameModal` supporting manual entry, binary browsing, automatic parameter population, and editing of existing library entries (title, tagline, description, developer, publisher, release date, tags, executable path, arguments, working directory, artwork).
  - **Title Deletion & Soft-Hide Mechanism**: Added permanent deletion for custom games (`library-delete-game`) and reversible soft-hide (`hidden`) for both custom and launcher titles, with a dedicated "Hidden Games" view filter and toggle in the sidebar.
  - **Distinct UI Badges & Indicators**: Added vibrant custom gradient badges ("Custom") and "Hidden" badges in `GameCard` and `GameDetailView`, clearly differentiating user-added titles from launcher imports while showing detailed technical launch parameters.
  - **Sync Safety & Custom Game Retention**: Updated `libraryEngine.cjs` to ensure custom and local games are never overwritten or removed during multi-launcher sync passes.
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
