const fs = require('fs');
const path = require('path');
const https = require('https');
const { shell } = require('electron');
const BaseAdapter = require('./baseAdapter.cjs');
const { calculateDirSizeGb, findGameExecutable } = require('./registryHelper.cjs');

// Known Microsoft Store / Xbox Product IDs for high-res art resolution
const KNOWN_STORE_IDS = {
  'minecraft for windows': '9NBLGGH2JHXJ',
  'minecraft': '9NBLGGH2JHXJ',
  'minecraft uwp': '9NBLGGH2JHXJ',
  'forza horizon 5': '9NJX550424DJ',
  'forza horizon 4': '9PNJXGHTDG57',
  'halo infinite': '9PP5G1F0C2B6',
  'sea of thieves': '9P2N57MC619K',
  'starfield': '9NCGNJ5VKQ10',
  'microsoft flight simulator': '9NRBDJX2W1TX',
  'grounded': '9PJ094T3X784',
  'state of decay 2': '9N4GTPXTPQJK',
  'psychonauts 2': '9P9DF9FSZ5FL',
};

/**
 * Fetch official artwork from Microsoft Store Display Catalog API.
 * @param {string} productId
 * @returns {Promise<{ coverUrl: string, heroUrl: string, logoUrl: string, screenshots: string[] }|null>}
 */
