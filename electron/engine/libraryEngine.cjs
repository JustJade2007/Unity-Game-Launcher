const fs = require('fs');
const steamdbImageService = require('./steamdbImageService.cjs');
const { isSoftwareItem } = require('./categoryService.cjs');
const SteamAdapter = require('../adapters/steamAdapter.cjs');
const EpicAdapter = require('../adapters/epicAdapter.cjs');
const GogAdapter = require('../adapters/gogAdapter.cjs');
const EaAdapter = require('../adapters/eaAdapter.cjs');
const UbisoftAdapter = require('../adapters/ubisoftAdapter.cjs');
const XboxAdapter = require('../adapters/xboxAdapter.cjs');
const BattleNetAdapter = require('../adapters/battlenetAdapter.cjs');
const LocalAdapter = require('../adapters/localAdapter.cjs');

function normalizeTitle(title) {
  if (!title) return '';
  const norm = title
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[:\-_'’"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (norm === 'minecraft for windows' || norm === 'minecraft launcher' || norm === 'minecraft uwp') {
    return 'minecraft';
  }
  return norm;
}

class LibraryEngine {
  constructor(gamesPath) {
    this.gamesPath = typeof gamesPath === 'string' ? gamesPath : (gamesPath?.gamesPath || null);
    this.adapters = {
      Steam: new SteamAdapter(),
      'Epic Games': new EpicAdapter(),
      GOG: new GogAdapter(),
      EA: new EaAdapter(),
      Ubisoft: new UbisoftAdapter(),
      Xbox: new XboxAdapter(),
      'Battle.net': new BattleNetAdapter(),
      Local: new LocalAdapter(),
    };
  }

  async getLauncherStatuses() {
    const statuses = [];
    let currentLibrary = [];
    try {
      if (this.gamesPath && fs.existsSync(this.gamesPath)) {
        currentLibrary = JSON.parse(fs.readFileSync(this.gamesPath, 'utf8'));
      }
    } catch {
      currentLibrary = [];
    }

    for (const [id, adapter] of Object.entries(this.adapters)) {
      try {
        const installed = await adapter.isInstalled();
        const account = await adapter.getActiveAccount();
        const clientPath = await adapter.getClientPath();
        let count = currentLibrary.filter((g) => g.launcher === id || g.ownershipSources?.some((s) => s.launcher === id)).length;

        // If library store hasn't been synced for this installed launcher, get count from adapter
        if (count === 0 && installed) {
          try {
            if (typeof adapter.scanOwnedGames === 'function') {
              const owned = await adapter.scanOwnedGames();
              if (Array.isArray(owned) && owned.length > 0) {
                count = owned.length;
              }
            }
            if (count === 0 && typeof adapter.scanInstalledGames === 'function') {
              const detected = await adapter.scanInstalledGames();
              if (Array.isArray(detected)) {
                count = detected.length;
              }
            }
          } catch {}
        }

        statuses.push({
          id,
          name: adapter.getName(),
          installed,
          accountName: account?.name || (account?.accountName ? `${account.accountName}` : undefined),
          accountId: account?.id,
          clientPath,
          gameCount: count,
        });
      } catch (err) {
        console.error(`[LibraryEngine] Error getting status for ${id}:`, err);
        statuses.push({
          id,
          name: adapter.getName(),
          installed: false,
          gameCount: 0,
          error: err.message,
        });
      }
    }
    return statuses;
  }

