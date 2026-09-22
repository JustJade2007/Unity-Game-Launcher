const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');

class GogAdapter extends BaseAdapter {
  constructor() {
    super('GOG', 'GOG Galaxy');
    this.gogRoot = this.detectGogRoot();
    this.storageDb = 'C:\\ProgramData\\GOG.com\\Galaxy\\storage\\galaxy-2.0.db';
  }

  detectGogRoot() {
    const candidates = [
      'C:\\Program Files (x86)\\GOG Galaxy',
      'C:\\Program Files\\GOG Galaxy',
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

  async scanInstalledGames() {
    // When Galaxy is installed, games are registered in ProgramData or registry
    // Return clean empty array if none detected locally
    return [];
  }

  async launchGame(game) {
    const gameId = game.appId || game.id.replace('gog_', '');
    const uri = game.launchUri || `goggalaxy://openGameView/${gameId}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }

  async installGame(game) {
    const gameId = game.appId || game.id.replace('gog_', '');
    const uri = game.installUri || `goggalaxy://openGameView/${gameId}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = GogAdapter;
