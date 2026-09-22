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

class UbisoftAdapter extends BaseAdapter {
  constructor() {
    super('Ubisoft', 'Ubisoft Connect');
    this.ubiRoot = this.detectUbiRoot();
    this.clientPath = this.detectClient();
  }

  detectUbiRoot() {
    // 1. Check registry entries
    const regKeys = [
      'HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher',
      'HKLM\\SOFTWARE\\Ubisoft\\Launcher',
      'HKCU\\Software\\Ubisoft\\Launcher',
    ];
    for (const key of regKeys) {
      const val = queryRegValue(key, 'InstallDir');
      if (val && fs.existsSync(val)) {
        return path.normalize(val);
      }
    }

    // 2. Check uninstall entries
    const uninstalls = findUninstallEntries(['ubisoft connect', 'uplay']);
    for (const entry of uninstalls) {
      if (entry.installLocation && fs.existsSync(entry.installLocation)) {
        return path.normalize(entry.installLocation);
      }
    }

    // 3. Common path fallbacks across drives
    const candidates = [
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher',
      'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher',
      'D:\\Ubisoft\\Ubisoft Game Launcher',
      'D:\\Games\\Ubisoft\\Ubisoft Game Launcher',
      'E:\\Ubisoft\\Ubisoft Game Launcher',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }

    return null;
  }

  detectClient() {
    const root = this.ubiRoot || this.detectUbiRoot();
    if (root) {
      const exeNames = [
        'UbisoftConnect.exe',
        'upc.exe',
        'Uplay.exe',
        'UbisoftGameLauncher64.exe',
        'UbisoftGameLauncher.exe',
      ];
      for (const exe of exeNames) {
        const full = path.join(root, exe);
        if (fs.existsSync(full)) return full;
      }
    }

    // Fallbacks
    const fallbackExes = [
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\UbisoftConnect.exe',
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\upc.exe',
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\Uplay.exe',
      'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher\\UbisoftConnect.exe',
    ];
    for (const p of fallbackExes) {
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
    const root = this.ubiRoot || this.detectUbiRoot();
    if (!root) return null;

    // Check savegames directory for user UUIDs
    try {
      const savegamesDir = path.join(root, 'savegames');
      if (fs.existsSync(savegamesDir)) {
        const entries = fs.readdirSync(savegamesDir);
        const validUids = entries.filter((name) => {
          try {
            return (
              fs.statSync(path.join(savegamesDir, name)).isDirectory() &&
              name.length > 8 &&
              !name.startsWith('.')
            );
          } catch {
            return false;
          }
        });

        if (validUids.length > 0) {
          return {
            id: validUids[0],
            name: 'Ubisoft User',
            accountName: validUids[0],
          };
        }
      }
    } catch (err) {
      console.error('[UbisoftAdapter] Error getting active account from savegames:', err);
    }

    // Check launcher log for User: <uuid>
    try {
      const logFile = path.join(root, 'logs', 'launcher_log.txt');
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf8');
        const match = content.match(/User:\s*([a-f0-9\-]{16,})/i);
        if (match && match[1]) {
          return {
            id: match[1],
            name: 'Ubisoft User',
            accountName: match[1],
          };
        }
      }
    } catch {}

    return null;
  }

