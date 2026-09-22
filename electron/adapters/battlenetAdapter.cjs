const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');

class BattleNetAdapter extends BaseAdapter {
  constructor() {
    super('Battle.net', 'Battle.net');
    this.clientPath = this.detectClient();
  }

  detectClient() {
    const candidates = [
      'C:\\Program Files (x86)\\Battle.net\\Battle.net.exe',
      'C:\\Program Files\\Battle.net\\Battle.net.exe',
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
    const gameCode = game.appId || game.id.replace('bnet_', '');
    const uri = game.launchUri || `battlenet://${gameCode}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }

  async installGame(game) {
    const gameCode = game.appId || game.id.replace('bnet_', '');
    const uri = game.installUri || `battlenet://${gameCode}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = BattleNetAdapter;
