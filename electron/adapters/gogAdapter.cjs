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

class GogAdapter extends BaseAdapter {
  constructor() {
    super('GOG', 'GOG Galaxy');
    this.gogRoot = this.detectGogRoot();
    this.storageDb = 'C:\\ProgramData\\GOG.com\\Galaxy\\storage\\galaxy-2.0.db';
  }

  detectGogRoot() {
    // 1. Check registry paths
    const regRoots = [
      'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\GalaxyClient\\paths',
      'HKLM\\SOFTWARE\\GOG.com\\GalaxyClient\\paths',
    ];
    for (const root of regRoots) {
      const client = queryRegValue(root, 'client');
      if (client && fs.existsSync(client) && fs.existsSync(path.join(client, 'GalaxyClient.exe'))) {
        return path.normalize(client);
      }
    }

    // 2. Check uninstall entries
    const uninstalls = findUninstallEntries(['gog galaxy']);
    for (const u of uninstalls) {
      if (u.installLocation && fs.existsSync(u.installLocation)) {
        if (fs.existsSync(path.join(u.installLocation, 'GalaxyClient.exe'))) {
          return path.normalize(u.installLocation);
        }
      }
    }

    // 3. Fallback paths
    const candidates = [
      'C:\\Program Files (x86)\\GOG Galaxy',
      'C:\\Program Files\\GOG Galaxy',
      'D:\\GOG Galaxy',
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

  async getActiveAccount() {
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) return null;

    const confFile = path.join(localAppData, 'GOG.com', 'Galaxy', 'Configuration', 'config.json');
    if (!fs.existsSync(confFile)) return null;

    try {
      const content = fs.readFileSync(confFile, 'utf8');
      const data = JSON.parse(content);
      if (data.username || data.userId) {
        return {
          id: data.userId || 'gog_user',
          name: data.username || 'GOG User',
          accountName: data.username || undefined,
        };
      }
    } catch (err) {
      console.error('[GogAdapter] Error reading GOG Galaxy config.json:', err);
    }

    return null;
  }

  async scanInstalledGames() {
    const games = [];
    const gamesMap = new Map();

    // 1. Scan GOG registry games
    const regRoots = [
      'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games',
      'HKLM\\SOFTWARE\\GOG.com\\Games',
      'HKCU\\Software\\GOG.com\\Games',
    ];

    for (const root of regRoots) {
      const subkeys = queryRegSubkeys(root);
      for (const sub of subkeys) {
        const gameId = sub.split('\\').pop();
        if (!gameId) continue;

        const vals = queryRegKeyValues(sub);
        const title = vals.gameName || vals.startMenu || `GOG Game ${gameId}`;
        const installPath = vals.path ? path.normalize(vals.path.replace(/\//g, '\\')) : '';
        const exe = vals.exe ? path.normalize(vals.exe.replace(/\//g, '\\')) : '';

        // Only register if the game files actually exist on disk
        if (installPath && fs.existsSync(installPath)) {
          gamesMap.set(gameId, {
            gameId,
            title,
            installPath,
            executable: exe && fs.existsSync(exe) ? exe : findGameExecutable(installPath),
            icon: vals.startMenuLink || undefined,
          });
        }
      }
    }

    // 2. Scan Windows Uninstall entries for GOG.com
    try {
      const uninstalls = findUninstallEntries((item) => {
        const lowerName = item.displayName.toLowerCase();
        return (
          item.publisher === 'GOG.com' ||
          lowerName.includes('gog') ||
          (item.uninstallString && item.uninstallString.toLowerCase().includes('gog'))
        );
      });

      for (const item of uninstalls) {
        if (item.displayName.toLowerCase() === 'gog galaxy') continue;

        const installDir = item.installLocation;
        if (installDir && fs.existsSync(installDir)) {
          const exe = findGameExecutable(installDir, [`${item.displayName}.exe`]);
          if (exe) {
            // Check if already mapped
            const normPath = (p) => (p ? path.normalize(p).replace(/[\\/]+$/, '').toLowerCase() : '');
            const alreadyMapped = Array.from(gamesMap.values()).some(
              (g) => g.installDir && normPath(g.installDir) === normPath(installDir)
            );
            if (!alreadyMapped) {
              const cleanId = item.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
              gamesMap.set(`gog_${cleanId}`, {
                gameId: cleanId,
                title: item.displayName,
                installDir,
                executable: exe,
                icon: item.displayIcon,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[GogAdapter] Error checking uninstall entries:', err);
    }

    // 3. Scan common GOG library paths across drives
    const commonGogFolders = [
      'C:\\GOG Games',
      'D:\\GOG Games',
      'E:\\GOG Games',
    ];

    for (const folder of commonGogFolders) {
      if (fs.existsSync(folder)) {
        try {
          const entries = fs.readdirSync(folder);
          for (const sub of entries) {
            const full = path.join(folder, sub);
            try {
              if (fs.statSync(full).isDirectory()) {
                const exe = findGameExecutable(full, [`${sub}.exe`]);
                if (exe) {
                  const normPath = (p) => (p ? path.normalize(p).replace(/[\\/]+$/, '').toLowerCase() : '');
                  const alreadyMapped = Array.from(gamesMap.values()).some(
                    (g) => g.installDir && normPath(g.installDir) === normPath(full)
                  );
                  if (!alreadyMapped) {
                    const cleanId = sub.toLowerCase().replace(/[^a-z0-9]/g, '');
                    gamesMap.set(`gog_${cleanId}`, {
                      gameId: cleanId,
                      title: sub,
                      installDir: full,
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

    // Build game items
    for (const [key, item] of gamesMap.entries()) {
      const gameId = String(item.gameId);
      const installPath = item.installPath || item.installDir;
      const sizeGb = calculateDirSizeGb(installPath);

      let iconUrl = '';
      if (item.icon && fs.existsSync(item.icon)) {
        iconUrl = `file://${item.icon.replace(/\\/g, '/')}`;
      } else {
        // Look for goggame-*.ico in folder
        try {
          const files = fs.readdirSync(installPath);
          const ico = files.find((f) => f.startsWith('goggame') && f.endsWith('.ico'));
          if (ico) {
            iconUrl = `file://${path.join(installPath, ico).replace(/\\/g, '/')}`;
          }
        } catch {}
      }

      games.push({
        id: `gog_${gameId}`,
        appId: gameId,
        title: item.title,
        tagline: 'GOG Galaxy Title',
        description: `Installed via GOG Galaxy at ${installPath}`,
        developer: 'GOG Partner',
        publisher: 'GOG.com',
        releaseDate: '',
        categories: ['GOG', 'Action'],
        launcher: 'GOG',
        installed: true,
        installPath,
        executable: item.executable || undefined,
        sizeGb: sizeGb && sizeGb > 0 ? sizeGb : undefined,
        playtime: {
          totalMinutes: 0,
        },
        media: {
          coverUrl: iconUrl || '',
          heroUrl: '',
          logoUrl: '',
          iconUrl,
          screenshots: [],
        },
        achievements: [],
        friends: [],
        launchUri: `goggalaxy://openGameView/${gameId}`,
        installUri: `goggalaxy://openGameView/${gameId}`,
      });
    }

    return games;
  }

  /**
   * Scan all owned GOG titles from the local GOG Galaxy SQLite database (galaxy-2.0.db).
   * Extracts rich metadata, ratings, developer, publisher, and native GOG CDN artwork.
   * @returns {Promise<Array<object>>}
   */
  async scanOwnedGames() {
    if (!fs.existsSync(this.storageDb)) return [];

    let DatabaseSync;
    try {
      DatabaseSync = require('node:sqlite').DatabaseSync;
    } catch (e) {
      console.warn('[GogAdapter] node:sqlite is not available:', e);
      return [];
    }

    const ownedGames = [];
    let db;
    try {
      db = new DatabaseSync(this.storageDb, { readOnly: true });

      const releaseRows = db.prepare(`
        SELECT DISTINCT lr.releaseKey
        FROM LibraryReleases lr
        WHERE lr.releaseKey LIKE 'gog_%'
      `).all();

      if (!releaseRows || releaseRows.length === 0) {
        return [];
      }

      const stmtPieces = db.prepare(`
        SELECT gpt.type, gp.value
        FROM GamePieces gp
        JOIN GamePieceTypes gpt ON gp.gamePieceTypeId = gpt.id
        WHERE gp.releaseKey = ?
      `);

      // Registry and disk paths to check installed status
      const installedMap = new Map();
      const regRoots = [
        'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games',
        'HKLM\\SOFTWARE\\GOG.com\\Games',
        'HKCU\\Software\\GOG.com\\Games',
      ];
      for (const root of regRoots) {
        const subkeys = queryRegSubkeys(root);
        for (const sub of subkeys) {
          const gId = sub.split('\\').pop();
          const vals = queryRegKeyValues(sub);
          const p = vals.path ? path.normalize(vals.path.replace(/\//g, '\\')) : '';
          if (p && fs.existsSync(p)) {
            installedMap.set(gId, {
              installPath: p,
              executable: vals.exe && fs.existsSync(vals.exe) ? vals.exe : findGameExecutable(p),
            });
          }
        }
      }

      const commonGogFolders = ['C:\\GOG Games', 'D:\\GOG Games', 'E:\\GOG Games'];
      const rawEntries = [];

      for (const { releaseKey } of releaseRows) {
        const gogId = releaseKey.replace('gog_', '');
        const pieces = stmtPieces.all(releaseKey);
        const pieceMap = {};
        for (const p of pieces) {
          try {
            pieceMap[p.type] = JSON.parse(p.value);
          } catch {
            pieceMap[p.type] = p.value;
          }
        }

        const rawTitle = pieceMap.title?.title || pieceMap.originalTitle?.title;
        if (!rawTitle) continue;

        const isPrimePromo = /-\s*Amazon Prime/i.test(rawTitle);
        const cleanTitle = rawTitle.replace(/\s*-\s*Amazon Prime/i, '').trim();

        // GOG artwork resolution
        let coverUrl = '';
        let heroUrl = '';
        let logoUrl = '';
        const screenshots = [];

        if (pieceMap.originalImages?.verticalCover) {
          coverUrl = pieceMap.originalImages.verticalCover;
        } else if (pieceMap.storeImages?.verticalCover) {
          coverUrl = pieceMap.storeImages.verticalCover.replace('{formatter}', 'glx_vertical_cover');
        }

        if (pieceMap.originalImages?.background) {
          heroUrl = pieceMap.originalImages.background;
        } else if (pieceMap.storeImages?.horizontalCover) {
          heroUrl = pieceMap.storeImages.horizontalCover.replace('{formatter}', 'glx_bg_top_480');
        }

        if (pieceMap.storeImages?.logo) {
          logoUrl = pieceMap.storeImages.logo;
        }

        if (Array.isArray(pieceMap.media?.artworks)) {
          screenshots.push(...pieceMap.media.artworks);
        }
        if (Array.isArray(pieceMap.media?.screenshots)) {
          screenshots.push(...pieceMap.media.screenshots);
        }

        // Cross-platform release identifiers
        let steamAppId = null;
        if (Array.isArray(pieceMap.allGameReleases?.releases)) {
          for (const rel of pieceMap.allGameReleases.releases) {
            if (rel.startsWith('steam_')) {
              steamAppId = rel.replace('steam_', '');
              break;
            }
          }
        }

        if (!coverUrl && steamAppId) {
          coverUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_600x900.jpg`;
        }
        if (!heroUrl && steamAppId) {
          heroUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_hero.jpg`;
        }

        const meta = pieceMap.meta || pieceMap.originalMeta || {};
        const developers = meta.developers?.join(', ') || 'GOG Partner';
        const publishers = meta.publishers?.join(', ') || 'GOG.com';
        const genres = meta.genres || ['GOG', 'Adventure'];

        let releaseDate = '';
        if (meta.releaseDate && typeof meta.releaseDate === 'number') {
          releaseDate = new Date(meta.releaseDate * 1000).toISOString().split('T')[0];
        }

        // Check installed on disk
        let isInstalled = false;
        let installPath = undefined;
        let executable = undefined;
        let sizeGb = undefined;

        if (installedMap.has(gogId)) {
          const inst = installedMap.get(gogId);
          isInstalled = true;
          installPath = inst.installPath;
          executable = inst.executable;
          sizeGb = calculateDirSizeGb(installPath);
        } else {
          for (const base of commonGogFolders) {
            if (!fs.existsSync(base)) continue;
            const cand = path.join(base, cleanTitle);
            if (fs.existsSync(cand)) {
              isInstalled = true;
              installPath = cand;
              executable = findGameExecutable(cand);
              sizeGb = calculateDirSizeGb(cand);
              break;
            }
          }
        }

        rawEntries.push({
          releaseKey,
          gogId,
          steamAppId,
          title: cleanTitle,
          rawTitle,
          isPrimePromo,
          developer: developers,
          publisher: publishers,
          releaseDate,
          categories: ['GOG', ...genres],
          coverUrl,
          heroUrl,
          logoUrl,
          screenshots: screenshots.slice(0, 5),
          summary: pieceMap.summary?.summary ? pieceMap.summary.summary.replace(/<[^>]+>/g, '').slice(0, 350) : '',
          isInstalled,
          installPath,
          executable,
          sizeGb: sizeGb && sizeGb > 0 ? sizeGb : undefined,
        });
      }

      // Group and deduplicate: prefer base releases over promo variants
      const dedupMap = new Map();
      for (const entry of rawEntries) {
        const normKey = entry.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const existing = dedupMap.get(normKey);

        if (!existing) {
          dedupMap.set(normKey, entry);
        } else {
          // If existing is promo and new entry is non-promo or has richer artwork, replace
          if (existing.isPrimePromo && !entry.isPrimePromo) {
            dedupMap.set(normKey, entry);
          } else if (!existing.coverUrl && entry.coverUrl) {
            dedupMap.set(normKey, {
              ...existing,
              coverUrl: entry.coverUrl,
              heroUrl: entry.heroUrl || existing.heroUrl,
              logoUrl: entry.logoUrl || existing.logoUrl,
              screenshots: entry.screenshots.length > 0 ? entry.screenshots : existing.screenshots,
            });
          }
        }
      }

      for (const item of dedupMap.values()) {
        ownedGames.push({
          id: item.releaseKey,
          appId: item.gogId,
          title: item.title,
          tagline: 'GOG Galaxy Title',
          description: item.summary || (item.isInstalled
            ? `Installed via GOG Galaxy at ${item.installPath}`
            : 'Owned in GOG Galaxy library'),
          developer: item.developer,
          publisher: item.publisher,
          releaseDate: item.releaseDate,
          categories: item.categories,
          launcher: 'GOG',
          installed: item.isInstalled,
          installPath: item.installPath,
          executable: item.executable,
          sizeGb: item.sizeGb,
          playtime: {
            totalMinutes: 0,
          },
          media: {
            coverUrl: item.coverUrl,
            heroUrl: item.heroUrl,
            logoUrl: item.logoUrl,
            iconUrl: item.coverUrl,
            screenshots: item.screenshots,
          },
          achievements: [],
          friends: [],
          launchUri: `goggalaxy://openGameView/${item.gogId}`,
          installUri: `goggalaxy://openGameView/${item.gogId}`,
          ownershipSources: [
            {
              launcher: 'GOG',
              gameId: item.gogId,
              installed: item.isInstalled,
              installPath: item.installPath,
              launchUri: `goggalaxy://openGameView/${item.gogId}`,
              installUri: `goggalaxy://openGameView/${item.gogId}`,
            },
          ],
        });
      }
    } catch (err) {
      console.error('[GogAdapter] Error scanning owned games from galaxy-2.0.db:', err);
    }

    return ownedGames;
  }

  async launchGame(game) {
    const gameId = game.appId || game.id.replace('gog_', '');
    const uri = game.launchUri || `goggalaxy://openGameView/${gameId}`;

    // If client is installed, protocol URI opens Galaxy
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
    const gameId = game.appId || game.id.replace('gog_', '');
    const uri = game.installUri || `goggalaxy://openGameView/${gameId}`;
    await shell.openExternal(uri);
    return { success: true, uri };
  }
}

module.exports = GogAdapter;