  async syncAll(options = {}) {
    let existingGames = [];
    try {
      if (this.gamesPath && fs.existsSync(this.gamesPath)) {
        existingGames = JSON.parse(fs.readFileSync(this.gamesPath, 'utf8'));
      }
    } catch (err) {
      console.error('[LibraryEngine] Could not read existing games.json:', err);
    }

    // Map existing games by normalized title or ID for fast lookup and user preferences preservation
    const existingMap = new Map();
    for (const g of existingGames) {
      existingMap.set(g.id, g);
      if (g.title) {
        existingMap.set(normalizeTitle(g.title), g);
      }
    }

    const scannedGames = [];

    // 1. Scan installed titles from each installed adapter
    for (const [id, adapter] of Object.entries(this.adapters)) {
      try {
        const isInst = await adapter.isInstalled();
        if (isInst) {
          const installed = await adapter.scanInstalledGames();
          scannedGames.push(...installed);
        }
      } catch (err) {
        console.error(`[LibraryEngine] Error scanning installed games for ${id}:`, err);
      }
    }

    // 2. Scan owned games from platforms with cloud/local databases (Steam, Ubisoft, GOG, Battle.net, EA)
    try {
      const steamAdapter = this.adapters.Steam;
      if (await steamAdapter.isInstalled()) {
        const ownedSteamGames = await steamAdapter.scanOwnedGames(options);
        scannedGames.push(...ownedSteamGames);
      }
    } catch (err) {
      console.error('[LibraryEngine] Error scanning owned Steam games:', err);
    }

    try {
      const ubiAdapter = this.adapters.Ubisoft;
      if (ubiAdapter && (await ubiAdapter.isInstalled()) && typeof ubiAdapter.scanOwnedGames === 'function') {
        const ownedUbiGames = await ubiAdapter.scanOwnedGames();
        scannedGames.push(...ownedUbiGames);
      }
    } catch (err) {
      console.error('[LibraryEngine] Error scanning owned Ubisoft games:', err);
    }

    try {
      const gogAdapter = this.adapters.GOG;
      if (gogAdapter && (await gogAdapter.isInstalled()) && typeof gogAdapter.scanOwnedGames === 'function') {
        const ownedGogGames = await gogAdapter.scanOwnedGames();
        scannedGames.push(...ownedGogGames);
      }
    } catch (err) {
      console.error('[LibraryEngine] Error scanning owned GOG games:', err);
    }

    try {
      const bnetAdapter = this.adapters['Battle.net'];
      if (bnetAdapter && (await bnetAdapter.isInstalled()) && typeof bnetAdapter.scanOwnedGames === 'function') {
        const ownedBnetGames = await bnetAdapter.scanOwnedGames();
        scannedGames.push(...ownedBnetGames);
      }
    } catch (err) {
      console.error('[LibraryEngine] Error scanning owned Battle.net games:', err);
    }

    try {
      const eaAdapter = this.adapters.EA;
      if (eaAdapter && (await eaAdapter.isInstalled()) && typeof eaAdapter.scanOwnedGames === 'function') {
        const ownedEaGames = await eaAdapter.scanOwnedGames();
        scannedGames.push(...ownedEaGames);
      }
    } catch (err) {
      console.error('[LibraryEngine] Error scanning owned EA games:', err);
    }

    // 3. Deduplicate and merge titles
    const unifiedMap = new Map();

    for (const item of scannedGames) {
      const norm = normalizeTitle(item.title);
      const matchKey = norm || item.id;

      if (!unifiedMap.has(matchKey)) {
        // Find existing saved entry to keep user favorites and custom data
        const prior = existingMap.get(item.id) || (norm ? existingMap.get(norm) : null);

        const merged = {
          ...item,
          favorite: prior ? Boolean(prior.favorite) : false,
          hidden: prior ? Boolean(prior.hidden) : false,
          isCustom: prior ? Boolean(prior.isCustom) : false,
          isSoftware: prior?.isSoftware !== undefined ? prior.isSoftware : (item.isSoftware !== undefined ? item.isSoftware : isSoftwareItem(item)),
          executablePath: prior?.executablePath || item.executablePath,
          launchArguments: prior?.launchArguments || item.launchArguments,
          workingDirectory: prior?.workingDirectory || item.workingDirectory,
          sourceDirectory: prior?.sourceDirectory || item.sourceDirectory,
          ownershipSources: [
            {
              launcher: item.launcher,
              gameId: item.appId || item.id,
              installed: item.installed,
              installPath: item.installPath,
              launchUri: item.launchUri,
              installUri: item.installUri,
            },
          ],
        };

        if (prior && prior.playtime) {
          merged.playtime = {
            totalMinutes: Math.max(merged.playtime?.totalMinutes || 0, prior.playtime.totalMinutes || 0),
            lastPlayed: merged.playtime?.lastPlayed || prior.playtime.lastPlayed,
            recentMinutes: merged.playtime?.recentMinutes || prior.playtime.recentMinutes,
          };
        }

        unifiedMap.set(matchKey, merged);
      } else {
        // Duplicate title found across launchers or installed vs owned
        const existing = unifiedMap.get(matchKey);

        // Add ownership source
        const hasSource = existing.ownershipSources.some(
          (s) => s.launcher === item.launcher && s.gameId === (item.appId || item.id)
        );
        if (!hasSource) {
          existing.ownershipSources.push({
            launcher: item.launcher,
            gameId: item.appId || item.id,
            installed: item.installed,
            installPath: item.installPath,
            launchUri: item.launchUri,
            installUri: item.installUri,
          });
        }

        // Ensure categories include launcher platform
        if (item.launcher && !existing.categories.includes(item.launcher)) {
          existing.categories.push(item.launcher);
        }

        // If existing title is a launcher utility and item is the actual game, upgrade title
        if (existing.title.toLowerCase().endsWith(' launcher') && !item.title.toLowerCase().endsWith(' launcher')) {
          existing.title = item.title;
        }

        // If this copy is installed, prioritize installed state and launch paths
        if (item.installed) {
          const wasNotInstalled = !existing.installed;
          existing.installed = true;
          existing.installPath = item.installPath || existing.installPath;
          existing.sizeGb = item.sizeGb || existing.sizeGb;
          if (wasNotInstalled || item.launcher === 'Steam') {
            existing.launcher = item.launcher;
            if (item.launchUri) existing.launchUri = item.launchUri;
            if (item.installUri) existing.installUri = item.installUri;
            if (item.executable) existing.executable = item.executable;
          }
        }

        // Merge playtime
        if (item.playtime) {
          existing.playtime.totalMinutes = Math.max(
            existing.playtime.totalMinutes || 0,
            item.playtime.totalMinutes || 0
          );
          if (item.playtime.lastPlayed) {
            existing.playtime.lastPlayed = item.playtime.lastPlayed;
          }
          if (item.playtime.recentMinutes) {
            existing.playtime.recentMinutes = item.playtime.recentMinutes;
          }
        }

        // Enhance media if existing lacks it
        if (!existing.media) existing.media = { coverUrl: '', heroUrl: '', screenshots: [] };
        if (!existing.media.coverUrl && item.media?.coverUrl) {
          existing.media.coverUrl = item.media.coverUrl;
        }
        if (!existing.media.heroUrl && item.media?.heroUrl) {
          existing.media.heroUrl = item.media.heroUrl;
        }
        if (!existing.media.iconUrl && item.media?.iconUrl) {
          existing.media.iconUrl = item.media.iconUrl;
        }
        if (!existing.media.logoUrl && item.media?.logoUrl) {
          existing.media.logoUrl = item.media.logoUrl;
        }
        if ((!existing.media.screenshots || existing.media.screenshots.length === 0) && item.media?.screenshots?.length > 0) {
          existing.media.screenshots = item.media.screenshots;
        }
      }
    }

    // 4. Preserve all custom and locally added titles that were not part of launcher scans
    for (const existing of existingGames) {
      if (existing.isCustom || existing.launcher === 'Local') {
        const norm = normalizeTitle(existing.title);
        const matchKey = norm || existing.id;
        if (!unifiedMap.has(matchKey) && !unifiedMap.has(existing.id)) {
          unifiedMap.set(existing.id, existing);
        } else {
          // If a launcher scan matched this title, ensure user-configured custom paths and state persist
          const targetKey = unifiedMap.has(matchKey) ? matchKey : existing.id;
          const current = unifiedMap.get(targetKey);
          unifiedMap.set(targetKey, {
            ...current,
            isCustom: true,
            executablePath: existing.executablePath || current.executablePath,
            launchArguments: existing.launchArguments || current.launchArguments,
            workingDirectory: existing.workingDirectory || current.workingDirectory,
            sourceDirectory: existing.sourceDirectory || current.sourceDirectory,
            hidden: Boolean(existing.hidden),
            favorite: Boolean(existing.favorite),
          });
        }
      }
    }

    let mergedLibrary = Array.from(unifiedMap.values());

    // Enrich titles lacking media
    try {
      const needsEnrichment = mergedLibrary.some(
        (g) =>
          !g.media?.coverUrl ||
          !g.media?.heroUrl ||
          g.media.coverUrl.includes('placeholder.com') ||
          !g.categories ||
          g.categories.length === 0 ||
          (g.categories.length <= 2 && g.categories.includes('Action'))
      );
      if (needsEnrichment) {
        const { games: enrichedGames } = await steamdbImageService.enrichLibrary(mergedLibrary);
        mergedLibrary = enrichedGames;
      }
    } catch (enrichErr) {
      console.error('[LibraryEngine] Error enriching media with SteamDB:', enrichErr);
    }

    // Write safely to disk
    if (this.gamesPath) {
      try {
        fs.writeFileSync(this.gamesPath, JSON.stringify(mergedLibrary, null, 2), 'utf8');
      } catch (err) {
        console.error('[LibraryEngine] Error writing games.json:', err);
      }
    }

    return {
      success: true,
      totalGames: mergedLibrary.length,
      installedCount: mergedLibrary.filter((g) => g.installed).length,
      uninstalledCount: mergedLibrary.filter((g) => !g.installed).length,
      games: mergedLibrary,
    };
  }

