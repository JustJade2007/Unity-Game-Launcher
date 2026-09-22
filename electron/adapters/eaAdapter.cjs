const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');

class EaAdapter extends BaseAdapter {
  constructor() {
    super('EA', 'EA App');
    this.clientPath = this.detectClient();
  }

  detectClient() {
    const candidates = [
      'C:\\Program Files\\Electronic Arts\\EA Desktop\\EA Desktop\\EADesktop.exe',
      'C:\\Program Files (x86)\\Electronic Arts\\EA Desktop\\EA Desktop\\EADesktop.exe',
      'C:\\Program Files (x86)\\Origin\\Origin.exe',
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
    const offerId = game.appId || game.id.replace('ea_', '');
    const uri = game.launchUri || `origin2://game/launch?offerIds=${offerId}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }

  async installGame(game) {
    const offerId = game.appId || game.id.replace('ea_', '');
    const uri = game.installUri || `origin2://game/download?offerIds=${offerId}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = EaAdapter;
