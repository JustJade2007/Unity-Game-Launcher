const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');

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

  async scanInstalledGames() {
    return [];
  }

  async launchGame(game) {
    const uri = game.launchUri || `xbox://`;
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
