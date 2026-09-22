const fs = require('fs');
const SteamAdapter = require('../adapters/steamAdapter.cjs');
const EpicAdapter = require('../adapters/epicAdapter.cjs');
const GogAdapter = require('../adapters/gogAdapter.cjs');
const EaAdapter = require('../adapters/eaAdapter.cjs');
const UbisoftAdapter = require('../adapters/ubisoftAdapter.cjs');
const XboxAdapter = require('../adapters/xboxAdapter.cjs');
const BattleNetAdapter = require('../adapters/battlenetAdapter.cjs');

function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[:\-_'’"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
        const count = currentLibrary.filter((g) => g.launcher === id || g.ownershipSources?.some((s) => s.launcher === id)).length;

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

    // 2. Scan owned games from platforms with cloud libraries (e.g. Steam Web API)
    try {
      const steamAdapter = this.adapters.Steam;
      if (await steamAdapter.isInstalled()) {
        const ownedSteamGames = await steamAdapter.scanOwnedGames(options);
        scannedGames.push(...ownedSteamGames);
      }
    } catch (err) {
      console.error('[LibraryEngine] Error scanning owned Steam games:', err);
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

        // If this copy is installed, prioritize installed state and launch paths
        if (item.installed) {
          existing.installed = true;
          existing.installPath = item.installPath || existing.installPath;
          existing.sizeGb = item.sizeGb || existing.sizeGb;
          if (item.launcher === 'Steam') {
            existing.launcher = 'Steam'; // Prefer Steam if available
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
        if (!existing.media.coverUrl && item.media?.coverUrl) {
          existing.media.coverUrl = item.media.coverUrl;
        }
        if (!existing.media.heroUrl && item.media?.heroUrl) {
          existing.media.heroUrl = item.media.heroUrl;
        }
      }
    }

    const mergedLibrary = Array.from(unifiedMap.values());

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
    const launcherName = requestedLauncher || game.launcher;
    const adapter = this.adapters[launcherName];
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
}

module.exports = LibraryEngine;
