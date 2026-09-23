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
const { resolveGameCategories } = require('../engine/categoryService.cjs');

class EpicAdapter extends BaseAdapter {
  constructor() {
    super('Epic Games', 'Epic Games Store');
    this.manifestDir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
    this.clientPath = this.detectClient();
  }

  detectClient() {
    // 1. Check registry
    const regRoots = [
      'HKLM\\SOFTWARE\\WOW6432Node\\Epic Games\\EpicGamesLauncher',
      'HKLM\\SOFTWARE\\Epic Games\\EpicGamesLauncher',
      'HKLM\\SOFTWARE\\WOW6432Node\\EpicGames',
    ];
    for (const root of regRoots) {
      const appData = queryRegValue(root, 'AppDataPath');
      if (appData) {
        const exe = path.join(appData, '..', 'Portal', 'Binaries', 'Win64', 'EpicGamesLauncher.exe');
        if (fs.existsSync(exe)) return path.normalize(exe);
      }
    }

    // 2. Check uninstall entries
    const uninstalls = findUninstallEntries(['epic games launcher']);
    for (const u of uninstalls) {
      if (u.installLocation) {
        const exe = path.join(u.installLocation, 'Portal', 'Binaries', 'Win64', 'EpicGamesLauncher.exe');
        if (fs.existsSync(exe)) return path.normalize(exe);
      }
      if (u.displayIcon && fs.existsSync(u.displayIcon)) {
        return path.normalize(u.displayIcon);
      }
    }

    // 3. Check default paths across drives
    const defaultLauncherPaths = [
      'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
      'C:\\Program Files\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
      'D:\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
      'E:\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
    ];
    for (const p of defaultLauncherPaths) {
      if (fs.existsSync(p)) return p;
    }

    return null;
  }

  async isInstalled() {
    if (!this.clientPath) {
      this.clientPath = this.detectClient();
    }
    return Boolean(this.clientPath || fs.existsSync(this.manifestDir));
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

    const iniPath = path.join(
      localAppData,
      'EpicGamesLauncher',
      'Saved',
      'Config',
      'Windows',
      'GameUserSettings.ini'
    );
    if (fs.existsSync(iniPath)) {
      try {
        const content = fs.readFileSync(iniPath, 'utf8');
        const userMatch = content.match(/EpicAccountId=([a-f0-9]+)/i);
        if (userMatch && userMatch[1]) {
          return {
            id: userMatch[1],
            name: 'Epic Player',
            accountName: userMatch[1],
          };
        }
      } catch {}
    }

    return null;
  }

  async scanInstalledGames() {
    if (!fs.existsSync(this.manifestDir)) return [];

    const games = [];
    try {
      const files = fs.readdirSync(this.manifestDir);
      for (const file of files) {
        if (!file.endsWith('.item')) continue;

        try {
          const content = fs.readFileSync(path.join(this.manifestDir, file), 'utf8');
          const item = JSON.parse(content);

          if (!item.DisplayName || !item.InstallLocation) continue;
          if (!fs.existsSync(item.InstallLocation)) continue;

          // Skip Unreal Engine engine versions / plugins
          if (item.AppName?.startsWith('UE_') || item.CatalogItemId?.startsWith('UnrealEngine')) {
            continue;
          }

          const sizeBytes = parseInt(item.InstallSize || '0', 10);
          const sizeGb = sizeBytes > 0
            ? Math.round((sizeBytes / (1024 * 1024 * 1024)) * 10) / 10
            : calculateDirSizeGb(item.InstallLocation);
          const appName = item.AppName || item.CatalogItemId;
          const executable = item.LaunchExecutable
            ? path.join(item.InstallLocation, item.LaunchExecutable)
            : findGameExecutable(item.InstallLocation, [`${item.DisplayName}.exe`]);

          games.push({
            id: `epic_${appName}`,
            appId: appName,
            title: item.DisplayName,
            tagline: 'Epic Games Title',
            description: `Installed via Epic Games Launcher at ${item.InstallLocation}`,
            developer: 'Epic Partner',
            publisher: 'Epic Games',
            releaseDate: '',
            categories: resolveGameCategories({ title: item.DisplayName }),
            launcher: 'Epic Games',
            installed: true,
            installPath: item.InstallLocation,
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
            launchUri: `com.epicgames.launcher://apps/${appName}?action=launch&silent=true`,
            installUri: `com.epicgames.launcher://apps/${appName}?action=install`,
          });
        } catch (err) {
          console.error(`[EpicAdapter] Error parsing item ${file}:`, err);
        }
      }
    } catch (err) {
      console.error('[EpicAdapter] Error reading manifests:', err);
    }

    return games;
  }

  async launchGame(game) {
    const uri =
      game.launchUri ||
      `com.epicgames.launcher://apps/${game.appId || game.id.replace('epic_', '')}?action=launch&silent=true`;
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
    const uri =
      game.installUri ||
      `com.epicgames.launcher://apps/${game.appId || game.id.replace('epic_', '')}?action=install`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = EpicAdapter;
