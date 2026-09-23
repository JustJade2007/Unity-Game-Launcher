const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');
const {
  queryRegValue,
  queryRegSubkeys,
  queryRegKeyValues,
  findUninstallEntries,
  calculateDirSizeGb,
  findGameExecutable,
} = require('./registryHelper.cjs');
const { resolveGameCategories } = require('../engine/categoryService.cjs');

// Comprehensive mapping of known Ubisoft product IDs to game metadata & Steam App IDs
const KNOWN_UBI_GAMES = [
  {
    uplayId: '1843',
    altIds: ['635', '54'],
    title: "Tom Clancy's Rainbow Six Siege",
    steamAppId: '359550',
    icon: 'a9864cb57ce30ae81f4fa0b970ee8654.ico',
    exeNames: ['RainbowSix.exe', 'RainbowSix_Vulkan.exe', 'RainbowSix_DX11.exe'],
    relativeDirs: ["Tom Clancy's Rainbow Six Siege"],
  },
  {
    uplayId: '541',
    altIds: ['274'],
    title: 'Watch_Dogs',
    steamAppId: '243470',
    icon: '582992d92699fe3425e2c8b3d08d1541.ico',
    exeNames: ['watch_dogs.exe', 'Watch_Dogs.exe'],
    relativeDirs: ['Watch_Dogs', 'Watch Dogs'],
  },
  {
    uplayId: '3619',
    altIds: ['2688'],
    title: 'Watch_Dogs 2',
    steamAppId: '447040',
    icon: 'ac7fdc1bf1a426a1da46ffa06cfaf9c4.ico',
    exeNames: ['WatchDogs2.exe'],
    relativeDirs: ['Watch_Dogs2', 'Watch_Dogs 2', 'Watch Dogs 2'],
  },
  {
    uplayId: '3353',
    altIds: ['11903'],
    title: 'Watch Dogs: Legion',
    steamAppId: '2239550',
    icon: '287cd69cd0b782cdbdb1014d3a47c27c.ico',
    exeNames: ['WatchDogsLegion.exe'],
    relativeDirs: ['Watch Dogs Legion', 'Watch Dogs Legion of the Dead'],
  },
  {
    uplayId: '62412',
    altIds: [],
    title: "Tom Clancy's Ghost Recon Breakpoint",
    steamAppId: '2231380',
    icon: 'f9f35468fba58e84ccfb0af550503186.ico',
    exeNames: ['GRB.exe', 'GRB_vulkan.exe'],
    relativeDirs: ["Ghost Recon Breakpoint", "Tom Clancy's Ghost Recon Breakpoint"],
  },
  {
    uplayId: '3352',
    altIds: [],
    title: 'UNO',
    steamAppId: '470220',
    icon: '3e71665ae92b94b9e9d7adac07d831a5.ico',
    exeNames: ['uno.exe', 'UNO.exe'],
    relativeDirs: ['UNO'],
  },
  {
    uplayId: '10424',
    altIds: ['4865'],
    title: "Tom Clancy's Rainbow Six Siege - Test Server",
    steamAppId: '623990',
    icon: 'a9864cb57ce30ae81f4fa0b970ee8654.ico',
    exeNames: ['RainbowSix.exe'],
    relativeDirs: ["Tom Clancy's Rainbow Six Siege - Test Server"],
  },
  {
    uplayId: '3175',
    altIds: [],
    title: 'Star Trek: Bridge Crew',
    steamAppId: '527100',
    icon: '',
    exeNames: ['BridgeCrew.exe'],
    relativeDirs: ['Star Trek Bridge Crew'],
  },
];

class UbisoftAdapter extends BaseAdapter {
  constructor() {
    super('Ubisoft', 'Ubisoft Connect');
    this.ubiRoot = this.detectUbiRoot();
    this.clientPath = this.detectClient();
  }