function fetchMicrosoftStoreArt(productId) {
  return new Promise((resolve) => {
    if (!productId) return resolve(null);
    try {
      const url = `https://displaycatalog.mp.microsoft.com/v7/products/${productId}?market=US&languages=en-US`;
      const req = https.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) UnityGameLauncher/0.2.0',
            Accept: 'application/json',
          },
          timeout: 4500,
        },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => {
            raw += chunk;
          });
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const data = JSON.parse(raw);
                const images = data.Product?.LocalizedProperties?.[0]?.Images || [];
                const poster =
                  images.find((i) => i.ImagePurpose === 'Poster') ||
                  images.find((i) => i.ImagePurpose === 'BrandedKeyArt') ||
                  images.find((i) => i.ImagePurpose === 'BoxArt');
                const hero =
                  images.find((i) => i.ImagePurpose === 'SuperHeroArt') ||
                  images.find((i) => i.ImagePurpose === 'TitledHeroArt') ||
                  images.find((i) => i.ImagePurpose === 'Hero');
                const logo = images.find((i) => i.ImagePurpose === 'Logo');
                const screenshots = images
                  .filter((i) => i.ImagePurpose === 'Screenshot')
                  .map((i) => (i.Uri.startsWith('http') ? i.Uri : `https:${i.Uri}`));

                resolve({
                  coverUrl: poster ? (poster.Uri.startsWith('http') ? poster.Uri : `https:${poster.Uri}`) : '',
                  heroUrl: hero ? (hero.Uri.startsWith('http') ? hero.Uri : `https:${hero.Uri}`) : '',
                  logoUrl: logo ? (logo.Uri.startsWith('http') ? logo.Uri : `https:${logo.Uri}`) : '',
                  screenshots,
                });
              } else {
                resolve(null);
              }
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.on('error', () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

class XboxAdapter extends BaseAdapter {
  constructor() {
    super('Xbox', 'Xbox App / Windows Store');
  }

  async isInstalled() {
    return process.platform === 'win32';
  }

  async getClientPath() {
    return 'xbox:';
  }

  async getActiveAccount() {
    return {
      id: 'xbox_user',
      name: 'Xbox Player',
      accountName: 'Xbox Player',
    };
  }

  async scanInstalledGames() {
    const games = [];
    const searchDirs = ['C:\\XboxGames', 'D:\\XboxGames', 'E:\\XboxGames'];

    for (const baseDir of searchDirs) {
      if (!fs.existsSync(baseDir)) continue;
      try {
        const rawEntries = fs.readdirSync(baseDir);
        const entries = rawEntries.filter((e) => {
          if (!e || e.toLowerCase() === 'gamesave' || e.startsWith('.')) return false;
          try {
            return fs.statSync(path.join(baseDir, e)).isDirectory();
          } catch {
            return false;
          }
        });

        // Identify launcher helpers that duplicate primary games
        // E.g., 'Minecraft Launcher' alongside 'Minecraft for Windows' or 'Minecraft'
        const baseNames = new Set(
          entries.map((e) => e.toLowerCase().replace(/[^a-z0-9]/g, ''))
        );

        for (const sub of entries) {
          const lowerSub = sub.toLowerCase();

          // Filter out helper/launcher wrappers if primary game is present
          if (
            (lowerSub.endsWith(' launcher') || lowerSub.endsWith('-launcher')) &&
            (baseNames.has(lowerSub.replace(/\s*-\s*launcher|\s+launcher/g, '').replace(/[^a-z0-9]/g, '')) ||
             (lowerSub.includes('minecraft') && (baseNames.has('minecraftforwindows') || baseNames.has('minecraft'))))
          ) {
            continue;
          }

          const fullPath = path.join(baseDir, sub);
          try {
            const contentPath = path.join(fullPath, 'Content');
            const hasContent = fs.existsSync(contentPath);
            const searchDir = hasContent ? contentPath : fullPath;

            const exe = findGameExecutable(fullPath, [
              'Content\\gamelaunchhelper.exe',
              'gamelaunchhelper.exe',
              'Content\\GameLaunchHelper.exe',
              'GameLaunchHelper.exe',
              'Minecraft.exe',
            ]);

            const sizeGb = calculateDirSizeGb(fullPath);
            const cleanId = sub.toLowerCase().replace(/[^a-z0-9]/g, '');

            // Inspect AppxManifest.xml if available for metadata and assets
            let manifestTitle = sub;
            let protocolUri = 'xbox:';
            let localHeroUrl = '';
            let localIconUrl = '';
            let localLogoUrl = '';

            const manifestPath = path.join(searchDir, 'appxmanifest.xml');
            if (fs.existsSync(manifestPath)) {
              try {
                const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                const titleMatch = manifestContent.match(/<DisplayName>([^<]+)<\/DisplayName>/i);
                if (titleMatch && titleMatch[1]) {
                  manifestTitle = titleMatch[1].trim();
                }

                const protoMatch = manifestContent.match(/<uap:Protocol\s+Name="([^"]+)"/i);
                if (protoMatch && protoMatch[1] && !protoMatch[1].startsWith('ms-xbl')) {
                  protocolUri = `${protoMatch[1]}://`;
                }

                // Check local assets
                const splashMatch = manifestContent.match(/<uap:SplashScreen\s+Image="([^"]+)"/i);
                if (splashMatch && splashMatch[1]) {
                  const splashFile = path.join(searchDir, splashMatch[1]);
                  if (fs.existsSync(splashFile)) {
                    localHeroUrl = `file:///${splashFile.replace(/\\/g, '/')}`;
                  }
                }

                const iconCandidates = [
                  'minecraftIcon.ico',
                  'StoreLogo.png',
                  'LargeLogo.png',
                  'Logo.png',
                  'SmallLogo.png',
                ];
                for (const ic of iconCandidates) {
                  const iconFile = path.join(searchDir, ic);
                  if (fs.existsSync(iconFile)) {
                    if (ic.endsWith('.ico')) {
                      localIconUrl = `file:///${iconFile.replace(/\\/g, '/')}`;
                    } else if (!localLogoUrl) {
                      localLogoUrl = `file:///${iconFile.replace(/\\/g, '/')}`;
                    }
                  }
                }
              } catch (err) {
                console.warn(`[XboxAdapter] Error reading manifest for ${sub}:`, err);
              }
            }

            // Fallback local art scanning
            if (!localHeroUrl && fs.existsSync(path.join(searchDir, 'MCSplashScreen.png'))) {
              localHeroUrl = `file:///${path.join(searchDir, 'MCSplashScreen.png').replace(/\\/g, '/')}`;
            }
            if (!localIconUrl && fs.existsSync(path.join(searchDir, 'minecraftIcon.ico'))) {
              localIconUrl = `file:///${path.join(searchDir, 'minecraftIcon.ico').replace(/\\/g, '/')}`;
            }

            // Resolve rich artwork via Microsoft Store Display Catalog
            const normKey = sub.toLowerCase().trim();
            const storeId = KNOWN_STORE_IDS[normKey] || KNOWN_STORE_IDS[manifestTitle.toLowerCase().trim()];
            let catalogArt = null;
            if (storeId) {
              catalogArt = await fetchMicrosoftStoreArt(storeId);
            }

            const media = {
              coverUrl: catalogArt?.coverUrl || '',
              heroUrl: catalogArt?.heroUrl || localHeroUrl || '',
              logoUrl: catalogArt?.logoUrl || localLogoUrl || '',
              iconUrl: localIconUrl || '',
              screenshots: catalogArt?.screenshots || (localHeroUrl ? [localHeroUrl] : []),
            };

            games.push({
              id: `xbox_${cleanId}`,
              appId: cleanId,
              title: manifestTitle || sub,
              tagline: 'Xbox Title',
              description: `Installed via Xbox / Microsoft Store at ${fullPath}`,
              developer: 'Xbox Game Studios',
              publisher: 'Xbox Game Studios',
              releaseDate: '',
              categories: ['Xbox', 'Action'],
              launcher: 'Xbox',
              installed: true,
              installPath: fullPath,
              executable: exe || undefined,
              sizeGb: sizeGb && sizeGb > 0 ? sizeGb : undefined,
              playtime: {
                totalMinutes: 0,
              },
              media,
              achievements: [],
              friends: [],
              launchUri: protocolUri,
              installUri: `ms-windows-store://search/?query=${encodeURIComponent(sub)}`,
              ownershipSources: [
                {
                  launcher: 'Xbox',
                  gameId: cleanId,
                  installed: true,
                  installPath: fullPath,
                  launchUri: protocolUri,
                  installUri: `ms-windows-store://search/?query=${encodeURIComponent(sub)}`,
                },
              ],
            });
          } catch (itemErr) {
            console.error(`[XboxAdapter] Error processing game folder ${sub}:`, itemErr);
          }
        }
      } catch (err) {
        console.error(`[XboxAdapter] Error scanning ${baseDir}:`, err);
      }
    }

    return games;
  }

  async launchGame(game) {
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

    const uri = game.launchUri || `xbox:`;
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
