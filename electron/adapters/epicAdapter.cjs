const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');

class EpicAdapter extends BaseAdapter {
  constructor() {
    super('Epic Games', 'Epic Games Store');
    this.manifestDir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
  }

  async isInstalled() {
    const defaultLauncherPaths = [
      'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
      'C:\\Program Files\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
    ];
    for (const p of defaultLauncherPaths) {
      if (fs.existsSync(p)) return true;
    }
    return fs.existsSync(this.manifestDir);
  }

  async getClientPath() {
    const defaultLauncherPaths = [
      'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
      'C:\\Program Files\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
    ];
    for (const p of defaultLauncherPaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  async getActiveAccount() {
    // Epic accounts are typically token-based in LocalAppData
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

          // Skip Unreal Engine engine versions / plugins
          if (item.AppName?.startsWith('UE_') || item.CatalogItemId?.startsWith('UnrealEngine')) {
            continue;
          }

          const sizeBytes = parseInt(item.InstallSize || '0', 10);
          const sizeGb = Math.round((sizeBytes / (1024 * 1024 * 1024)) * 10) / 10;
          const appName = item.AppName || item.CatalogItemId;

          games.push({
            id: `epic_${appName}`,
            appId: appName,
            title: item.DisplayName,
            tagline: 'Epic Games Title',
            description: `Installed via Epic Games Launcher at ${item.InstallLocation}`,
            developer: 'Epic Partner',
            publisher: 'Epic Games',
            releaseDate: '',
            categories: ['Epic Games', 'Action'],
            launcher: 'Epic Games',
            installed: true,
            installPath: item.InstallLocation,
            sizeGb: sizeGb > 0 ? sizeGb : undefined,
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
    const uri = game.launchUri || `com.epicgames.launcher://apps/${game.appId || game.id.replace('epic_', '')}?action=launch&silent=true`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }

  async installGame(game) {
    const uri = game.installUri || `com.epicgames.launcher://apps/${game.appId || game.id.replace('epic_', '')}?action=install`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = EpicAdapter;