  detectUbiRoot() {
    // 1. Check registry entries
    const regKeys = [
      'HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher',
      'HKLM\\SOFTWARE\\Ubisoft\\Launcher',
      'HKCU\\Software\\Ubisoft\\Launcher',
    ];
    for (const key of regKeys) {
      const val = queryRegValue(key, 'InstallDir');
      if (val && fs.existsSync(val)) {
        return path.normalize(val);
      }
    }

    // 2. Check uninstall entries
    const uninstalls = findUninstallEntries(['ubisoft connect', 'uplay']);
    for (const entry of uninstalls) {
      if (entry.installLocation && fs.existsSync(entry.installLocation)) {
        return path.normalize(entry.installLocation);
      }
    }

    // 3. Common path fallbacks across drives
    const candidates = [
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher',
      'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher',
      'D:\\Ubisoft\\Ubisoft Game Launcher',
      'D:\\Games\\Ubisoft\\Ubisoft Game Launcher',
      'E:\\Ubisoft\\Ubisoft Game Launcher',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }

    return null;
  }

  detectClient() {
    const root = this.ubiRoot || this.detectUbiRoot();
    if (root) {
      const exeNames = [
        'UbisoftConnect.exe',
        'upc.exe',
        'Uplay.exe',
        'UbisoftGameLauncher64.exe',
        'UbisoftGameLauncher.exe',
      ];
      for (const exe of exeNames) {
        const full = path.join(root, exe);
        if (fs.existsSync(full)) return full;
      }
    }

    // Fallbacks
    const fallbackExes = [
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\UbisoftConnect.exe',
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\upc.exe',
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\Uplay.exe',
      'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher\\UbisoftConnect.exe',
    ];
    for (const p of fallbackExes) {
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
    const root = this.ubiRoot || this.detectUbiRoot();
    if (!root) return null;

    // Check savegames directory for user UUIDs
    try {
      const savegamesDir = path.join(root, 'savegames');
      if (fs.existsSync(savegamesDir)) {
        const entries = fs.readdirSync(savegamesDir);
        const validUids = entries.filter((name) => {
          try {
            return (
              fs.statSync(path.join(savegamesDir, name)).isDirectory() &&
              name.length > 8 &&
              !name.startsWith('.')
            );
          } catch {
            return false;
          }
        });

        if (validUids.length > 0) {
          return {
            id: validUids[0],
            name: 'Ubisoft User',
            accountName: validUids[0],
          };
        }
      }
    } catch (err) {
      console.error('[UbisoftAdapter] Error getting active account from savegames:', err);
    }

    // Check launcher log for User: <uuid>
    try {
      const logFile = path.join(root, 'logs', 'launcher_log.txt');
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf8');
        const match = content.match(/User:\s*([a-f0-9\-]{16,})/i);
        if (match && match[1]) {
          return {
            id: match[1],
            name: 'Ubisoft User',
            accountName: match[1],
          };
        }
      }
    } catch {}

    return null;
  }

