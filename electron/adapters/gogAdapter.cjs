const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');
const {
  queryRegValue,
  queryRegSubkeys,
  queryRegKeyValues,
  findUninstallEntries,
  calculateDirSizeGb,
  findGameExecutable,
} = require('./registryHelper.cjs');

class GogAdapter extends BaseAdapter {
  constructor() {
    super('GOG', 'GOG Galaxy');
    this.gogRoot = this.detectGogRoot();
    this.storageDb = 'C:\\ProgramData\\GOG.com\\Galaxy\\storage\\galaxy-2.0.db';
  }

  detectGogRoot() {
    // 1. Check registry paths
    const regRoots = [
      'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\GalaxyClient\\paths',
      'HKLM\\SOFTWARE\\GOG.com\\GalaxyClient\\paths',
    ];
    for (const root of regRoots) {
      const client = queryRegValue(root, 'client');
      if (client && fs.existsSync(client) && fs.existsSync(path.join(client, 'GalaxyClient.exe'))) {
        return path.normalize(client);
      }
    }

    // 2. Check uninstall entries
    const uninstalls = findUninstallEntries(['gog galaxy']);
    for (const u of uninstalls) {
      if (u.installLocation && fs.existsSync(u.installLocation)) {
        if (fs.existsSync(path.join(u.installLocation, 'GalaxyClient.exe'))) {
          return path.normalize(u.installLocation);
        }
      }
    }

    // 3. Fallback paths
    const candidates = [
      'C:\\Program Files (x86)\\GOG Galaxy',
      'C:\\Program Files\\GOG Galaxy',
      'D:\\GOG Galaxy',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p) && fs.existsSync(path.join(p, 'GalaxyClient.exe'))) {
        return p;
      }
    }
    return null;
  }

  async isInstalled() {
    return Boolean(this.gogRoot || fs.existsSync(this.storageDb));
  }

  async getClientPath() {
    return this.gogRoot ? path.join(this.gogRoot, 'GalaxyClient.exe') : null;
  }

  async getActiveAccount() {
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) return null;

    const confFile = path.join(localAppData, 'GOG.com', 'Galaxy', 'Configuration', 'config.json');
    if (!fs.existsSync(confFile)) return null;

    try {
      const content = fs.readFileSync(confFile, 'utf8');
      const data = JSON.parse(content);
      if (data.username || data.userId) {
        return {
          id: data.userId || 'gog_user',
          name: data.username || 'GOG User',
          accountName: data.username || undefined,
        };
      }
    } catch (err) {
      console.error('[GogAdapter] Error reading GOG Galaxy config.json:', err);
    }

    return null;
  }

  async scanInstalledGames() {
    const games = [];
    const gamesMap = new Map();

    // 1. Scan GOG registry games
    const regRoots = [
      'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games',
      'HKLM\\SOFTWARE\\GOG.com\\Games',
      'HKCU\\Software\\GOG.com\\Games',
    ];

    for (const root of regRoots) {
      const subkeys = queryRegSubkeys(root);
      for (const sub of subkeys) {
        const gameId = sub.split('\\').pop();
        if (!gameId) continue;

        const vals = queryRegKeyValues(sub);
        const title = vals.gameName || vals.startMenu || `GOG Game ${gameId}`;
        const installPath = vals.path ? path.normalize(vals.path.replace(/\//g, '\\')) : '';
        const exe = vals.exe ? path.normalize(vals.exe.replace(/\//g, '\\')) : '';

        // Only register if the game files actually exist on disk
        if (installPath && fs.existsSync(installPath)) {
          gamesMap.set(gameId, {
            gameId,
            title,
            installPath,
            executable: exe && fs.existsSync(exe) ? exe : findGameExecutable(installPath),
            icon: vals.startMenuLink || undefined,
          });
        }
      }
    }

    // 2. Scan Windows Uninstall entries for GOG.com
    try {
      const uninstalls = findUninstallEntries((item) => {
        const lowerName = item.displayName.toLowerCase();
        return (
          item.publisher === 'GOG.com' ||
          lowerName.includes('gog') ||
          (item.uninstallString && item.uninstallString.toLowerCase().includes('gog'))
        );
      });

      for (const item of uninstalls) {
        if (item.displayName.toLowerCase() === 'gog galaxy') continue;

        const installDir = item.installLocation;
        if (installDir && fs.existsSync(installDir)) {
          const exe = findGameExecutable(installDir, [`${item.displayName}.exe`]);
          if (exe) {
            // Check if already mapped
            const normPath = (p) => (p ? path.normalize(p).replace(/[\\/]+$/, '').toLowerCase() : '');
            const alreadyMapped = Array.from(gamesMap.values()).some(
              (g) => g.installDir && normPath(g.installDir) === normPath(installDir)
            );
            if (!alreadyMapped) {
              const cleanId = item.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
              gamesMap.set(`gog_${cleanId}`, {
                gameId: cleanId,
                title: item.displayName,
                installDir,
                executable: exe,
                icon: item.displayIcon,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[GogAdapter] Error checking uninstall entries:', err);
    }

    // 3. Scan common GOG library paths across drives
    const commonGogFolders = [
      'C:\\GOG Games',
      'D:\\GOG Games',
      'E:\\GOG Games',
    ];

    for (const folder of commonGogFolders) {
      if (fs.existsSync(folder)) {
        try {
          const entries = fs.readdirSync(folder);
          for (const sub of entries) {
            const full = path.join(folder, sub);
            try {
              if (fs.statSync(full).isDirectory()) {
                const exe = findGameExecutable(full, [`${sub}.exe`]);
                if (exe) {
                  const normPath = (p) => (p ? path.normalize(p).replace(/[\\/]+$/, '').toLowerCase() : '');
                  const alreadyMapped = Array.from(gamesMap.values()).some(
                    (g) => g.installDir && normPath(g.installDir) === normPath(full)
                  );
                  if (!alreadyMapped) {
                    const cleanId = sub.toLowerCase().replace(/[^a-z0-9]/g, '');
                    gamesMap.set(`gog_${cleanId}`, {
                      gameId: cleanId,
                      title: sub,
                      installDir: full,
                      executable: exe,
                    });
                  }
                }
              }
            } catch {}
          }
        } catch {}
      }
    }

    // Build game items
    for (const [key, item] of gamesMap.entries()) {
      const gameId = String(item.gameId);
      const installPath = item.installPath || item.installDir;
      const sizeGb = calculateDirSizeGb(installPath);

      let iconUrl = '';
      if (item.icon && fs.existsSync(item.icon)) {
        iconUrl = `file://${item.icon.replace(/\\/g, '/')}`;
      } else {
        // Look for goggame-*.ico in folder
        try {
          const files = fs.readdirSync(installPath);
          const ico = files.find((f) => f.startsWith('goggame') && f.endsWith('.ico'));
          if (ico) {
            iconUrl = `file://${path.join(installPath, ico).replace(/\\/g, '/')}`;
          }
        } catch {}
      }

      games.push({
        id: `gog_${gameId}`,
        appId: gameId,
        title: item.title,
        tagline: 'GOG Galaxy Title',
        description: `Installed via GOG Galaxy at ${installPath}`,
        developer: 'GOG Partner',
        publisher: 'GOG.com',
        releaseDate: '',
        categories: ['GOG', 'Action'],
        launcher: 'GOG',
        installed: true,
        installPath,
        executable: item.executable || undefined,
        sizeGb: sizeGb && sizeGb > 0 ? sizeGb : undefined,
        playtime: {
          totalMinutes: 0,
        },
        media: {
          coverUrl: iconUrl || '',
          heroUrl: '',
          logoUrl: '',
          iconUrl,
          screenshots: [],
        },
        achievements: [],
        friends: [],
        launchUri: `goggalaxy://openGameView/${gameId}`,
        installUri: `goggalaxy://openGameView/${gameId}`,
      });
    }

    return games;
  }

  async launchGame(game) {
    const gameId = game.appId || game.id.replace('gog_', '');
    const uri = game.launchUri || `goggalaxy://openGameView/${gameId}`;

    // If client is installed, protocol URI opens Galaxy
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
    const gameId = game.appId || game.id.replace('gog_', '');
    const uri = game.installUri || `goggalaxy://openGameView/${gameId}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = GogAdapter;
