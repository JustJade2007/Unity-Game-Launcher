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

const KNOWN_EA_GAMES = [
  {
    offerId: '1035052',
    altOfferIds: ['Origin.OFR.50.0002015', 'Origin.OFR.50.0003794', 'starwarsbattlefrontii', 'swbfii'],
    title: 'STAR WARS™ Battlefront™ II',
    folderNames: ['STAR WARS Battlefront II', 'STAR WARS™ Battlefront™ II', 'Battlefront II'],
    steamAppId: '1237950',
    developer: 'DICE',
    publisher: 'Electronic Arts',
    categories: ['EA', 'Action', 'Shooter', 'Sci-Fi'],
    exeNames: ['starwarsbattlefrontii.exe', 'starwarsbattlefrontii_trial.exe'],
  },
  {
    offerId: '1028663',
    altOfferIds: ['Origin.OFR.50.0002694', 'jedifallenorder'],
    title: 'STAR WARS Jedi: Fallen Order™',
    folderNames: ['Jedi Fallen Order', 'STAR WARS Jedi Fallen Order', 'STAR WARS Jedi: Fallen Order™'],
    steamAppId: '1172380',
    developer: 'Respawn Entertainment',
    publisher: 'Electronic Arts',
    categories: ['EA', 'Action', 'Adventure', 'Sci-Fi'],
    exeNames: ['starwarsjedifallenorder.exe'],
  },
  {
    offerId: '196485',
    altOfferIds: ['Origin.OFR.50.0003794', 'Origin.OFR.50.0004554', 'jedisurvivor'],
    title: 'STAR WARS Jedi: Survivor™',
    folderNames: ['Jedi Survivor', 'STAR WARS Jedi: Survivor™'],
    steamAppId: '1774580',
    developer: 'Respawn Entertainment',
    publisher: 'Electronic Arts',
    categories: ['EA', 'Action', 'Adventure', 'Sci-Fi'],
    exeNames: ['JediSurvivor.exe'],
  },
  {
    offerId: 'awayout',
    altOfferIds: ['Origin.OFR.50.0002447', '1027170'],
    title: 'A Way Out',
    folderNames: ['AWayOut', 'A Way Out'],
    steamAppId: '1222700',
    developer: 'Hazelight Studios',
    publisher: 'Electronic Arts',
    categories: ['EA', 'Action', 'Adventure', 'Co-op'],
    exeNames: ['AWayOut.exe'],
  },
  {
    offerId: 'thesims4',
    altOfferIds: ['Origin.OFR.50.0000557', '1011164', '1027140'],
    title: 'The Sims™ 4',
    folderNames: ['The Sims 4', 'TheSims4'],
    steamAppId: '1222670',
    developer: 'Maxis',
    publisher: 'Electronic Arts',
    categories: ['EA', 'Simulation', 'Casual'],
    exeNames: ['TS4_x64.exe', 'TS4.exe'],
  },
  {
    offerId: 'apexlegends',
    altOfferIds: ['Origin.OFR.50.0002694'],
    title: 'Apex Legends™',
    folderNames: ['Apex', 'Apex Legends'],
    steamAppId: '1172470',
    developer: 'Respawn Entertainment',
    publisher: 'Electronic Arts',
    categories: ['EA', 'Action', 'Battle Royale', 'FPS'],
    exeNames: ['r5apex.exe'],
  },
  {
    offerId: 'titanfall2',
    altOfferIds: ['Origin.OFR.50.0001452', '1016719'],
    title: 'Titanfall® 2',
    folderNames: ['Titanfall2', 'Titanfall 2'],
    steamAppId: '1237970',
    developer: 'Respawn Entertainment',
    publisher: 'Electronic Arts',
    categories: ['EA', 'Action', 'Shooter', 'Sci-Fi', 'FPS'],
    exeNames: ['Titanfall2.exe'],
  },
  {
    offerId: 'masseffectlegendary',
    altOfferIds: ['Origin.OFR.50.0004245', '1035848'],
    title: 'Mass Effect™ Legendary Edition',
    folderNames: ['Mass Effect Legendary Edition'],
    steamAppId: '1328670',
    developer: 'BioWare',
    publisher: 'Electronic Arts',
    categories: ['EA', 'RPG', 'Sci-Fi', 'Action'],
    exeNames: ['MassEffectLauncher.exe'],
  },
  {
    offerId: 'battlefield2042',
    altOfferIds: ['Origin.OFR.50.0004495', '1035619'],
    title: 'Battlefield™ 2042',
    folderNames: ['Battlefield 2042'],
    steamAppId: '1517290',
    developer: 'DICE',
    publisher: 'Electronic Arts',
    categories: ['EA', 'Action', 'Shooter', 'FPS', 'Multiplayer'],
    exeNames: ['BF2042.exe'],
  },
];

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

    const searchRoots = [
      'C:\\Program Files\\EA Games',
      'C:\\Program Files (x86)\\Origin Games',
      'D:\\EA Games',
      'D:\\Origin Games',
      'C:\\Program Files (x86)\\Steam\\steamapps\\common',
      'D:\\SteamLibrary\\steamapps\\common',
      'C:\\Games',
      'D:\\Games',
    ];

    // 1. Check known EA games across all candidate search roots
    for (const known of KNOWN_EA_GAMES) {
      for (const root of searchRoots) {
        if (!fs.existsSync(root)) continue;
        for (const fName of known.folderNames) {
          const dir = path.join(root, fName);
          if (fs.existsSync(dir)) {
            const exe = findGameExecutable(dir, known.exeNames);
            if (exe) {
              const sizeGb = calculateDirSizeGb(dir);
              gamesMap.set(known.offerId, {
                offerId: known.offerId,
                title: known.title,
                installDir: dir,
                executable: exe,
                sizeGb,
                known,
              });
              break;
            }
          }
        }
        if (gamesMap.has(known.offerId)) break;
      }
    }

    // 2. Scan Origin / EA Desktop LocalContent manifests
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
                let exe = null;
                if (installDir && fs.existsSync(installDir)) {
                  exe = findGameExecutable(installDir);
                } else {
                  installDir = null;
                }

                const offerMatch =
                  file.match(/Origin\.(OFR[0-9a-zA-Z\._\-]+)/i) ||
                  str.match(/(Origin\.OFR\.[0-9a-zA-Z\._\-]+)/i);
                const offerId = offerMatch ? offerMatch[1] : folder.toLowerCase().replace(/[^a-z0-9]/g, '');

                const known = KNOWN_EA_GAMES.find(
                  (k) =>
                    k.offerId === offerId ||
                    k.altOfferIds?.includes(offerId) ||
                    k.folderNames.some((n) => n.toLowerCase() === folder.toLowerCase())
                );

                if (installDir && exe) {
                  gamesMap.set(offerId, {
                    offerId,
                    title: known?.title || folder,
                    installDir,
                    executable: exe,
                    known,
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

    // Build game entries
    for (const [key, item] of gamesMap.entries()) {
      const offerId = String(item.offerId);
      const installPath = item.installDir;
      if (!installPath || !fs.existsSync(installPath)) continue;

      const known = item.known;
      const sizeGb = item.sizeGb || calculateDirSizeGb(installPath);
      const executable = item.executable || findGameExecutable(installPath, [`${item.title}.exe`]);

      const steamAppId = known?.steamAppId;
      const coverUrl = steamAppId
        ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_600x900.jpg`
        : '';
      const heroUrl = steamAppId
        ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_hero.jpg`
        : '';
      const logoUrl = steamAppId
        ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/logo.png`
        : '';

      games.push({
        id: `ea_${offerId}`,
        appId: offerId,
        title: item.title,
        tagline: 'EA App Title',
        description: `Installed via EA App at ${installPath}`,
        developer: known?.developer || 'Electronic Arts',
        publisher: known?.publisher || 'Electronic Arts',
        releaseDate: '',
        categories: known?.categories || ['EA', 'Action'],
        launcher: 'EA',
        installed: true,
        installPath,
        executable: executable || undefined,
        sizeGb: sizeGb && sizeGb > 0 ? sizeGb : undefined,
        playtime: {
          totalMinutes: 0,
        },
        media: {
          coverUrl,
          heroUrl,
          logoUrl,
          iconUrl: coverUrl,
          screenshots: heroUrl ? [heroUrl] : [],
        },
        achievements: [],
        friends: [],
        launchUri: `origin2://game/launch?offerIds=${offerId}`,
        installUri: `origin2://game/download?offerIds=${offerId}`,
        ownershipSources: [
          {
            launcher: 'EA',
            gameId: offerId,
            installed: true,
            installPath,
            launchUri: `origin2://game/launch?offerIds=${offerId}`,
            installUri: `origin2://game/download?offerIds=${offerId}`,
          },
        ],
      });
    }

    return games;
  }

  /**
   * Scan owned and played EA titles from LocalContent manifests, sync state, and catalog references.
   * @returns {Promise<Array<object>>}
   */
  async scanOwnedGames() {
    const ownedMap = new Map();

    // 1. Scan LocalContent directory folders
    const localContentDir = 'C:\\ProgramData\\Origin\\LocalContent';
    if (fs.existsSync(localContentDir)) {
      try {
        const folders = fs.readdirSync(localContentDir);
        for (const folder of folders) {
          const folderPath = path.join(localContentDir, folder);
          if (!fs.statSync(folderPath).isDirectory()) continue;

          let foundOfferId = null;
          try {
            const files = fs.readdirSync(folderPath);
            for (const f of files) {
              if (f.endsWith('.dat') || f.endsWith('.mfst')) {
                const match = f.match(/Origin\.(OFR[0-9a-zA-Z\._\-]+)/i);
                if (match) {
                  foundOfferId = match[1];
                  break;
                }
              }
            }
          } catch {}

          const known = KNOWN_EA_GAMES.find(
            (k) =>
              (foundOfferId && (k.offerId === foundOfferId || k.altOfferIds?.includes(foundOfferId))) ||
              k.folderNames.some((n) => n.toLowerCase() === folder.toLowerCase())
          );

          const offerId = known?.offerId || foundOfferId || folder.toLowerCase().replace(/[^a-z0-9]/g, '');
          ownedMap.set(offerId, {
            offerId,
            title: known?.title || folder,
            known,
          });
        }
      } catch (err) {
        console.warn('[EaAdapter] Error reading LocalContent for owned games:', err);
      }
    }

    // 2. Scan cloudsync files in AppData/Local/Electronic Arts/EA Desktop/cloudsync
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const cloudSyncDir = path.join(localAppData, 'Electronic Arts', 'EA Desktop', 'cloudsync');
      if (fs.existsSync(cloudSyncDir)) {
        try {
          const files = fs.readdirSync(cloudSyncDir);
          for (const f of files) {
            const m = f.match(/^[0-9]+_([0-9a-zA-Z]+)\.lastsync$/i);
            if (m && m[1]) {
              const syncOfferId = m[1];
              const known = KNOWN_EA_GAMES.find(
                (k) => k.offerId === syncOfferId || k.altOfferIds?.includes(syncOfferId)
              );
              if (known) {
                ownedMap.set(known.offerId, {
                  offerId: known.offerId,
                  title: known.title,
                  known,
                });
              }
            }
          }
        } catch {}
      }
    }

    // 3. Scan user last launched offer ID from user_*.ini
    if (localAppData) {
      const eaDir = path.join(localAppData, 'Electronic Arts', 'EA Desktop');
      if (fs.existsSync(eaDir)) {
        try {
          const files = fs.readdirSync(eaDir);
          const inis = files.filter((f) => f.startsWith('user_') && f.endsWith('.ini'));
          for (const ini of inis) {
            const content = fs.readFileSync(path.join(eaDir, ini), 'utf8');
            const m = content.match(/user\.lastgamelaunched\.offerid=([0-9a-zA-Z\._\-]+)/i);
            if (m && m[1]) {
              const rawOffer = m[1];
              const known = KNOWN_EA_GAMES.find(
                (k) => k.offerId === rawOffer || k.altOfferIds?.includes(rawOffer)
              );
              if (known) {
                ownedMap.set(known.offerId, {
                  offerId: known.offerId,
                  title: known.title,
                  known,
                });
              }
            }
          }
        } catch {}
      }
    }

    // Check installed games to merge installed state
    const installed = await this.scanInstalledGames();
    const installedMap = new Map();
    for (const g of installed) {
      const off = g.appId || g.id.replace('ea_', '');
      installedMap.set(off, g);
      if (!ownedMap.has(off)) {
        const known = KNOWN_EA_GAMES.find((k) => k.offerId === off || k.altOfferIds?.includes(off));
        ownedMap.set(off, {
          offerId: off,
          title: g.title,
          known,
        });
      }
    }

    const searchRoots = [
      'C:\\Program Files\\EA Games',
      'C:\\Program Files (x86)\\Origin Games',
      'D:\\EA Games',
      'D:\\Origin Games',
      'C:\\Program Files (x86)\\Steam\\steamapps\\common',
      'D:\\SteamLibrary\\steamapps\\common',
      'C:\\Games',
      'D:\\Games',
    ];

    const results = [];
    for (const [offerId, entry] of ownedMap.entries()) {
      const known = entry.known;
      const title = known?.title || entry.title;
      const inst = installedMap.get(offerId);

      let isInstalled = Boolean(inst);
      let installPath = inst?.installPath;
      let executable = inst?.executable;
      let sizeGb = inst?.sizeGb;

      if (!isInstalled && known?.folderNames) {
        for (const root of searchRoots) {
          if (!fs.existsSync(root)) continue;
          for (const fName of known.folderNames) {
            const dir = path.join(root, fName);
            if (fs.existsSync(dir)) {
              const exe = findGameExecutable(dir, known.exeNames);
              if (exe) {
                isInstalled = true;
                installPath = dir;
                executable = exe;
                sizeGb = calculateDirSizeGb(dir);
                break;
              }
            }
          }
          if (isInstalled) break;
        }
      }

      const steamAppId = known?.steamAppId;
      const coverUrl = steamAppId
        ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_600x900.jpg`
        : '';
      const heroUrl = steamAppId
        ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_hero.jpg`
        : '';
      const logoUrl = steamAppId
        ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/logo.png`
        : '';

      results.push({
        id: `ea_${offerId}`,
        appId: offerId,
        title,
        tagline: 'EA App Title',
        description: isInstalled
          ? `Installed via EA App at ${installPath}`
          : 'Owned in EA App library',
        developer: known?.developer || 'Electronic Arts',
        publisher: known?.publisher || 'Electronic Arts',
        releaseDate: '',
        categories: known?.categories || ['EA', 'Action'],
        launcher: 'EA',
        installed: isInstalled,
        installPath: installPath || undefined,
        executable: executable || undefined,
        sizeGb: sizeGb && sizeGb > 0 ? sizeGb : undefined,
        playtime: {
          totalMinutes: 0,
        },
        media: {
          coverUrl,
          heroUrl,
          logoUrl,
          iconUrl: coverUrl,
          screenshots: heroUrl ? [heroUrl] : [],
        },
        achievements: [],
        friends: [],
        launchUri: `origin2://game/launch?offerIds=${offerId}`,
        installUri: `origin2://game/download?offerIds=${offerId}`,
        ownershipSources: [
          {
            launcher: 'EA',
            gameId: offerId,
            installed: isInstalled,
            installPath: installPath || undefined,
            launchUri: `origin2://game/launch?offerIds=${offerId}`,
            installUri: `origin2://game/download?offerIds=${offerId}`,
          },
        ],
      });
    }

    return results;
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
