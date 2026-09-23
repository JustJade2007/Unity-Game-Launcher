const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');
const {
  queryRegValue,
  findUninstallEntries,
  calculateDirSizeGb,
  findGameExecutable,
} = require('./registryHelper.cjs');

const BLIZZARD_GAMES = {
  s2: {
    title: 'StarCraft II',
    exe: 'SC2.exe',
    defaultFolders: ['StarCraft II', 'StarCraft 2'],
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'Strategy', 'Sci-Fi', 'RTS'],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7d.jpg',
    heroUrl: 'https://images.igdb.com/igdb/image/upload/t_1080p/sc7w7o.jpg',
  },
  s1: {
    title: 'StarCraft',
    exe: 'StarCraft.exe',
    defaultFolders: ['StarCraft'],
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'Strategy', 'Sci-Fi', 'RTS'],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg',
    heroUrl: 'https://images.igdb.com/igdb/image/upload/t_1080p/sc7w7o.jpg',
  },
  fenris: {
    title: 'Diablo IV',
    exe: 'Diablo IV.exe',
    defaultFolders: ['Diablo IV'],
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'Action RPG', 'Hack and Slash', 'Dark Fantasy'],
    steamAppId: '2344520',
    coverUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2344520/library_600x900.jpg',
    heroUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2344520/library_hero.jpg',
  },
  pro: {
    title: 'Overwatch 2',
    exe: 'Overwatch.exe',
    defaultFolders: ['Overwatch'],
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'Action', 'Hero Shooter', 'FPS'],
    steamAppId: '2357570',
    coverUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2357570/library_600x900.jpg',
    heroUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2357570/library_hero.jpg',
  },
  d3: {
    title: 'Diablo III',
    exe: 'Diablo III.exe',
    defaultFolders: ['Diablo III'],
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'Action RPG', 'Hack and Slash'],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1y3b.jpg',
    heroUrl: 'https://images.igdb.com/igdb/image/upload/t_1080p/sc7w7o.jpg',
  },
  wow: {
    title: 'World of Warcraft',
    exe: 'Wow.exe',
    defaultFolders: ['World of Warcraft', 'World of Warcraft\\_retail_'],
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'MMORPG', 'Fantasy', 'RPG'],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1w6g.jpg',
    heroUrl: '',
  },
  wow_classic: {
    title: 'World of Warcraft Classic',
    exe: 'WowClassic.exe',
    defaultFolders: ['World of Warcraft\\_classic_'],
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'MMORPG', 'Fantasy', 'RPG'],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1w6g.jpg',
    heroUrl: '',
  },
  diablo2: {
    title: 'Diablo II: Resurrected',
    exe: 'D2R.exe',
    defaultFolders: ['Diablo II Resurrected'],
    developer: 'Blizzard Entertainment, Vicarious Visions',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'Action RPG', 'Hack and Slash'],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co38s5.jpg',
    heroUrl: '',
  },
  hero: {
    title: 'Heroes of the Storm',
    exe: 'HeroesOfTheStorm.exe',
    defaultFolders: ['Heroes of the Storm'],
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'MOBA', 'Strategy'],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r3q.jpg',
    heroUrl: '',
  },
  w3: {
    title: 'Warcraft III: Reforged',
    exe: 'Warcraft III.exe',
    defaultFolders: ['Warcraft III'],
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'Strategy', 'RTS'],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1nd4.jpg',
    heroUrl: '',
  },
  hs: {
    title: 'Hearthstone',
    exe: 'Hearthstone.exe',
    defaultFolders: ['Hearthstone'],
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'Card Game', 'Strategy'],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x59.jpg',
    heroUrl: '',
  },
  odin: {
    title: 'Call of Duty: Modern Warfare',
    exe: 'ModernWarfare.exe',
    defaultFolders: ['Call of Duty Modern Warfare'],
    developer: 'Infinity Ward',
    publisher: 'Activision',
    categories: ['Battle.net', 'Action', 'Shooter', 'FPS'],
    steamAppId: '1938090',
    coverUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1938090/library_600x900.jpg',
    heroUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1938090/library_hero.jpg',
  },
  lazr: {
    title: 'Call of Duty: Modern Warfare II',
    exe: 'cod.exe',
    defaultFolders: ['Call of Duty'],
    developer: 'Infinity Ward',
    publisher: 'Activision',
    categories: ['Battle.net', 'Action', 'Shooter', 'FPS'],
    steamAppId: '1938090',
    coverUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1938090/library_600x900.jpg',
    heroUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1938090/library_hero.jpg',
  },
  zeus: {
    title: 'Call of Duty: Black Ops Cold War',
    exe: 'BlackOpsColdWar.exe',
    defaultFolders: ['Call of Duty Black Ops Cold War'],
    developer: 'Treyarch, Raven Software',
    publisher: 'Activision',
    categories: ['Battle.net', 'Action', 'Shooter', 'FPS'],
    steamAppId: '1985810',
    coverUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1985810/library_600x900.jpg',
    heroUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1985810/library_hero.jpg',
  },
  viper: {
    title: 'Call of Duty: Black Ops 4',
    exe: 'BlackOps4.exe',
    defaultFolders: ['Call of Duty Black Ops 4'],
    developer: 'Treyarch',
    publisher: 'Activision',
    categories: ['Battle.net', 'Action', 'Shooter', 'FPS'],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x18.jpg',
    heroUrl: '',
  },
  fore: {
    title: 'Call of Duty: Vanguard',
    exe: 'Vanguard.exe',
    defaultFolders: ['Call of Duty Vanguard'],
    developer: 'Sledgehammer Games',
    publisher: 'Activision',
    categories: ['Battle.net', 'Action', 'Shooter', 'FPS'],
    steamAppId: '1985820',
    coverUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1985820/library_600x900.jpg',
    heroUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1985820/library_hero.jpg',
  },
  rtro: {
    title: 'Blizzard Arcade Collection',
    exe: 'BlizzardArcadeCollection.exe',
    defaultFolders: ['Blizzard Arcade Collection'],
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    categories: ['Battle.net', 'Arcade', 'Retro'],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2sdr.jpg',
    heroUrl: '',
  },
  wlby: {
    title: 'Crash Bandicoot 4: It\'s About Time',
    exe: 'CrashBandicoot4.exe',
    defaultFolders: ['Crash Bandicoot 4'],
    developer: 'Toys for Bob',
    publisher: 'Activision',
    categories: ['Battle.net', 'Platformer', 'Action'],
    steamAppId: '1378990',
    coverUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1378990/library_600x900.jpg',
    heroUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1378990/library_hero.jpg',
  },
};

