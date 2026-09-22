const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');

class UbisoftAdapter extends BaseAdapter {
  constructor() {
    super('Ubisoft', 'Ubisoft Connect');
    this.clientPath = this.detectClient();
  }

  detectClient() {
    const candidates = [
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\UbisoftConnect.exe',
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\Uplay.exe',
      'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher\\UbisoftConnect.exe',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  async isInstalled() {
    return Boolean(this.clientPath);
  }

  async getClientPath() {
    return this.clientPath;
  }

  async scanInstalledGames() {
    return [];
  }

  async launchGame(game) {
    const gameId = game.appId || game.id.replace('ubi_', '');
    const uri = game.launchUri || `uplay://launch/${gameId}/0`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }

  async installGame(game) {
    const gameId = game.appId || game.id.replace('ubi_', '');
    const uri = game.installUri || `uplay://install/${gameId}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = UbisoftAdapter;