  async launchGame(game, requestedLauncher) {
    const launcherName = requestedLauncher || (game.isCustom || game.launcher === 'Local' ? 'Local' : game.launcher);
    const adapter = this.adapters[launcherName] || (game.executablePath ? this.adapters.Local : null);
    if (!adapter) {
      throw new Error(`Launcher adapter "${launcherName}" is not available.`);
    }

    // Find source specific to launcher if available
    const source = game.ownershipSources?.find((s) => s.launcher === launcherName);
    const gameToLaunch = {
      ...game,
      appId: source?.gameId || game.appId,
      launchUri: source?.launchUri || game.launchUri,
    };

    return adapter.launchGame(gameToLaunch);
  }

  async installGame(game, requestedLauncher) {
    const launcherName = requestedLauncher || game.launcher;
    const adapter = this.adapters[launcherName];
    if (!adapter) {
      throw new Error(`Launcher adapter "${launcherName}" is not available.`);
    }

    const source = game.ownershipSources?.find((s) => s.launcher === launcherName);
    const gameToInstall = {
      ...game,
      appId: source?.gameId || game.appId,
      installUri: source?.installUri || game.installUri,
    };

    return adapter.installGame(gameToInstall);
  }

  /**
   * Fetch achievements for a specific game title and cache them in games.json
   * @param {string} [gameId]
   * @param {string} [launcher]
   * @param {string} [appId]
   * @returns {Promise<{ success: boolean, achievements: Array<any>, error?: string }>}
   */
  async getAchievements(gameId, launcher, appId) {
    let resolvedLauncher = launcher;
    let resolvedAppId = appId;

    if (this.gamesPath && (!resolvedLauncher || !resolvedAppId)) {
      try {
        if (fs.existsSync(this.gamesPath)) {
          const content = fs.readFileSync(this.gamesPath, 'utf8');
          const games = JSON.parse(content);
          const found = games.find(
            (g) => g.id === gameId || g.appId === gameId || (appId && g.appId === appId)
          );
          if (found) {
            if (!resolvedLauncher) resolvedLauncher = found.launcher;
            if (!resolvedAppId) {
              resolvedAppId = found.appId || (found.id?.startsWith('steam_') ? found.id.replace('steam_', '') : null);
            }
          }
        }
      } catch (err) {
        console.error('[LibraryEngine] Error reading games.json for achievement lookup:', err);
      }
    }

    if (!resolvedLauncher) resolvedLauncher = 'Steam';
    const adapter = this.adapters[resolvedLauncher];
    if (!adapter || typeof adapter.fetchAchievements !== 'function') {
      return {
        success: false,
        achievements: [],
        error: `Platform "${resolvedLauncher}" does not support achievement fetching.`,
      };
    }

    try {
      const achievements = await adapter.fetchAchievements(resolvedAppId || gameId);

      // Persist achievements to games.json
      if (this.gamesPath && fs.existsSync(this.gamesPath) && Array.isArray(achievements) && achievements.length > 0) {
        try {
          const content = fs.readFileSync(this.gamesPath, 'utf8');
          const games = JSON.parse(content);
          const idx = games.findIndex(
            (g) => g.id === gameId || (resolvedAppId && (g.appId === resolvedAppId || g.id === `steam_${resolvedAppId}`))
          );
          if (idx !== -1) {
            games[idx].achievements = achievements;
            fs.writeFileSync(this.gamesPath, JSON.stringify(games, null, 2), 'utf8');
          }
        } catch (err) {
          console.error('[LibraryEngine] Error updating games.json with fetched achievements:', err);
        }
      }

      return { success: true, achievements: achievements || [] };
    } catch (err) {
      console.error(`[LibraryEngine] Error fetching achievements for ${resolvedAppId || gameId}:`, err);
      return { success: false, achievements: [], error: err.message };
    }
  }