class BattleNetAdapter extends BaseAdapter {
  constructor() {
    super('Battle.net', 'Battle.net');
    this.clientPath = this.detectClient();
  }

  detectClient() {
    // 1. Registry Capabilities
    const regIcon = queryRegValue(
      'HKLM\\SOFTWARE\\WOW6432Node\\Blizzard Entertainment\\Battle.net\\Capabilities',
      'ApplicationIcon'
    );
    if (regIcon) {
      const p = regIcon.replace(/"/g, '').split(',')[0].trim();
      if (fs.existsSync(p)) return path.normalize(p);
    }

    // 2. Uninstall registry
    const uninstalls = findUninstallEntries(['battle.net']);
    for (const u of uninstalls) {
      if (u.displayIcon && fs.existsSync(u.displayIcon)) {
        return path.normalize(u.displayIcon);
      }
      if (u.installLocation && fs.existsSync(path.join(u.installLocation, 'Battle.net.exe'))) {
        return path.normalize(path.join(u.installLocation, 'Battle.net.exe'));
      }
    }

    // 3. Common paths
    const candidates = [
      'C:\\Program Files (x86)\\Battle.net\\Battle.net.exe',
      'C:\\Program Files\\Battle.net\\Battle.net.exe',
      'D:\\Battle.net\\Battle.net.exe',
      'D:\\Games\\Battle.net\\Battle.net.exe',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  async isInstalled() {
    if (!this.clientPath) {
      this.clientPath = this.detectClient();
    }
    return Boolean(this.clientPath);
  }

  async getClientPath() {
    if (!this.clientPath) {
      this.clientPath = this.detectClient();
    }
    return this.clientPath;
  }

  async getActiveAccount() {
    const appData = process.env.APPDATA;
    if (!appData) return null;

    const configFile = path.join(appData, 'Battle.net', 'Battle.net.config');
    if (!fs.existsSync(configFile)) return null;

    try {
      const content = fs.readFileSync(configFile, 'utf8');
      const data = JSON.parse(content);
      const savedAccounts = data.Client?.SavedAccountNames;
      if (savedAccounts) {
        const firstAccount = savedAccounts.split(',')[0].trim();
        return {
          id: firstAccount,
          name: firstAccount,
          accountName: firstAccount,
        };
      }
    } catch (err) {
      console.error('[BattleNetAdapter] Error reading Battle.net.config:', err);
    }

    return null;
  }

  async scanInstalledGames() {
    const games = [];
    const gamesMap = new Map();

    const searchRoots = [
      'C:\\Program Files (x86)',
      'C:\\Program Files',
      'D:\\',
      'D:\\Games',
      'C:\\Games',
    ];

    // Check each known Blizzard game
    for (const [code, info] of Object.entries(BLIZZARD_GAMES)) {
      for (const root of searchRoots) {
        for (const sub of info.defaultFolders) {
          const dir = path.join(root, sub);
          if (fs.existsSync(dir)) {
            const exe = path.join(dir, info.exe);
            if (fs.existsSync(exe)) {
              gamesMap.set(code, {
                code,
                title: info.title,
                installPath: dir,
                executable: exe,
              });
              break;
            }
          }
        }
        if (gamesMap.has(code)) break;
      }
    }

    // Check Windows Uninstall entries for Blizzard Entertainment games
    try {
      const uninstalls = findUninstallEntries((item) => {
        return (
          item.publisher === 'Blizzard Entertainment' ||
          (item.uninstallString && item.uninstallString.toLowerCase().includes('battle.net'))
        );
      });

      for (const item of uninstalls) {
        if (item.displayName.toLowerCase() === 'battle.net') continue;
        const dir = item.installLocation;
        if (dir && fs.existsSync(dir)) {
          const exe = findGameExecutable(dir, [`${item.displayName}.exe`]);
          if (exe) {
            const cleanId = item.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!gamesMap.has(cleanId)) {
              gamesMap.set(cleanId, {
                code: cleanId,
                title: item.displayName,
                installPath: dir,
                executable: exe,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[BattleNetAdapter] Error checking uninstall entries:', err);
    }

    // Build game items
    for (const [code, item] of gamesMap.entries()) {
      const installPath = item.installPath;
      const sizeGb = calculateDirSizeGb(installPath);
      const info = BLIZZARD_GAMES[code];
      const coverUrl = info?.coverUrl || '';
      const heroUrl = info?.heroUrl || '';

      games.push({
        id: `bnet_${code}`,
        appId: code,
        title: item.title || info?.title || code,
        tagline: 'Battle.net Title',
        description: `Installed via Battle.net at ${installPath}`,
        developer: info?.developer || 'Blizzard Entertainment',
        publisher: info?.publisher || 'Blizzard Entertainment',
        releaseDate: '',
        categories: info?.categories || ['Battle.net', 'Action'],
        launcher: 'Battle.net',
        installed: true,
        installPath,
        executable: item.executable || undefined,
        sizeGb: sizeGb && sizeGb > 0 ? sizeGb : undefined,
        playtime: {
          totalMinutes: 0,
        },
        media: {
          coverUrl,
          heroUrl,
          logoUrl: '',
          iconUrl: coverUrl,
          screenshots: heroUrl ? [heroUrl] : [],
        },
        achievements: [],
        friends: [],
        launchUri: `battlenet://${code}`,
        installUri: `battlenet://${code}`,
      });
    }

    return games;
  }

  /**
   * Scan owned and played Battle.net titles from user configurations and agent registries.
   * Discovers library games (e.g. StarCraft II, Diablo, Overwatch) even when not currently on disk.
   * @returns {Promise<Array<object>>}
   */
  async scanOwnedGames() {
    const ownedMap = new Map();

    // 1. Inspect Battle.net.config for games with serverUid, LastPlayed, LastActioned
    const appData = process.env.APPDATA;
    if (appData) {
      const confFile = path.join(appData, 'Battle.net', 'Battle.net.config');
      if (fs.existsSync(confFile)) {
        try {
          const content = JSON.parse(fs.readFileSync(confFile, 'utf8'));
          const gamesSection = content.Games || {};
          for (const [key, val] of Object.entries(gamesSection)) {
            if (key === 'battle_net') continue;
            const code = val.ServerUid || key;
            const lastPlayedSec = val.LastPlayed ? parseInt(val.LastPlayed, 10) : 0;
            const lastActionSec = val.LastActioned ? parseInt(val.LastActioned, 10) : 0;
            ownedMap.set(code, {
              code,
              lastPlayedSec,
              lastActionSec,
            });
          }
        } catch (err) {
          console.warn('[BattleNetAdapter] Error reading Battle.net.config for owned games:', err);
        }
      }
    }

    // 2. Inspect product.db in ProgramData/Battle.net/Agent
    const productDb = 'C:\\ProgramData\\Battle.net\\Agent\\product.db';
    if (fs.existsSync(productDb)) {
      try {
        const raw = fs.readFileSync(productDb).toString('utf8');
        for (const code of Object.keys(BLIZZARD_GAMES)) {
          const regex = new RegExp(`[\\s:]${code}[\\s:]`, 'i');
          if (regex.test(raw) || raw.includes(` ${code} `)) {
            if (!ownedMap.has(code)) {
              ownedMap.set(code, { code });
            }
          }
        }
      } catch {}
    }

    // Also check installed games and merge
    const installed = await this.scanInstalledGames();
    const installedMap = new Map();
    for (const g of installed) {
      const code = g.appId || g.id.replace('bnet_', '');
      installedMap.set(code, g);
      if (!ownedMap.has(code)) {
        ownedMap.set(code, { code });
      }
    }

    const searchRoots = [
      'C:\\Program Files (x86)',
      'C:\\Program Files',
      'D:\\',
      'D:\\Games',
      'C:\\Games',
    ];

    const results = [];
    for (const [code, entry] of ownedMap.entries()) {
      const info = BLIZZARD_GAMES[code];
      const title = info?.title || `Battle.net Game ${code}`;
      const inst = installedMap.get(code);

      let isInstalled = Boolean(inst);
      let installPath = inst?.installPath;
      let executable = inst?.executable;
      let sizeGb = inst?.sizeGb;

      if (!isInstalled && info?.defaultFolders) {
        for (const root of searchRoots) {
          for (const sub of info.defaultFolders) {
            const dir = path.join(root, sub);
            if (fs.existsSync(dir)) {
              const exe = path.join(dir, info.exe);
              if (fs.existsSync(exe)) {
                isInstalled = true;
                installPath = dir;
                executable = exe;
                sizeGb = calculateDirSizeGb(dir);
                break;
              }
            }
          }
          if (isInstalled) break;
        }
      }

      let lastPlayedIso;
      if (entry.lastPlayedSec && entry.lastPlayedSec > 0) {
        lastPlayedIso = new Date(entry.lastPlayedSec * 1000).toISOString();
      }

      const coverUrl = info?.coverUrl || '';
      const heroUrl = info?.heroUrl || '';

      results.push({
        id: `bnet_${code}`,
        appId: code,
        title,
        tagline: 'Battle.net Title',
        description: isInstalled
          ? `Installed via Battle.net at ${installPath}`
          : 'Owned in Battle.net library',
        developer: info?.developer || 'Blizzard Entertainment',
        publisher: info?.publisher || 'Blizzard Entertainment',
        releaseDate: '',
        categories: info?.categories || ['Battle.net', 'Action'],
        launcher: 'Battle.net',
        installed: isInstalled,
        installPath: installPath || undefined,
        executable: executable || undefined,
        sizeGb: sizeGb && sizeGb > 0 ? sizeGb : undefined,
        playtime: {
          totalMinutes: 0,
          lastPlayed: lastPlayedIso,
        },
        media: {
          coverUrl,
          heroUrl,
          logoUrl: '',
          iconUrl: coverUrl,
          screenshots: heroUrl ? [heroUrl] : [],
        },
        achievements: [],
        friends: [],
        launchUri: `battlenet://${code}`,
        installUri: `battlenet://${code}`,
        ownershipSources: [
          {
            launcher: 'Battle.net',
            gameId: code,
            installed: isInstalled,
            installPath: installPath || undefined,
            launchUri: `battlenet://${code}`,
            installUri: `battlenet://${code}`,
          },
        ],
      });
    }

    return results;
  }

  async launchGame(game) {
    const gameCode = game.appId || game.id.replace('bnet_', '');
    const uri = game.launchUri || `battlenet://${gameCode}`;
    try {
      await shell.openExternal(uri);
      return { success: true, uri };
    } catch (err) {
      if (game.executable && fs.existsSync(game.executable)) {
        const { spawn } = require('child_process');
        const child = spawn(game.executable, [], {
          detached: true,
          stdio: 'ignore',
          cwd: path.dirname(game.executable),
        });
        child.unref();
        return { success: true, pid: child.pid };
      }
      throw err;
    }
  }

  async installGame(game) {
    const gameCode = game.appId || game.id.replace('bnet_', '');
    const uri = game.installUri || `battlenet://${gameCode}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = BattleNetAdapter;
