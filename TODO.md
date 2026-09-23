# 🎮 Unity Game Launcher — Master Task Tracker

> Central roadmap and execution backlog tracking core milestones, GitHub issues, implementation checklists, and acceptance criteria.

---

## 📌 Milestone Roadmap Matrix

| Ref | Milestone / Issue | Category | Status | Target |
|:---|:---|:---|:---:|:---|
| **Phase 1** | [Core Framework & Desktop Shell](#-phase-1-core-framework--desktop-shell-complete) | Core App | 🟢 Complete | v0.2.0 |
| **#3** | [Launcher Integration & Library Syncing](#-issue-3-launcher-integration-and-library-syncing-core-foundation) | Data Ingestion | 🟢 Complete | v0.2.0 |
| **#4** | [Local Directory & Custom Game Management](#-issue-4-local-directory-and-custom-game-management) | Library Tools | 🟢 Complete | v0.2.0 |
| **#5** | [User Profiles & Federated Authentication](#-issue-5-user-profiles-and-federated-authentication) | Identity & Auth | ⚪ Planned | Sprint 3 |
| **#7** | [Library Organization & Game Discovery](#-issue-7-library-organization-and-game-discovery) | Catalog & UX | ⚪ Planned | Sprint 3 |
| **#8** | [Theme System & Community Customization](#-issue-8-theme-system-and-community-customization) | Styling & UI | ⚪ Planned | Sprint 4 |
| **#6** | [Platform Maintenance, Moderation & Diagnostics](#-issue-6-platform-maintenance-moderation-and-diagnostics) | Ops & Settings | ⚪ Planned | Sprint 4 |
| **#9** | [Security Policy & Wiki Documentation](#-issue-9-security-policy-and-wiki-documentation) | Governance | ⚪ Planned | Pre-Release |
| **#2** | [Main Features Integration & Release Readiness](#-issue-2-main-features-integration-and-release-readiness) | QA & Release | ⚪ Planned | v0.8.0 |

---

## 🟢 Phase 1: Core Framework & Desktop Shell (Complete)

- [x] **Base Entity Data Models**: Implemented strongly-typed definitions for `Game`, `Achievement`, `FriendActivity`, `Media`, and `Playtime`.
- [x] **Frontend Architecture**: Built modern desktop interface using React 18, Vite, TypeScript, and Tailwind CSS.
- [x] **Dynamic Hero Showcase**: Built cinematic header banner featuring game logo, backdrop, quick launch button, playtime stats, and active friends stack.
- [x] **Multi-Layout Browsing**: Implemented responsive poster Grid view and compact Detailed list view.
- [x] **Comprehensive Game Detail Modal**:
  - [x] *Overview Tab*: Game synopsis, developer/publisher credits, install paths, categories, and screenshot lightbox gallery.
  - [x] *Achievements Tab*: Visual completion progress bar, status filtering (All / Unlocked / Locked), badge icons, rarity percentages, points, and unlock timestamps.
  - [x] *Friends Tab*: Live status indicators for friends currently playing, alongside friends who own the title.
- [x] **Multi-Attribute Filtering & Sorting**: Added multi-attribute search, source launcher filters, favorites toggle, installed filter, and multi-criteria sorting (playtime, recency, alphabetical, release date).
- [x] **Clean State Architecture**: Established persistent client-side library store with zero mock/template entries and empty-state support.
- [x] **Native Desktop Shell**: Integrated Electron desktop shell with frameless window styling and custom gaming TitleBar (minimize, maximize/restore, close).
- [x] **Windows One-Click Launcher**: Added root `launch.bat` script to verify dependencies, build assets, and run the desktop app directly.

---

## 🟢 Issue #3: Launcher Integration and Library Syncing (Core Foundation)

### 🔌 Platform Adapters
- [x] **Implement launcher platform adapters**:
  - [x] Steam
    - [x] Use steam web api key B9704EF5F81AE0BA3AC20F633883B503 to make it show games that aren't installed but owned as well
    - [x] Use steam URI to allow these not installed games to be installed through steam
  - [x] Epic Games Store
  - [x] GOG Galaxy
  - [x] EA App
  - [x] Ubisoft Connect
  - [x] Xbox App / Microsoft Store
  - [x] Battle.net

### 📥 Library Detection & Ingestion Engine
- [x] Detect installed local clients and active accounts
- [x] Ingest installed titles into a unified local database
- [x] Reconcile cross-launcher duplicate titles while preserving source attribution
- [x] Make the library recognize if uploads are needed

### 🔄 Metadata Synchronization Pipeline
- [x] Sync total playtime across sources
- [x] Fetch and aggregate achievements
- [x] Import game screenshots and media
- [x] Track live game state, sessions, and platform stats

### ⚙️ Process Lifecycle & Runtime Handling
- [x] Route game execution calls via the corresponding native launcher protocol
- [x] Gracefully handle offline launchers, failed sync calls, and unsupported platforms

> #### 🎯 Acceptance Criteria
> - [x] Every integrated launcher exposes an explicit connection status.
> - [x] All imported titles remain fully traceable to their origin launcher.
> - [x] Sync failures do not corrupt, lock, or prevent access to the local library.

---

## 🟢 Issue #4: Local Directory and Custom Game Management

### 🛠️ Local & Manual Game Entry Tooling
- [x] Add native file and directory selection dialogs
- [x] Support custom executable paths, arguments, and working directory entries
- [x] Build local binary metadata parser (icons, version headers, file properties)
- [x] Integrate SteamDB fallback lookup for metadata enrichment

### 📁 Custom Library Item Maintenance
- [x] Implement manual entry edit forms and directory rescanning
- [x] Support deletion and soft-hide for custom titles
- [x] Add distinct UI badges/indicators to differentiate custom titles from launcher imports

> #### 🎯 Acceptance Criteria
> - [x] Users can manually add, edit, rescan, and remove custom games without friction.
> - [x] Parsing/lookup errors fail gracefully with actionable feedback.
> - [x] Custom entries retain metadata attribution and remain reliably launchable.

---

## ⚪ Issue #5: User Profiles and Federated Authentication

### 🔐 Multi-Provider Federated Authentication
- [ ] Steam OpenID / OAuth
- [ ] Epic Games OAuth
- [ ] Google OAuth
- [ ] Extensible provider interface for future federated auth services

### 👤 Account Linking & Identity Management
- [ ] Securely link and unlink third-party accounts
- [ ] Toggle profile visibility (Public vs. Private)
- [ ] Normalize provider payloads without dropping source-specific fields

### 🎨 Profile UI & Data Aggregation
- [ ] Display linked accounts and badges
- [ ] Render aggregate achievement statistics
- [ ] Expose active theme preferences
- [ ] Manage display names and profile avatars

### 🛡️ Security & Error Resilience
- [ ] Secure token storage (system keychain / encrypted local store)
- [ ] Handle OAuth callback errors, network timeouts, and token refresh failures

> #### 🎯 Acceptance Criteria
> - [ ] Authentication and session state persist reliably across restarts.
> - [ ] Strict profile privacy rules are enforced server- and client-side.
> - [ ] External provider data normalizes cleanly without losing source attribution.

---

## 🟢 Issue #7: Library Organization and Game Discovery

### 🗂️ Organization & Catalog Management
- [x] Tag-based filtering and custom tag creation
- [x] Automated smart collections (e.g., Unplayed, Recently Added, Backlog, High Progress)
- [x] **Sorting mechanisms**:
  - [x] Sort by Title (A-Z, Z-A)
  - [x] Sort by Playtime (High to Low, Low to High)
  - [x] Sort by Release Date (Newest, Oldest)
  - [x] Sort by Date Added to Library (Newest, Oldest)
  - [x] Sort by Last Played (Recent, Oldest)
  - [x] Sort by Genre / Tags
  - [x] Sort by Source Launcher / Custom Status

### 🌐 Embedded Platform Integration
- [x] Render embedded store / community pages for linked platforms
- [x] Handle store load timeouts and connection drops gracefully with browser fallback

### 🎲 Interactive Random Game Selector
- [x] Filter pool by mood
- [x] Filter pool by tags / play status
- [x] Support natural-language selection prompts
- [x] Implement animated spinning-wheel selector component
- [x] Display selection rationale (e.g., *"Picked because it's tagged Co-op and unplayed"*)
- [x] Filter out uninstalled, unlaunchable, or missing titles from the selection pool

> #### 🎯 Acceptance Criteria
> - [x] Multi-criteria filters and sorting combine deterministically without UI lag.
> - [x] Random picker strictly obeys applied filters and excludes broken entries.
> - [x] Store/remote discovery failures degrade gracefully without blocking local browsing.

---

## ⚪ Issue #8: Theme System and Community Customization

### 🎨 Theme Architecture
- [ ] Build CSS/design-token engine with dynamic runtime styling
- [ ] Add real-time theme customization controls
- [ ] Persist active theme preferences locally
- [ ] Implement instant "Reset to Default" fallback

### 🏪 Community Theme Exchange
- [ ] Package upload flow
- [ ] Theme repository browsing and download flow
- [ ] Live sandboxed theme previewer
- [ ] Theme application and activation lifecycle
- [ ] One-click theme export and bundle sharing

### 🔒 Theme Safety & Moderation
- [ ] Strict schema validation for all imported theme payloads
- [ ] Sandbox style injection to prevent UI bricking or layout collapse
- [ ] Creator attribution metadata and moderation/flagging hooks

> #### 🎯 Acceptance Criteria
> - [ ] Theme swaps apply instantly and consistently across all views.
> - [ ] Malformed or invalid theme files fail safely with fallback to default theme.
> - [ ] Community sharing tracks author attribution and provides reporting mechanisms.

---

## ⚪ Issue #6: Platform Maintenance, Moderation, and Diagnostics

### 📡 Update Delivery & Platform Communication
- [ ] Implement silent background update checks with interactive prompt
- [ ] Dedicated changelog and release notes modal
- [ ] Game and platform news feed aggregation

### 🛡️ Moderation & Access Boundaries
- [ ] Role-based access control (RBAC) for moderation features
- [ ] Hard boundary: moderation actions must never block offline or local games

### 🩺 Diagnostics & Automated Issue Reporting
- [ ] Direct GitHub Issue submission flow
- [ ] **Pre-flight log scrubber**:
  - [ ] Strip API keys and access tokens
  - [ ] Strip raw passwords and secrets
  - [ ] Strip local file system directories / home paths
  - [ ] Strip usernames and hostnames
  - [ ] Strip PII and email addresses

### ⚙️ Application Settings Panel
- [ ] Platform and launcher scan preferences
- [ ] Custom scan directory configuration
- [ ] Account authentication and session management
- [ ] UI, scaling, and display preferences
- [ ] Settings schema validation and atomic persistence

> #### 🎯 Acceptance Criteria
> - [ ] App updates apply cleanly with state rollback on error.
> - [ ] Moderation tools are strictly scoped and cannot impact local execution.
> - [ ] Outgoing diagnostic reports are confirmed clean of sensitive data.
> - [ ] Application settings persist without corruption.

---

## ⚪ Issue #9: Security Policy and Wiki Documentation

### 📄 Security Policy (`SECURITY.md`)
- [ ] Author and commit `SECURITY.md`
- [ ] Detail supported application versions
- [ ] Outline formal vulnerability reporting process
- [ ] Define responsible disclosure timelines and expectations
- [ ] Provide dedicated security contact instructions / PGP keys

### 📚 Project Wiki & Knowledge Base
- [ ] Structure and author project Wiki / Documentation:
  - [ ] Installation and initial environment setup
  - [ ] Application configuration guide
  - [ ] Launcher integration workflows
  - [ ] Local game directory management
  - [ ] Troubleshooting FAQ and known issues
  - [ ] Privacy guidelines and data handling policies
  - [ ] Developer contribution workflow and PR conventions

### 🔐 Sensitive Data Handling Specifications
- [ ] Document sensitive data handling requirements:
  - [ ] Token and credential storage security
  - [ ] Automatic log scrubbing rules
  - [ ] Offline behavior and cache degradation
  - [ ] Personally Identifiable Information (PII) minimization

### 🔄 Documentation Maintenance Lifecycle
- [ ] Establish documentation maintenance lifecycle:
  - [ ] Assign maintainer roles / team ownership
  - [ ] Define doc review and update frequency
  - [ ] Integrate external links to project resources, repos, and community links

> #### 🎯 Acceptance Criteria
> - [ ] Security instructions are easily discoverable from root repository.
> - [ ] Docs comprehensively cover setup, day-to-day use, and troubleshooting.
> - [ ] Privacy and security expectations are explicitly stated.

---

## ⚪ Issue #2: Main Features Integration and Release Readiness

### 🧪 End-to-End System Validation
- [ ] Validate launcher ingestion pipeline with real multi-account libraries
- [ ] Verify custom game creation, scanning, and execution
- [ ] Test discovery, tag filtering, and random selector under full library load
- [ ] Test identity management, linked providers, and profile visibility
- [ ] Test custom theme application, resets, and community downloads
- [ ] Verify diagnostic reporting, log sanitization, and app settings
- [ ] Confirm wiki and `SECURITY.md` accuracy against shipping version

### ⚡ Edge Case & Stress Testing
- [ ] Address race conditions during concurrent multi-launcher library syncs
- [ ] Verify offline cold-start behavior without active internet connection
- [ ] Test corrupted local database auto-recovery

### 📦 Release Preparation & Packaging
- [ ] Final acceptance criteria audit across issues #3 through #9
- [ ] Generate binary checksums and sign executables
- [ ] Complete pre-release smoke checklist

> #### 🎯 Acceptance Criteria
> - [ ] Client functions as a unified, coherent application satisfying all roadmap milestones.