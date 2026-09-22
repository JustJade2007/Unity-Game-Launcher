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
  s2: { title: 'StarCraft II', exe: 'SC2.exe', defaultFolders: ['StarCraft II'] },
  s1: { title: 'StarCraft', exe: 'StarCraft.exe', defaultFolders: ['StarCraft'] },
  wow: { title: 'World of Warcraft', exe: 'Wow.exe', defaultFolders: ['World of Warcraft', 'World of Warcraft\\_retail_'] },
  wow_classic: { title: 'World of Warcraft Classic', exe: 'WowClassic.exe', defaultFolders: ['World of Warcraft\\_classic_'] },
  d3: { title: 'Diablo III', exe: 'Diablo III.exe', defaultFolders: ['Diablo III'] },
  fenris: { title: 'Diablo IV', exe: 'Diablo IV.exe', defaultFolders: ['Diablo IV'] },
  diablo2: { title: 'Diablo II: Resurrected', exe: 'D2R.exe', defaultFolders: ['Diablo II Resurrected'] },
  pro: { title: 'Overwatch 2', exe: 'Overwatch.exe', defaultFolders: ['Overwatch'] },
  hero: { title: 'Heroes of the Storm', exe: 'HeroesOfTheStorm.exe', defaultFolders: ['Heroes of the Storm'] },
  w3: { title: 'Warcraft III: Reforged', exe: 'Warcraft III.exe', defaultFolders: ['Warcraft III'] },
  hs: { title: 'Hearthstone', exe: 'Hearthstone.exe', defaultFolders: ['Hearthstone'] },
  odin: { title: 'Call of Duty: Modern Warfare', exe: 'ModernWarfare.exe', defaultFolders: ['Call of Duty Modern Warfare'] },
  lazr: { title: 'Call of Duty: Modern Warfare II', exe: 'cod.exe', defaultFolders: ['Call of Duty'] },
  zeus: { title: 'Call of Duty: Black Ops Cold War', exe: 'BlackOpsColdWar.exe', defaultFolders: ['Call of Duty Black Ops Cold War'] },
  viper: { title: 'Call of Duty: Black Ops 4', exe: 'BlackOps4.exe', defaultFolders: ['Call of Duty Black Ops 4'] },
  fore: { title: 'Call of Duty: Vanguard', exe: 'Vanguard.exe', defaultFolders: ['Call of Duty Vanguard'] },
  rtro: { title: 'Blizzard Arcade Collection', exe: 'BlizzardArcadeCollection.exe', defaultFolders: ['Blizzard Arcade Collection'] },
  wlby: { title: 'Crash Bandicoot 4', exe: 'CrashBandicoot4.exe', defaultFolders: ['Crash Bandicoot 4'] },
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

      games.push({
        id: `bnet_${code}`,
        appId: code,
        title: item.title,
        tagline: 'Battle.net Title',
        description: `Installed via Battle.net at ${installPath}`,
        developer: 'Blizzard Entertainment',
        publisher: 'Blizzard Entertainment',
        releaseDate: '',
        categories: ['Battle.net', 'Action'],
        launcher: 'Battle.net',
        installed: true,
        installPath,
        executable: item.executable || undefined,
        sizeGb: sizeGb && sizeGb > 0 ? sizeGb : undefined,
        playtime: {
          totalMinutes: 0,
        },
        media: {
          coverUrl: '',
          heroUrl: '',
          screenshots: [],
        },
        achievements: [],
        friends: [],
        launchUri: `battlenet://${code}`,
        installUri: `battlenet://${code}`,
      });
    }

    return games;
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