  /**
   * Enriches media for a single game using SteamDB & Steam static CDNs.
   * @param {string} gameId
   * @returns {Promise<{ success: boolean, changed: boolean, media: object, game?: object, error?: string }>}
   */
  async enrichGameMedia(gameId) {
    if (!this.gamesPath || !fs.existsSync(this.gamesPath)) {
      return { success: false, error: 'Games library store not found' };
    }

    try {
      const content = fs.readFileSync(this.gamesPath, 'utf8');
      const games = JSON.parse(content);
      const idx = games.findIndex((g) => g.id === gameId || g.appId === gameId);
      if (idx === -1) {
        return { success: false, error: `Game with id ${gameId} not found` };
      }

      const { changed, media, categories, releaseDate, isSoftware } = await steamdbImageService.enrichGameMedia(games[idx]);
      if (changed) {
        if (media) games[idx].media = media;
        if (categories) games[idx].categories = categories;
        if (releaseDate && !games[idx].releaseDate) games[idx].releaseDate = releaseDate;
        if (isSoftware !== undefined) games[idx].isSoftware = isSoftware;
        fs.writeFileSync(this.gamesPath, JSON.stringify(games, null, 2), 'utf8');
      }

      return {
        success: true,
        changed,
        media: games[idx].media,
        game: games[idx],
      };
    } catch (err) {
      console.error(`[LibraryEngine] Error enriching media for game ${gameId}:`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Enriches media across the entire library store.
   * @returns {Promise<{ success: boolean, updatedCount: number, games: Array<object>, error?: string }>}
   */
  async enrichLibraryMedia() {
    if (!this.gamesPath || !fs.existsSync(this.gamesPath)) {
      return { success: false, error: 'Games library store not found' };
    }

    try {
      const content = fs.readFileSync(this.gamesPath, 'utf8');
      const games = JSON.parse(content);
      const { updatedCount, games: enrichedGames } = await steamdbImageService.enrichLibrary(games);

      if (updatedCount > 0) {
        fs.writeFileSync(this.gamesPath, JSON.stringify(enrichedGames, null, 2), 'utf8');
      }

      return {
        success: true,
        updatedCount,
        games: enrichedGames,
      };
    } catch (err) {
      console.error('[LibraryEngine] Error running bulk library media enrichment:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = LibraryEngine;