  getGameMetadataFromCache(gameId) {
    const root = this.ubiRoot || this.detectUbiRoot();
    if (!root) return null;

    const confPath = path.join(root, 'cache', 'configuration', 'configurations');
    if (!fs.existsSync(confPath)) return null;

    try {
      const content = fs.readFileSync(confPath, 'utf8');
      const searchTargetWin = `Installs\\${gameId}\\InstallDir`;
      const searchTargetPosix = `Installs/${gameId}/InstallDir`;
      let targetIdx = content.indexOf(searchTargetWin);
      if (targetIdx === -1) {
        targetIdx = content.indexOf(searchTargetPosix);
      }
      if (targetIdx === -1) return null;

      const blockStart = Math.max(0, content.lastIndexOf('root:', targetIdx));
      const block = content.slice(blockStart, targetIdx + searchTargetWin.length + 500);

      const nameMatch = block.match(/^\s*name:\s*"?([^"\r\n]+)"?/m);
      const bgMatch = block.match(/^\s*background_image:\s*([^\r\n]+)/m);
      const thumbMatch = block.match(/^\s*thumb_image:\s*([^\r\n]+)/m);
      const splashMatch = block.match(/^\s*splash_image:\s*([^\r\n]+)/m);
      const logoMatch = block.match(/^\s*logo_image:\s*([^\r\n]+)/m);

      const assetsDir = path.join(root, 'cache', 'assets');
      const resolveAsset = (fileName) => {
        if (!fileName) return '';
        const full = path.join(assetsDir, fileName);
        return fs.existsSync(full) ? `file://${full.replace(/\\/g, '/')}` : '';
      };

      return {
        title: nameMatch ? nameMatch[1].trim() : null,
        bgUrl: resolveAsset(bgMatch ? bgMatch[1].trim() : null),
        thumbUrl: resolveAsset(thumbMatch ? thumbMatch[1].trim() : null),
        splashUrl: resolveAsset(splashMatch ? splashMatch[1].trim() : null),
        logoUrl: resolveAsset(logoMatch ? logoMatch[1].trim() : null),
      };
    } catch {
      return null;
    }
  }

  async scanInstalledGames() {
    const games = [];
    const root = this.ubiRoot || this.detectUbiRoot();
    const gamesFoundMap = new Map();

    // 1. Scan Installs Registry
    const installRoots = [
      'HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs',
      'HKLM\\SOFTWARE\\Ubisoft\\Launcher\\Installs',
      'HKCU\\Software\\Ubisoft\\Launcher\\Installs',
    ];

    for (const regRoot of installRoots) {
      const subkeys = queryRegSubkeys(regRoot);
      for (const sub of subkeys) {
        const gameId = sub.split('\\').pop();
        if (!gameId || isNaN(Number(gameId))) continue;

        const vals = queryRegKeyValues(sub);
        if (vals.InstallDir) {
          const rawDir = vals.InstallDir.replace(/\//g, '\\');
          const installDir = path.normalize(rawDir);
          if (fs.existsSync(installDir)) {
            gamesFoundMap.set(gameId, {
              gameId,
              installDir,
              language: vals.Language || 'en-US',
            });
          }
        }
      }
    }

    // 2. Scan Windows Uninstall entries for Ubisoft games
    try {
      const uninstallEntries = findUninstallEntries(['ubisoft', 'uplay']);
      for (const entry of uninstallEntries) {
        if (entry.uninstallString && entry.uninstallString.toLowerCase().includes('uplay://uninstall/')) {
          const match = entry.uninstallString.match(/uplay:\/\/uninstall\/([0-9]+)/i);
          if (match && match[1]) {
            const gameId = match[1];
            const existing = gamesFoundMap.get(gameId) || {};
            const installDir = existing.installDir || entry.installLocation;
            if (installDir && fs.existsSync(installDir)) {
              gamesFoundMap.set(gameId, {
                ...existing,
                gameId,
                title: entry.displayName,
                installDir,
                displayIcon: entry.displayIcon,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[UbisoftAdapter] Error scanning uninstall entries:', err);
    }

    // 3. Scan local Ubisoft games folder if present
    if (root) {
      const defaultGamesDir = path.join(root, 'games');
      if (fs.existsSync(defaultGamesDir)) {
        try {
          const subfolders = fs.readdirSync(defaultGamesDir);
          for (const folder of subfolders) {
            const fullPath = path.join(defaultGamesDir, folder);
            try {
              if (fs.statSync(fullPath).isDirectory()) {
                const exe = findGameExecutable(fullPath);
                if (exe) {
                  // Check if already mapped
                  const normPath = (p) => (p ? path.normalize(p).replace(/[\\/]+$/, '').toLowerCase() : '');
                  const alreadyMapped = Array.from(gamesFoundMap.values()).some(
                    (g) => g.installDir && normPath(g.installDir) === normPath(fullPath)
                  );
                  if (!alreadyMapped) {
                    const cleanId = folder.toLowerCase().replace(/[^a-z0-9]/g, '');
                    gamesFoundMap.set(`ubi_${cleanId}`, {
                      gameId: cleanId,
                      title: folder,
                      installDir: fullPath,
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

    // Convert found entries into full game entities
    for (const [key, item] of gamesFoundMap.entries()) {
      const gameId = String(item.gameId);
      const installDir = item.installDir;

      // Ensure directory exists and has content
      if (!installDir || !fs.existsSync(installDir)) continue;

      const meta = this.getGameMetadataFromCache(gameId);
      let title = item.title || meta?.title;
      if (!title) {
        // Derive clean title from install folder basename
        title = path.basename(installDir.replace(/[\\/]+$/, ''));
      }

      // Check if folder contains valid files
      const sizeGb = calculateDirSizeGb(installDir);
      const executable = item.executable || findGameExecutable(installDir, [`${title}.exe`, 'uno.exe', 'game.exe']);

      // Look for game icon if available
      let iconUrl = '';
      if (item.displayIcon && fs.existsSync(item.displayIcon)) {
        iconUrl = `file://${item.displayIcon.replace(/\\/g, '/')}`;
      } else if (root) {
        const gameIconDir = path.join(root, 'data', 'games');
        if (fs.existsSync(gameIconDir)) {
          try {
            const icons = fs.readdirSync(gameIconDir);
            if (icons.length > 0) {
              iconUrl = `file://${path.join(gameIconDir, icons[0]).replace(/\\/g, '/')}`;
            }
          } catch {}
        }
      }

      const coverUrl = meta?.splashUrl || meta?.thumbUrl || meta?.bgUrl || iconUrl || '';
      const heroUrl = meta?.bgUrl || meta?.splashUrl || '';

      games.push({
        id: `ubi_${gameId}`,
        appId: gameId,
        title,
        tagline: 'Ubisoft Connect Title',
        description: `Installed via Ubisoft Connect at ${installDir}`,
        developer: 'Ubisoft',
        publisher: 'Ubisoft',
        releaseDate: '',
        categories: ['Ubisoft', 'Action'],
        launcher: 'Ubisoft',
        installed: true,
        installPath: installDir,
        executable: executable || undefined,
        sizeGb: sizeGb && sizeGb > 0 ? sizeGb : undefined,
        playtime: {
          totalMinutes: 0,
        },
        media: {
          coverUrl,
          heroUrl,
          logoUrl: meta?.logoUrl || '',
          iconUrl: iconUrl || coverUrl,
          screenshots: [],
        },
        achievements: [],
        friends: [],
        launchUri: `uplay://launch/${gameId}/0`,
        installUri: `uplay://install/${gameId}`,
      });
    }

    return games;
  }

  async launchGame(game) {
    const gameId = game.appId || game.id.replace('ubi_', '');
    const uri = game.launchUri || `uplay://launch/${gameId}/0`;

    try {
      await shell.openExternal(uri);
      return { success: true, uri };
    } catch (err) {
      // Fallback to executable if URI fails
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
    const gameId = game.appId || game.id.replace('ubi_', '');
    const uri = game.installUri || `uplay://install/${gameId}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = UbisoftAdapter;
