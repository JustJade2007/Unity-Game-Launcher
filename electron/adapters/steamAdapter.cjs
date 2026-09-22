const fs = require('fs');
const path = require('path');
const https = require('https');
const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');
const { parseVDF } = require('./vdfParser.cjs');

// Common tool app IDs on Steam to ignore
const IGNORED_STEAM_APPIDS = new Set([
  '228980', // Steamworks Common Redistributables
  '250820', // SteamVR
  '1070560', // Steam Linux Runtime
  '1391110', // Steam Linux Runtime - Soldier
  '1628350', // Steam Linux Runtime - Sniper
  '2180100', // Proton
  '2801650', // Steam Linux Runtime 3.0
]);

class SteamAdapter extends BaseAdapter {
  constructor() {
    super('Steam', 'Steam');
    this.steamRoot = this.detectSteamRoot();
  }

  detectSteamRoot() {
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const regCommands = [
          'reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath',
          'reg query "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath',
          'reg query "HKLM\\SOFTWARE\\Valve\\Steam" /v InstallPath',
        ];
        for (const cmd of regCommands) {
          try {
            const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
            const match = out.match(/(?:SteamPath|InstallPath)\s+REG_SZ\s+(.*)/i);
            if (match && match[1]) {
              const regPath = path.normalize(match[1].trim());
              if (fs.existsSync(regPath) && fs.existsSync(path.join(regPath, 'steam.exe'))) {
                return regPath;
              }
            }
          } catch {
            // continue
          }
        }
      } catch {
        // continue
      }
    }

    const candidates = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\Steam',
      'E:\\Steam',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p) && fs.existsSync(path.join(p, 'steam.exe'))) {
        return p;
      }
    }
    return null;
  }

  async isInstalled() {
    return Boolean(this.steamRoot && fs.existsSync(path.join(this.steamRoot, 'steam.exe')));
  }

  async getClientPath() {
    return this.steamRoot ? path.join(this.steamRoot, 'steam.exe') : null;
  }

  async getActiveAccount() {
    if (!this.steamRoot) return null;
    const loginUsersPath = path.join(this.steamRoot, 'config', 'loginusers.vdf');
    if (!fs.existsSync(loginUsersPath)) return null;

    try {
      const content = fs.readFileSync(loginUsersPath, 'utf8');
      const vdf = parseVDF(content);
      const users = vdf.users || {};

      let mostRecentId = null;
      let mostRecentUser = null;

      for (const [steamId, userObj] of Object.entries(users)) {
        if (typeof userObj === 'object') {
          if (userObj.MostRecent === '1' || !mostRecentUser) {
            mostRecentId = steamId;
            mostRecentUser = userObj;
          }
        }
      }

      if (mostRecentId && mostRecentUser) {
        return {
          id: mostRecentId,
          name: mostRecentUser.PersonaName || mostRecentUser.AccountName || 'Steam User',
          accountName: mostRecentUser.AccountName || '',
        };
      }
    } catch (err) {
      console.error('[SteamAdapter] Failed to parse loginusers.vdf:', err);
    }
    return null;
  }

  getLibraryFolders() {
    if (!this.steamRoot) return [];
    const libraryVdfPath = path.join(this.steamRoot, 'steamapps', 'libraryfolders.vdf');
    const folders = [path.normalize(this.steamRoot)];

    if (!fs.existsSync(libraryVdfPath)) return folders;

    try {
      const content = fs.readFileSync(libraryVdfPath, 'utf8');
      const vdf = parseVDF(content);
      const libraryfolders = vdf.libraryfolders || {};

      for (const [key, folderInfo] of Object.entries(libraryfolders)) {
        if (folderInfo && typeof folderInfo === 'object' && folderInfo.path) {
          const folderPath = path.normalize(folderInfo.path.replace(/\\\\/g, '\\'));
          const exists = folders.some((f) => f.toLowerCase() === folderPath.toLowerCase());
          if (!exists && fs.existsSync(folderPath)) {
            folders.push(folderPath);
          }
        }
      }
    } catch (err) {
      console.error('[SteamAdapter] Error reading libraryfolders.vdf:', err);
    }
    return folders;
  }

  async scanInstalledGames() {
    if (!this.steamRoot) return [];
    const libraryFolders = this.getLibraryFolders();
    const installedGames = [];

    for (const folder of libraryFolders) {
      const steamappsDir = path.join(folder, 'steamapps');
      if (!fs.existsSync(steamappsDir)) continue;

      try {
        const files = fs.readdirSync(steamappsDir);
        for (const file of files) {
          if (!file.startsWith('appmanifest_') || !file.endsWith('.acf')) continue;

          const manifestPath = path.join(steamappsDir, file);
          try {
            const content = fs.readFileSync(manifestPath, 'utf8');
            const parsed = parseVDF(content);
            const state = parsed.AppState || parsed.appstate;
            if (!state) continue;

            const appid = String(state.appid || state.AppID || '');
            if (!appid || IGNORED_STEAM_APPIDS.has(appid)) continue;

            const name = state.name || `Steam App ${appid}`;
            // Ignore tools, proton, runtimes
            if (
              name.startsWith('Proton ') ||
              name.startsWith('Steam Linux Runtime') ||
              name === 'SteamVR'
            ) {
              continue;
            }

            const installdir = state.installdir || '';
            const installPath = installdir
              ? path.join(steamappsDir, 'common', installdir)
              : steamappsDir;
            const sizeBytes = parseInt(state.SizeOnDisk || state.sizeondisk || '0', 10);
            const sizeGb = Math.round((sizeBytes / (1024 * 1024 * 1024)) * 10) / 10;
            const lastUpdated = state.LastUpdated || state.lastupdated;
            const lastPlayedTs = state.LastPlayed || state.lastplayed;

            installedGames.push({
              id: `steam_${appid}`,
              appId: appid,
              title: name,
              tagline: `Steam Title`,
              description: `Installed locally on ${folder}`,
              developer: 'Steam Developer',
              publisher: 'Steam Publisher',
              releaseDate: '',
              categories: ['Steam', 'Action'],
              launcher: 'Steam',
              installed: true,
              installPath,
              sizeGb: sizeGb > 0 ? sizeGb : undefined,
              playtime: {
                totalMinutes: 0,
                lastPlayed: lastPlayedTs && lastPlayedTs !== '0'
                  ? new Date(parseInt(lastPlayedTs, 10) * 1000).toISOString()
                  : undefined,
              },
              media: {
                coverUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`,
                heroUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_hero.jpg`,
                logoUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/logo.png`,
                iconUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
                screenshots: [`https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`],
              },
              achievements: [],
              friends: [],
              launchUri: `steam://run/${appid}`,
              installUri: `steam://install/${appid}`,
            });
          } catch (err) {
            console.error(`[SteamAdapter] Error reading manifest ${file}:`, err);
          }
        }
      } catch (err) {
        console.error(`[SteamAdapter] Error scanning steamapps in ${folder}:`, err);
      }
    }

    return installedGames;
  }

  async scanOwnedGames(options = {}) {
    const apiKey = options.apiKey || process.env.STEAM_API_KEY || 'B9704EF5F81AE0BA3AC20F633883B503';
    let steamId = options.steamId;

    if (!steamId) {
      const activeAccount = await this.getActiveAccount();
      steamId = activeAccount ? activeAccount.id : null;
    }

    if (!apiKey || !steamId) {
      console.warn('[SteamAdapter] Cannot scan owned games without apiKey and steamId');
      return [];
    }

    const apiUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`;

    return new Promise((resolve) => {
      https.get(apiUrl, (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(rawData);
            const games = json.response?.games || [];
            const result = [];

            for (const g of games) {
              const appid = String(g.appid);
              if (IGNORED_STEAM_APPIDS.has(appid)) continue;

              const totalMinutes = g.playtime_forever || 0;
              const recentMinutes = g.playtime_2weeks || undefined;
              const lastPlayed = g.rtime_last_played
                ? new Date(g.rtime_last_played * 1000).toISOString()
                : undefined;

              const iconUrl = g.img_icon_url
                ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${g.img_icon_url}.jpg`
                : `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;

              result.push({
                id: `steam_${appid}`,
                appId: appid,
                title: g.name || `Steam Game ${appid}`,
                tagline: `Owned on Steam`,
                description: `Steam library game`,
                developer: 'Valve / Steam',
                publisher: 'Steam Publisher',
                releaseDate: '',
                categories: ['Steam'],
                launcher: 'Steam',
                installed: false, // Ingestion engine will reconcile with installed items
                playtime: {
                  totalMinutes,
                  recentMinutes,
                  lastPlayed,
                },
                media: {
                  coverUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`,
                  heroUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_hero.jpg`,
                  logoUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/logo.png`,
                  iconUrl,
                  screenshots: [`https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`],
                },
                achievements: [],
                friends: [],
                launchUri: `steam://run/${appid}`,
                installUri: `steam://install/${appid}`,
              });
            }

            resolve(result);
          } catch (err) {
            console.error('[SteamAdapter] Failed to parse owned games response:', err);
            resolve([]);
          }
        });
      }).on('error', (err) => {
        console.error('[SteamAdapter] Network error fetching owned games:', err);
        resolve([]);
      });
    });
  }

  async launchGame(game) {
    const appId = game.appId || (game.id.startsWith('steam_') ? game.id.replace('steam_', '') : null);
    const uri = game.launchUri || (appId ? `steam://run/${appId}` : null);

    if (uri) {
      await shell.openExternal(uri);
      return { success: true, uri };
    }
    throw new Error('No valid Steam launch URI or AppID found');
  }

  async installGame(game) {
    const appId = game.appId || (game.id.startsWith('steam_') ? game.id.replace('steam_', '') : null);
    const uri = game.installUri || (appId ? `steam://install/${appId}` : null);

    if (uri) {
      await shell.openExternal(uri);
      return { success: true, uri };
    }
    throw new Error('No valid Steam install URI or AppID found');
  }

  /**
   * Fetch achievements for a Steam game by AppID.
   * Merges game schema, player achievement statuses, and global unlock percentages.
   * @param {string} appId
   * @param {object} [options]
   * @returns {Promise<Array<any>>}
   */
  async fetchAchievements(appId, options = {}) {
    if (!appId) return [];
    const cleanAppId = String(appId).replace(/^steam_/, '').trim();
    if (!cleanAppId || !/^\d+$/.test(cleanAppId)) return [];

    const apiKey = options.apiKey || process.env.STEAM_API_KEY || 'B9704EF5F81AE0BA3AC20F633883B503';
    let steamId = options.steamId;

    if (!steamId) {
      const activeAccount = await this.getActiveAccount();
      steamId = activeAccount ? activeAccount.id : null;
    }

    const httpsGetJson = (url) => {
      return new Promise((resolve) => {
        https.get(url, (res) => {
          let raw = '';
          res.on('data', (chunk) => {
            raw += chunk;
          });
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(JSON.parse(raw));
              } else {
                resolve(null);
              }
            } catch {
              resolve(null);
            }
          });
        }).on('error', (err) => {
          console.error(`[SteamAdapter] Network error fetching ${url}:`, err);
          resolve(null);
        });
      });
    };

    try {
      const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${cleanAppId}`;
      const playerUrl = steamId
        ? `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${cleanAppId}&key=${apiKey}&steamid=${steamId}`
        : null;
      const globalUrl = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${cleanAppId}`;

      const [schemaData, playerData, globalData] = await Promise.all([
        httpsGetJson(schemaUrl),
        playerUrl ? httpsGetJson(playerUrl) : Promise.resolve(null),
        httpsGetJson(globalUrl),
      ]);

      const rawSchemaAchievements = schemaData?.game?.availableGameStats?.achievements || [];
      if (!Array.isArray(rawSchemaAchievements) || rawSchemaAchievements.length === 0) {
        return [];
      }

      const playerMap = new Map();
      if (playerData?.playerstats?.achievements && Array.isArray(playerData.playerstats.achievements)) {
        for (const p of playerData.playerstats.achievements) {
          playerMap.set(p.apiname, p);
        }
      }

      const globalMap = new Map();
      if (globalData?.achievementpercentages?.achievements && Array.isArray(globalData.achievementpercentages.achievements)) {
        for (const g of globalData.achievementpercentages.achievements) {
          globalMap.set(g.name, parseFloat(g.percent));
        }
      }

      const results = [];
      for (const item of rawSchemaAchievements) {
        const apiname = item.name;
        const playerStat = playerMap.get(apiname);
        const unlocked = playerStat ? playerStat.achieved === 1 : false;
        const unlockTime = playerStat?.unlocktime;
        const unlockedAt = unlocked && unlockTime && unlockTime > 0
          ? new Date(unlockTime * 1000).toISOString()
          : undefined;

        const rawPct = globalMap.get(apiname);
        const rarityPercentage = typeof rawPct === 'number' && !isNaN(rawPct)
          ? Math.round(rawPct * 10) / 10
          : 0;

        const isSecret = Boolean(item.hidden);
        const iconUrl = unlocked
          ? (item.icon || item.icongray)
          : (item.icongray || item.icon);

        results.push({
          id: apiname,
          title: item.displayName || apiname,
          description: item.description || (isSecret ? 'Hidden achievement' : ''),
          iconUrl: iconUrl || '',
          unlocked,
          unlockedAt,
          rarityPercentage,
          isSecret,
        });
      }

      return results;
    } catch (err) {
      console.error(`[SteamAdapter] Error fetching achievements for ${cleanAppId}:`, err);
      return [];
    }
  }
}

module.exports = SteamAdapter;
