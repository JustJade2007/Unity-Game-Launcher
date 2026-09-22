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

class EaAdapter extends BaseAdapter {
  constructor() {
    super('EA', 'EA App');
    this.clientPath = this.detectClient();
  }

  detectClient() {
    // 1. Check EA Desktop registry
    const eaRegKeys = [
      'HKLM\\SOFTWARE\\Electronic Arts\\EA Desktop',
      'HKLM\\SOFTWARE\\WOW6432Node\\Electronic Arts\\EA Desktop',
    ];
    for (const key of eaRegKeys) {
      const client = queryRegValue(key, 'ClientPath') || queryRegValue(key, 'DesktopAppPath');
      if (client && fs.existsSync(client)) return path.normalize(client);

      const loc = queryRegValue(key, 'InstallLocation');
      if (loc) {
        const full = path.join(loc, 'EA Desktop', 'EADesktop.exe');
        if (fs.existsSync(full)) return path.normalize(full);
      }
    }

    // 2. Check Origin registry
    const originKey = 'HKLM\\SOFTWARE\\WOW6432Node\\Origin';
    const originClient = queryRegValue(originKey, 'ClientPath');
    if (originClient && fs.existsSync(originClient)) return path.normalize(originClient);

    // 3. Check Windows uninstall entries
    const uninstalls = findUninstallEntries(['ea app', 'origin']);
    for (const u of uninstalls) {
      if (u.uninstallString && u.uninstallString.includes('EADesktop.exe')) {
        const match = u.uninstallString.match(/"([^"]+EADesktop\.exe)"/i) || u.uninstallString.match(/([^\s]+EADesktop\.exe)/i);
        if (match && fs.existsSync(match[1])) return path.normalize(match[1]);
      }
    }

    // 4. Default candidates
    const candidates = [
      'C:\\Program Files\\Electronic Arts\\EA Desktop\\EA Desktop\\EADesktop.exe',
      'C:\\Program Files (x86)\\Electronic Arts\\EA Desktop\\EA Desktop\\EADesktop.exe',
      'D:\\Program Files\\Electronic Arts\\EA Desktop\\EA Desktop\\EADesktop.exe',
      'C:\\Program Files (x86)\\Origin\\Origin.exe',
      'C:\\Program Files\\Origin\\Origin.exe',
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
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) return null;

    const eaDesktopDir = path.join(localAppData, 'Electronic Arts', 'EA Desktop');
    if (!fs.existsSync(eaDesktopDir)) return null;

    try {
      const files = fs.readdirSync(eaDesktopDir);
      const userInis = files.filter((f) => f.startsWith('user_') && f.endsWith('.ini'));
      for (const iniName of userInis) {
        const content = fs.readFileSync(path.join(eaDesktopDir, iniName), 'utf8');
        const userIdMatch = content.match(/user\.userid=([0-9]+)/i);
        if (userIdMatch && userIdMatch[1]) {
          return {
            id: userIdMatch[1],
            name: 'EA Player',
            accountName: userIdMatch[1],
          };
        }
      }
    } catch (err) {
      console.error('[EaAdapter] Error checking EA active account:', err);
    }

    return null;
  }

  async scanInstalledGames() {
    const games = [];
    const gamesMap = new Map();

    // 1. Scan Origin / EA Desktop LocalContent manifests
    const localContentDir = 'C:\\ProgramData\\Origin\\LocalContent';
    if (fs.existsSync(localContentDir)) {
      try {
        const folders = fs.readdirSync(localContentDir);
        for (const folder of folders) {
          const folderPath = path.join(localContentDir, folder);
          try {
            if (!fs.statSync(folderPath).isDirectory()) continue;
            const files = fs.readdirSync(folderPath);
            for (const file of files) {
              if (file.endsWith('.dat') || file.endsWith('.mfst')) {
                const fullPath = path.join(folderPath, file);
                const raw = fs.readFileSync(fullPath);
                const str = raw.toString('utf16le') + '\n' + raw.subarray(1).toString('utf16le') + '\n' + raw.toString('utf8');

                // Extract install directory
                const pathMatch = str.match(/([a-zA-Z]:\\[^:\*\?"<>\|]+)/);
                let installDir = pathMatch ? path.normalize(pathMatch[1].trim()) : null;
                if (installDir && !fs.existsSync(installDir)) {
                  installDir = null;
                }

                // Extract offer ID
                const offerMatch =
                  file.match(/Origin\.(OFR[0-9a-zA-Z\._\-]+)/i) ||
                  str.match(/(Origin\.OFR\.[0-9a-zA-Z\._\-]+)/i);
                const offerId = offerMatch ? offerMatch[1] : folder.toLowerCase().replace(/[^a-z0-9]/g, '');

                if (installDir) {
                  gamesMap.set(offerId, {
                    offerId,
                    title: folder,
                    installDir,
                  });
                }
              }
            }
          } catch {}
        }
      } catch (err) {
        console.error('[EaAdapter] Error scanning LocalContent:', err);
      }
    }

    // 2. Scan common EA Games directories across drives
    const commonEaDirs = [
      'C:\\Program Files\\EA Games',
      'C:\\Program Files (x86)\\Origin Games',
      'D:\\EA Games',
      'D:\\Origin Games',
    ];

    for (const commonDir of commonEaDirs) {
      if (fs.existsSync(commonDir)) {
        try {
          const entries = fs.readdirSync(commonDir);
          for (const sub of entries) {
            const full = path.join(commonDir, sub);
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
                    gamesMap.set(cleanId, {
                      offerId: cleanId,
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

    // Build game entries
    for (const [key, item] of gamesMap.entries()) {
      const offerId = String(item.offerId);
      const installPath = item.installDir;
      if (!installPath || !fs.existsSync(installPath)) continue;

      const sizeGb = calculateDirSizeGb(installPath);
      const executable = item.executable || findGameExecutable(installPath, [`${item.title}.exe`]);

      games.push({
        id: `ea_${offerId}`,
        appId: offerId,
        title: item.title,
        tagline: 'EA App Title',
        description: `Installed via EA App at ${installPath}`,
        developer: 'Electronic Arts',
        publisher: 'Electronic Arts',
        releaseDate: '',
        categories: ['EA', 'Action'],
        launcher: 'EA',
        installed: true,
        installPath,
        executable: executable || undefined,
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
        launchUri: `origin2://game/launch?offerIds=${offerId}`,
        installUri: `origin2://game/download?offerIds=${offerId}`,
      });
    }

    return games;
  }

  async launchGame(game) {
    const offerId = game.appId || game.id.replace('ea_', '');
    const uri = game.launchUri || `origin2://game/launch?offerIds=${offerId}`;
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
    const offerId = game.appId || game.id.replace('ea_', '');
    const uri = game.installUri || `origin2://game/download?offerIds=${offerId}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = EaAdapter;