  getGameMetadataFromCache(gameId) {
    const root = this.ubiRoot || this.detectUbiRoot();
    if (!root) return null;

    const confPath = path.join(root, 'cache', 'configuration', 'configurations');
    if (!fs.existsSync(confPath)) return null;

    try {
      const content = fs.readFileSync(confPath, 'utf8');
      const searchTargetWin = `Installs\\${gameId}\\InstallDir`;
      const searchTargetPosix = `Installs/${gameId}/InstallDir`;
      let targetIdx = content.indexOf(searchTargetWin);
      if (targetIdx === -1) {
        targetIdx = content.indexOf(searchTargetPosix);
      }
      if (targetIdx === -1) {
        targetIdx = content.indexOf(`override_uplayid: ${gameId}`);
      }
      if (targetIdx === -1) return null;

      const blockStart = Math.max(0, content.lastIndexOf('root:', targetIdx));
      const block = content.slice(blockStart, targetIdx + searchTargetWin.length + 600);

      const nameMatch = block.match(/^\s*name:\s*"?([^"\r\n]+)"?/m);
      const bgMatch = block.match(/^\s*background_image:\s*([^\r\n]+)/m);
      const thumbMatch = block.match(/^\s*thumb_image:\s*([^\r\n]+)/m);
      const splashMatch = block.match(/^\s*splash_image:\s*([^\r\n]+)/m);
      const logoMatch = block.match(/^\s*logo_image:\s*([^\r\n]+)/m);
      const iconMatch = block.match(/^\s*icon_image:\s*([^\r\n]+)/m);

      const assetsDir = path.join(root, 'cache', 'assets');
      const resolveAsset = (fileName) => {
        if (!fileName) return '';
        const full = path.join(assetsDir, fileName);
        return fs.existsSync(full) ? `file://${full.replace(/\\/g, '/')}` : '';
      };

      let iconUrl = '';
      if (iconMatch && iconMatch[1]) {
        const localIconPath = path.join(root, 'data', 'games', iconMatch[1].trim());
        if (fs.existsSync(localIconPath)) {
          iconUrl = `file:///${localIconPath.replace(/\\/g, '/')}`;
        }
      }

      return {
        title: nameMatch ? nameMatch[1].trim() : null,
        bgUrl: resolveAsset(bgMatch ? bgMatch[1].trim() : null),
        thumbUrl: resolveAsset(thumbMatch ? thumbMatch[1].trim() : null),
        splashUrl: resolveAsset(splashMatch ? splashMatch[1].trim() : null),
        logoUrl: resolveAsset(logoMatch ? logoMatch[1].trim() : null),
        iconUrl,
      };
    } catch {
      return null;
    }
  }

  async scanInstalledGames() {
    const root = this.ubiRoot || this.detectUbiRoot();
    const gamesFoundMap = new Map();

    // 1. Scan Installs Registry
    const installRoots = [
      'HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs',
      'HKLM\\SOFTWARE\\Ubisoft\\Launcher\\Installs',
      'HKCU\\Software\\Ubisoft\\Launcher\\Installs',
    ];

    for (const regRoot of installRoots) {
      const subkeys = queryRegSubkeys(regRoot);
      for (const sub of subkeys) {
        const gameId = sub.split('\\').pop();
        if (!gameId || isNaN(Number(gameId))) continue;

        const vals = queryRegKeyValues(sub);
        if (vals.InstallDir) {
          const rawDir = vals.InstallDir.replace(/\//g, '\\');
          const installDir = path.normalize(rawDir);
          if (fs.existsSync(installDir)) {
            gamesFoundMap.set(gameId, {
              gameId,
              installDir,
              language: vals.Language || 'en-US',
            });
          }
        }
      }
    }

    // 2. Scan Windows Uninstall entries for Ubisoft games
    try {
      const uninstallEntries = findUninstallEntries(['ubisoft', 'uplay']);
      for (const entry of uninstallEntries) {
        if (entry.uninstallString && entry.uninstallString.toLowerCase().includes('uplay://uninstall/')) {
          const match = entry.uninstallString.match(/uplay:\/\/uninstall\/([0-9]+)/i);
          if (match && match[1]) {
            const gameId = match[1];
            const existing = gamesFoundMap.get(gameId) || {};
            const installDir = existing.installDir || entry.installLocation;
            if (installDir && fs.existsSync(installDir)) {
              gamesFoundMap.set(gameId, {
                ...existing,
                gameId,
                title: entry.displayName,
                installDir,
                displayIcon: entry.displayIcon,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[UbisoftAdapter] Error scanning uninstall entries:', err);
    }

    // 3. Scan local Ubisoft games folder if present
    if (root) {
      const defaultGamesDir = path.join(root, 'games');
      if (fs.existsSync(defaultGamesDir)) {
        try {
          const subfolders = fs.readdirSync(defaultGamesDir);
          for (const folder of subfolders) {
            const fullPath = path.join(defaultGamesDir, folder);
            try {
              if (fs.statSync(fullPath).isDirectory()) {
                const exe = findGameExecutable(fullPath);
                if (exe) {
                  const normPath = (p) => (p ? path.normalize(p).replace(/[\\/]+$/, '').toLowerCase() : '');
                  const alreadyMapped = Array.from(gamesFoundMap.values()).some(
                    (g) => g.installDir && normPath(g.installDir) === normPath(fullPath)
                  );
                  if (!alreadyMapped) {
                    const cleanId = folder.toLowerCase().replace(/[^a-z0-9]/g, '');
                    gamesFoundMap.set(`ubi_${cleanId}`, {
                      gameId: cleanId,
                      title: folder,
                      installDir: fullPath,
                      executable: exe,
                    });
                  }
                }
              }
            } catch {}
          }
        } catch {}
      }
    }

    // 4. Check known Ubisoft games in common install directories across drives
    const commonSearchDirs = [
      'C:\\Program Files (x86)\\Steam\\steamapps\\common',
      'C:\\Program Files\\Steam\\steamapps\\common',
      'D:\\SteamLibrary\\steamapps\\common',
      'D:\\Games\\Steam\\steamapps\\common',
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games',
      'D:\\Ubisoft Games',
      'C:\\Games',
    ];

    for (const known of KNOWN_UBI_GAMES) {
      if (gamesFoundMap.has(known.uplayId)) continue;
      for (const baseDir of commonSearchDirs) {
        if (!fs.existsSync(baseDir)) continue;
        for (const rel of known.relativeDirs) {
          const checkPath = path.join(baseDir, rel);
          if (fs.existsSync(checkPath)) {
            const exe = findGameExecutable(checkPath, known.exeNames);
            if (exe) {
              gamesFoundMap.set(known.uplayId, {
                gameId: known.uplayId,
                title: known.title,
                installDir: checkPath,
                executable: exe,
                steamAppId: known.steamAppId,
                iconFile: known.icon,
              });
              break;
            }
          }
        }
        if (gamesFoundMap.has(known.uplayId)) break;
      }
    }

    const games = [];
    for (const [key, item] of gamesFoundMap.entries()) {
      const gameId = String(item.gameId);
      const installDir = item.installDir;
      if (!installDir || !fs.existsSync(installDir)) continue;

      const knownInfo = KNOWN_UBI_GAMES.find((k) => k.uplayId === gameId || k.altIds?.includes(gameId));
      const meta = this.getGameMetadataFromCache(gameId);
      let title = item.title || knownInfo?.title || meta?.title;
      if (!title) {
        title = path.basename(installDir.replace(/[\\/]+$/, ''));
      }

      const sizeGb = calculateDirSizeGb(installDir);
      const executable =
        item.executable ||
        findGameExecutable(installDir, knownInfo?.exeNames || [`${title}.exe`, 'uno.exe', 'game.exe']);

      // Look for game icon
      let iconUrl = '';
      if (knownInfo?.icon && root) {
        const iconPath = path.join(root, 'data', 'games', knownInfo.icon);
        if (fs.existsSync(iconPath)) {
          iconUrl = `file:///${iconPath.replace(/\\/g, '/')}`;
        }
      }
      if (!iconUrl && meta?.iconUrl) {
        iconUrl = meta.iconUrl;
      }
      if (!iconUrl && item.displayIcon && fs.existsSync(item.displayIcon)) {
        iconUrl = `file:///${item.displayIcon.replace(/\\/g, '/')}`;
      }

      // Rich media URLs using Steam App ID if available
      const steamAppId = knownInfo?.steamAppId || item.steamAppId;
      const coverUrl = steamAppId
        ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_600x900.jpg`
        : meta?.splashUrl || meta?.thumbUrl || meta?.bgUrl || '';
      const heroUrl = steamAppId
        ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_hero.jpg`
        : meta?.bgUrl || meta?.splashUrl || '';

      games.push({
        id: `ubi_${gameId}`,
        appId: gameId,
        title,
        tagline: 'Ubisoft Connect Title',
        description: `Installed via Ubisoft Connect at ${installDir}`,
        developer: 'Ubisoft',
        publisher: 'Ubisoft',
        releaseDate: '',
        categories: resolveGameCategories({ title }),
        launcher: 'Ubisoft',
        installed: true,
        installPath: installDir,
        executable: executable || undefined,
        sizeGb: sizeGb && sizeGb > 0 ? sizeGb : undefined,
        playtime: {
          totalMinutes: 0,
        },
        media: {
          coverUrl,
          heroUrl,
          logoUrl: meta?.logoUrl || '',
          iconUrl: iconUrl || coverUrl,
          screenshots: heroUrl ? [heroUrl] : [],
        },
        achievements: [],
        friends: [],
        launchUri: `uplay://launch/${gameId}/0`,
        installUri: `uplay://install/${gameId}`,
        ownershipSources: [
          {
            launcher: 'Ubisoft',
            gameId,
            installed: true,
            installPath: installDir,
            launchUri: `uplay://launch/${gameId}/0`,
            installUri: `uplay://install/${gameId}`,
          },
        ],
      });
    }

    return games;
  }

  /**
   * Scan owned Ubisoft games (both installed and uninstalled) from account cache and configurations.
   * @returns {Promise<any[]>}
   */
  async scanOwnedGames() {
    const root = this.ubiRoot || this.detectUbiRoot();
    if (!root) return [];

    const ownedMap = new Map();

    // 1. Identify owned product IDs from user's savegames directory
    const account = await this.getActiveAccount();
    if (account?.id) {
      const userSaveDir = path.join(root, 'savegames', account.id);
      if (fs.existsSync(userSaveDir)) {
        try {
          const dirs = fs.readdirSync(userSaveDir);
          for (const d of dirs) {
            if (/^\d+$/.test(d)) {
              ownedMap.set(d, { uplayId: d });
            }
          }
        } catch {}
      }

      // Also inspect ownership file for product IDs
      const ownershipPath = path.join(root, 'cache', 'ownership', account.id);
      if (fs.existsSync(ownershipPath)) {
        try {
          const buf = fs.readFileSync(ownershipPath);
          for (let i = 0; i < buf.length - 2; i++) {
            if (buf[i] === 0x08) {
              let res = 0;
              let shift = 0;
              let offset = i + 1;
              while (offset < buf.length) {
                const b = buf[offset++];
                res |= (b & 0x7f) << shift;
                shift += 7;
                if ((b & 0x80) === 0) break;
              }
              if (res > 10 && res < 500000) {
                ownedMap.set(String(res), { uplayId: String(res) });
              }
            }
          }
        } catch {}
      }
    }

    // 2. Parse configurations file for base game sections
    const confPath = path.join(root, 'cache', 'configuration', 'configurations');
    if (fs.existsSync(confPath)) {
      try {
        const confContent = fs.readFileSync(confPath, 'latin1');
        const chunks = confContent.split(/version:\s*2\.0/g);
        for (const chunk of chunks) {
          const nameMatch = chunk.match(/name:\s*["']?([^"'\r\n]+)["']?/);
          const uplayMatch = chunk.match(/override_uplayid:\s*([0-9]+)/);
          const steamMatch = chunk.match(/steam_app_id:\s*([0-9]+)/);
          const iconMatch = chunk.match(/icon_image:\s*([^"'\r\n]+)/);
          const isUlc = chunk.includes('is_ulc: yes');
          const isVisible = !chunk.includes('is_visible: no');

          if (nameMatch && !isUlc && isVisible) {
            const rawTitle = nameMatch[1].trim().replace(/\x00/g, '');
            // Filter out DLCs, skins, cosmetic packs, bundles, passes, currency packs
            if (
              rawTitle.length > 3 &&
              rawTitle.toLowerCase() !== 'tom clancy' &&
              !rawTitle.includes('localizations') &&
              !rawTitle.includes('Theme Cards') &&
              !rawTitle.includes('Welcome Pack') &&
              !rawTitle.includes('Premier Pack') &&
              !rawTitle.includes('Credits') &&
              !rawTitle.includes('DLC') &&
              !rawTitle.includes('Pack') &&
              !rawTitle.includes('Pass') &&
              !rawTitle.includes('Skin') &&
              !rawTitle.includes('Bundle') &&
              !rawTitle.includes('Set') &&
              !rawTitle.toLowerCase().startsWith('name')
            ) {
              const uId = uplayMatch ? uplayMatch[1] : null;
              if (uId) {
                const existing = ownedMap.get(uId) || {};
                ownedMap.set(uId, {
                  ...existing,
                  uplayId: uId,
                  title: rawTitle,
                  steamAppId: steamMatch ? steamMatch[1] : existing.steamAppId,
                  icon: iconMatch ? iconMatch[1].trim() : existing.icon,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('[UbisoftAdapter] Error parsing configurations for owned games:', err);
      }
    }

    // 3. Match with known catalog titles
    for (const known of KNOWN_UBI_GAMES) {
      const isOwned =
        ownedMap.has(known.uplayId) ||
        known.altIds?.some((id) => ownedMap.has(id));

      if (isOwned) {
        const existing = ownedMap.get(known.uplayId) || {};
        ownedMap.set(known.uplayId, {
          ...existing,
          uplayId: known.uplayId,
          title: known.title,
          steamAppId: known.steamAppId,
          icon: known.icon || existing.icon,
          exeNames: known.exeNames,
          relativeDirs: known.relativeDirs,
        });
      }
    }

    // 4. Build game objects
    const games = [];
    const seenTitles = new Set();

    for (const [id, item] of ownedMap.entries()) {
      const known = KNOWN_UBI_GAMES.find((k) => k.uplayId === id || k.altIds?.includes(id));
      const title = item.title || known?.title;
      if (!title) continue;

      const normTitleKey = title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenTitles.has(normTitleKey)) continue;
      seenTitles.add(normTitleKey);

      const steamAppId = item.steamAppId || known?.steamAppId;
      const uplayId = known?.uplayId || id;

      // Check if installed on disk
      let isInstalled = false;
      let installPath = undefined;
      let executable = undefined;
      let sizeGb = undefined;

      // Check registry
      const regDir = queryRegValue(`HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\${uplayId}`, 'InstallDir');
      if (regDir && fs.existsSync(regDir)) {
        isInstalled = true;
        installPath = path.normalize(regDir);
        executable = findGameExecutable(installPath, known?.exeNames);
        sizeGb = calculateDirSizeGb(installPath);
      }

      // Check common Steam and Ubisoft dirs if not installed via uplay registry
      if (!isInstalled) {
        const checkDirs = [
          'C:\\Program Files (x86)\\Steam\\steamapps\\common',
          'D:\\SteamLibrary\\steamapps\\common',
          'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games',
          'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher\\games',
          'D:\\Games\\Ubisoft',
        ];
        const relList = known?.relativeDirs || [title];
        for (const base of checkDirs) {
          if (!fs.existsSync(base)) continue;
          for (const rel of relList) {
            const p = path.join(base, rel);
            if (fs.existsSync(p)) {
              const exe = findGameExecutable(p, known?.exeNames);
              if (exe) {
                isInstalled = true;
                installPath = p;
                executable = exe;
                sizeGb = calculateDirSizeGb(p);
                break;
              }
            }
          }
          if (isInstalled) break;
        }
      }

      // Icon resolution
      let iconUrl = '';
      const iconName = item.icon || known?.icon;
      if (iconName && root) {
        const fullIcon = path.join(root, 'data', 'games', iconName);
        if (fs.existsSync(fullIcon)) {
          iconUrl = `file:///${fullIcon.replace(/\\/g, '/')}`;
        }
      }

      // Cover & Hero artwork
      const coverUrl = steamAppId
        ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_600x900.jpg`
        : '';
      const heroUrl = steamAppId
        ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_hero.jpg`
        : '';

      games.push({
        id: `ubi_${uplayId}`,
        appId: uplayId,
        title,
        tagline: 'Ubisoft Connect Title',
        description: isInstalled
          ? `Installed via Ubisoft Connect at ${installPath}`
          : `Owned in Ubisoft Connect library`,
        developer: 'Ubisoft',
        publisher: 'Ubisoft',
        releaseDate: '',
        categories: resolveGameCategories({ title }),
        launcher: 'Ubisoft',
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
          logoUrl: '',
          iconUrl: iconUrl || coverUrl,
          screenshots: heroUrl ? [heroUrl] : [],
        },
        achievements: [],
        friends: [],
        launchUri: `uplay://launch/${uplayId}/0`,
        installUri: `uplay://install/${uplayId}`,
        ownershipSources: [
          {
            launcher: 'Ubisoft',
            gameId: uplayId,
            installed: isInstalled,
            installPath: installPath || undefined,
            launchUri: `uplay://launch/${uplayId}/0`,
            installUri: `uplay://install/${uplayId}`,
          },
        ],
      });
    }

    return games;
  }

  async launchGame(game) {
    const gameId = game.appId || game.id.replace('ubi_', '');
    const uri = game.launchUri || `uplay://launch/${gameId}/0`;

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
    const gameId = game.appId || game.id.replace('ubi_', '');
    const uri = game.installUri || `uplay://install/${gameId}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = UbisoftAdapter;
