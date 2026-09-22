const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');
const { calculateDirSizeGb, findGameExecutable } = require('./registryHelper.cjs');

class XboxAdapter extends BaseAdapter {
  constructor() {
    super('Xbox', 'Xbox App / Windows Store');
  }

  async isInstalled() {
    // Windows 10/11 includes Microsoft Store / Xbox gaming services natively
    return process.platform === 'win32';
  }

  async getClientPath() {
    return 'xbox:';
  }

  async getActiveAccount() {
    return {
      id: 'xbox_user',
      name: 'Xbox Player',
      accountName: 'Xbox Player',
    };
  }

  async scanInstalledGames() {
    const games = [];
    const searchDirs = [
      'C:\\XboxGames',
      'D:\\XboxGames',
      'E:\\XboxGames',
    ];

    for (const baseDir of searchDirs) {
      if (!fs.existsSync(baseDir)) continue;
      try {
        const entries = fs.readdirSync(baseDir);
        for (const sub of entries) {
          if (sub.toLowerCase() === 'gamesave') continue;
          const fullPath = path.join(baseDir, sub);
          try {
            if (fs.statSync(fullPath).isDirectory()) {
              const exe = findGameExecutable(fullPath, [
                'Content\\gamelaunchhelper.exe',
                'gamelaunchhelper.exe',
                'Minecraft.exe',
              ]);
              const sizeGb = calculateDirSizeGb(fullPath);
              const cleanId = sub.toLowerCase().replace(/[^a-z0-9]/g, '');

              games.push({
                id: `xbox_${cleanId}`,
                appId: cleanId,
                title: sub,
                tagline: 'Xbox Title',
                description: `Installed via Xbox / Microsoft Store at ${fullPath}`,
                developer: 'Xbox Partner',
                publisher: 'Xbox Game Studios',
                releaseDate: '',
                categories: ['Xbox', 'Action'],
                launcher: 'Xbox',
                installed: true,
                installPath: fullPath,
                executable: exe || undefined,
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
                launchUri: `xbox:`,
                installUri: `ms-windows-store://search/?query=${encodeURIComponent(sub)}`,
              });
            }
          } catch {}
        }
      } catch (err) {
        console.error(`[XboxAdapter] Error scanning ${baseDir}:`, err);
      }
    }

    return games;
  }

  async launchGame(game) {
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

    const uri = game.launchUri || `xbox:`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }

  async installGame(game) {
    const productId = game.appId || game.id.replace('xbox_', '');
    const uri = game.installUri || `ms-windows-store://pdp/?ProductId=${productId}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = XboxAdapter;
