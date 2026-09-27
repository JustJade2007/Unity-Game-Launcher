/**
 * BaseAdapter
 * Abstract contract for native platform launcher adapters.
 */
class BaseAdapter {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  getId() {
    return this.id;
  }

  getName() {
    return this.name;
  }

  /**
   * Determine if the launcher desktop client is installed on this machine.
   * @returns {Promise<boolean>}
   */
  async isInstalled() {
    return false;
  }

  /**
   * Returns path to the launcher client executable if found.
   * @returns {Promise<string|null>}
   */
  async getClientPath() {
    return null;
  }

  /**
   * Get active logged in account or profile details.
   * @returns {Promise<{ id?: string, name?: string }|null>}
   */
  async getActiveAccount() {
    return null;
  }

  /**
   * Scan locally installed games on disk.
   * @returns {Promise<Array<any>>}
   */
  async scanInstalledGames() {
    return [];
  }

  /**
   * Scan owned games from platform cloud/API (including uninstalled titles).
   * @param {object} _options
   * @returns {Promise<Array<any>>}
   */
  async scanOwnedGames(_options = {}) {
    return [];
  }

  /**
   * Launch a game via native protocol URI or executable.
   * @param {object} game
   * @returns {Promise<{ success: boolean, uri?: string, pid?: number, error?: string }>}
   */
  async launchGame(game) {
    throw new Error(`launchGame not implemented for ${this.name}`);
  }

  /**
   * Trigger native installation for an uninstalled title.
   * @param {object} game
   * @returns {Promise<{ success: boolean, uri?: string, error?: string }>}
   */
  async installGame(game) {
    throw new Error(`installGame not implemented for ${this.name}`);
  }

  /**
   * Fetch achievements for a specific game title.
   * @param {string} _appId
   * @param {object} _options
   * @returns {Promise<Array<any>>}
   */
  async fetchAchievements(_appId, _options = {}) {
    return [];
  }
}

module.exports = BaseAdapter;
