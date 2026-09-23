const https = require('https');

const KNOWN_TITLE_APP_IDS = {
  uno: '470220',
  'watch dogs legion': '2239550',
  'watch dogs legion of the dead': '2239550',
  'ghost recon breakpoint': '2231380',
  'tom clancy s ghost recon breakpoint': '2231380',
  'rainbow six siege': '359550',
  'tom clancy s rainbow six siege': '359550',
  'rainbow six siege test server': '623990',
  'tom clancy s rainbow six siege test server': '623990',
  'watch dogs': '243470',
  'watch dogs 2': '447040',
  'star trek bridge crew': '527100',
  'minecraft': null, // Bedrock is non-Steam; use Microsoft Catalog
  'minecraft for windows': null,
};

const KNOWN_STORE_IDS = {
  'minecraft for windows': '9NBLGGH2JHXJ',
  minecraft: '9NBLGGH2JHXJ',
  'minecraft uwp': '9NBLGGH2JHXJ',
  'forza horizon 5': '9NJX550424DJ',
  'forza horizon 4': '9PNJXGHTDG57',
  'halo infinite': '9PP5G1F0C2B6',
  'sea of thieves': '9P2N57MC619K',
  starfield: '9NCGNJ5VKQ10',
  'microsoft flight simulator': '9NRBDJX2W1TX',
};

/**
 * Clean a game title to improve Steam catalog matching.
 * @param {string} title
 * @returns {string}
 */
function cleanGameTitle(title) {
  if (!title) return '';
  return title
    .replace(/[™®©]/g, '')
    .replace(/\b(for Windows|Win10|PC|Edition|GOTY|Game of the Year|Deluxe|Standard|Collector's|Definitive|Enhanced|Gold|Ultimate|Special)\s*(Edition|Bundle)?\b/gi, '')
    .replace(/[:\-_'’"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Perform a quick HTTP HEAD check with timeout.
 * @param {string} url
 * @param {number} [timeoutMs=3500]
 * @returns {Promise<boolean>}
 */
function checkUrlExists(url, timeoutMs = 3500) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return resolve(false);
    }
    try {
      const parsed = new URL(url);
      const req = https.request(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) UnityGameLauncher/0.2.0',
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          },
          timeout: timeoutMs,
        },
        (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 300);
        }
      );
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.on('error', () => {
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

/**
 * Helper to GET JSON from HTTPS with timeout.
 * @param {string} url
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<any>}
 */
function httpsGetJson(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) UnityGameLauncher/0.2.0',
            Accept: 'application/json',
          },
          timeout: timeoutMs,
        },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => {
            raw += chunk;
          });
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(JSON.parse(raw));
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
      req.on('error', () => {
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

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
      httpsGetJson(url, 4500).then((data) => {
        if (!data || !data.Product) return resolve(null);
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
      }).catch(() => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

class SteamDBImageService {
  constructor() {
    this.appDetailsCache = new Map();
    this.titleSearchCache = new Map();
    this.verifiedUrlsCache = new Map();
  }

  /**
   * Cached URL verification.
   * @param {string} url
   * @returns {Promise<boolean>}
   */
  async checkUrl(url) {
    if (this.verifiedUrlsCache.has(url)) {
      return this.verifiedUrlsCache.get(url);
    }
    const exists = await checkUrlExists(url);
    this.verifiedUrlsCache.set(url, exists);
    return exists;
  }

  /**
   * Generates candidate SteamDB and Steam static asset URLs by AppID.
   * @param {string} appId
   * @returns {object}
   */
  getCandidateUrls(appId) {
    const cleanId = String(appId).replace(/^steam_/, '').trim();
    return {
      covers: [
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/library_600x900.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${cleanId}/library_600x900.jpg`,
        `https://steamcdn-a.akamaihd.net/steam/apps/${cleanId}/library_600x900.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/library_hero.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${cleanId}/library_hero.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/capsule_616x353.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${cleanId}/capsule_616x353.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/header.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${cleanId}/header.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/page_bg_generated_v6b.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/capsule_231x87.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${cleanId}/capsule_231x87.jpg`,
      ],
      heroes: [
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/library_hero.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${cleanId}/library_hero.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/page_bg_generated_v6b.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/header.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${cleanId}/header.jpg`,
      ],
      logos: [
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/logo.png`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${cleanId}/logo.png`,
      ],
    };
  }

  /**
   * Search Steam Store Catalog to find AppID for non-Steam games or apps without AppID.
   * @param {string} title
   * @returns {Promise<string|null>}
   */
  async findAppIdByTitle(title) {
    const clean = cleanGameTitle(title);
    if (!clean) return null;

    const normKey = clean.toLowerCase();
    if (normKey in KNOWN_TITLE_APP_IDS) {
      return KNOWN_TITLE_APP_IDS[normKey];
    }

    if (this.titleSearchCache.has(normKey)) {
      return this.titleSearchCache.get(normKey);
    }

    try {
      const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(clean)}&l=english&cc=US`;
      const data = await httpsGetJson(url);
      const items = data?.items || [];
      if (items.length > 0) {
        const best = items[0];
        const appId = String(best.id);
        this.titleSearchCache.set(normKey, appId);
        return appId;
      }
    } catch (err) {
      console.error(`[SteamDBImageService] Search failed for "${title}":`, err);
    }

    this.titleSearchCache.set(normKey, null);
    return null;
  }

  /**
   * Fetch official store metadata from Steam.
   * @param {string} appId
   * @returns {Promise<object|null>}
   */
  async fetchStoreDetails(appId) {
    const cleanId = String(appId).replace(/^steam_/, '').trim();
    if (!cleanId || !/^\d+$/.test(cleanId)) return null;

    if (this.appDetailsCache.has(cleanId)) {
      return this.appDetailsCache.get(cleanId);
    }

    try {
      const url = `https://store.steampowered.com/api/appdetails?appids=${cleanId}&l=english`;
      const json = await httpsGetJson(url);
      if (json && json[cleanId] && json[cleanId].success && json[cleanId].data) {
        const data = json[cleanId].data;
        const details = {
          headerImage: data.header_image,
          capsuleImage: data.capsule_image,
          background: data.background || data.background_raw,
          screenshots: Array.isArray(data.screenshots)
            ? data.screenshots.map((s) => s.path_full || s.path_thumbnail).filter(Boolean)
            : [],
        };
        this.appDetailsCache.set(cleanId, details);
        return details;
      }
    } catch (err) {
      console.error(`[SteamDBImageService] App details lookup failed for ${cleanId}:`, err);
    }

    this.appDetailsCache.set(cleanId, null);
    return null;
  }

  /**
   * Find first working URL from a list of candidates.
   * @param {string[]} candidates
   * @returns {Promise<string|null>}
   */
  async findFirstWorkingUrl(candidates) {
    for (const url of candidates) {
      if (url && (await this.checkUrl(url))) {
        return url;
      }
    }
    return null;
  }

  /**
   * Enriches media for a single game object.
   * @param {object} game
   * @returns {Promise<{ changed: boolean, media: object }>}
   */
  async enrichGameMedia(game) {
    if (!game) return { changed: false, media: {} };

    const currentMedia = { ...(game.media || {}) };
    let changed = false;

    // Check if Xbox or Microsoft Store game needs artwork
    const isXbox = game.launcher === 'Xbox' || game.id?.startsWith('xbox_');
    if (isXbox && (!currentMedia.coverUrl || !currentMedia.heroUrl)) {
      const storeIdKey = game.title?.toLowerCase().trim();
      const storeId = KNOWN_STORE_IDS[storeIdKey] || KNOWN_STORE_IDS[cleanGameTitle(game.title).toLowerCase()];
      if (storeId) {
        const catalogArt = await fetchMicrosoftStoreArt(storeId);
        if (catalogArt) {
          if (!currentMedia.coverUrl && catalogArt.coverUrl) {
            currentMedia.coverUrl = catalogArt.coverUrl;
            changed = true;
          }
          if (!currentMedia.heroUrl && catalogArt.heroUrl) {
            currentMedia.heroUrl = catalogArt.heroUrl;
            changed = true;
          }
          if (!currentMedia.logoUrl && catalogArt.logoUrl) {
            currentMedia.logoUrl = catalogArt.logoUrl;
            changed = true;
          }
          if ((!currentMedia.screenshots || currentMedia.screenshots.length === 0) && catalogArt.screenshots?.length > 0) {
            currentMedia.screenshots = catalogArt.screenshots;
            changed = true;
          }
        }
      }
    }

    let coverWorking = Boolean(currentMedia.coverUrl && !currentMedia.coverUrl.includes('placeholder.com'));
    if (coverWorking) {
      coverWorking = await this.checkUrl(currentMedia.coverUrl);
    }

    let heroWorking = Boolean(currentMedia.heroUrl && !currentMedia.heroUrl.includes('placeholder.com'));
    if (heroWorking) {
      heroWorking = await this.checkUrl(currentMedia.heroUrl);
    }

    // If game already has both a verified reachable cover and hero backdrop, skip heavy network searches
    if (coverWorking && heroWorking) {
      return { changed, media: currentMedia };
    }

    // Determine target Steam AppID:
    // Only use game.appId if this is genuinely a Steam game.
    let targetAppId = null;
    if (game.launcher === 'Steam' || game.id?.startsWith('steam_')) {
      targetAppId = game.appId || (game.id ? game.id.replace('steam_', '') : null);
    } else if (game.title) {
      const cleanKey = cleanGameTitle(game.title).toLowerCase();
      if (cleanKey in KNOWN_TITLE_APP_IDS) {
        targetAppId = KNOWN_TITLE_APP_IDS[cleanKey];
      } else {
        targetAppId = await this.findAppIdByTitle(game.title);
      }
    }

    if (targetAppId) {
      const candidates = this.getCandidateUrls(targetAppId);
      const storeDetails = await this.fetchStoreDetails(targetAppId);

      // --- Resolve Cover ---
      if (!coverWorking) {
        const coverCandidates = [
          ...candidates.covers,
          ...(currentMedia.heroUrl && heroWorking ? [currentMedia.heroUrl] : []),
          ...(storeDetails?.headerImage ? [storeDetails.headerImage] : []),
          ...(storeDetails?.capsuleImage ? [storeDetails.capsuleImage] : []),
          ...(storeDetails?.background ? [storeDetails.background] : []),
        ];

        const workingCover = await this.findFirstWorkingUrl(coverCandidates);
        if (workingCover && workingCover !== currentMedia.coverUrl) {
          currentMedia.coverUrl = workingCover;
          changed = true;
          coverWorking = true;
        }
      }

      // --- Resolve Hero Banner ---
      if (!heroWorking) {
        const heroCandidates = [
          ...candidates.heroes,
          ...(currentMedia.coverUrl && coverWorking ? [currentMedia.coverUrl] : []),
          ...(storeDetails?.background ? [storeDetails.background] : []),
          ...(storeDetails?.screenshots?.[0] ? [storeDetails.screenshots[0]] : []),
        ];

        const workingHero = await this.findFirstWorkingUrl(heroCandidates);
        if (workingHero && workingHero !== currentMedia.heroUrl) {
          currentMedia.heroUrl = workingHero;
          changed = true;
          heroWorking = true;
        }
      }

      // --- Resolve Logo ---
      if (!currentMedia.logoUrl) {
        const workingLogo = await this.findFirstWorkingUrl(candidates.logos);
        if (workingLogo) {
          currentMedia.logoUrl = workingLogo;
          changed = true;
        }
      }

      // --- Resolve Screenshots ---
      if (!currentMedia.screenshots || currentMedia.screenshots.length === 0) {
        if (storeDetails?.screenshots?.length > 0) {
          currentMedia.screenshots = storeDetails.screenshots.slice(0, 8);
          changed = true;
        } else if (currentMedia.coverUrl) {
          currentMedia.screenshots = [currentMedia.coverUrl];
          changed = true;
        }
      }

      // --- Resolve Icon ---
      if (!currentMedia.iconUrl && currentMedia.coverUrl) {
        currentMedia.iconUrl = currentMedia.coverUrl;
        changed = true;
      }
    }

    // Fallback: If cover is not working or missing, but hero banner is verified working, heal cover
    if (!coverWorking && currentMedia.heroUrl && heroWorking) {
      currentMedia.coverUrl = currentMedia.heroUrl;
      changed = true;
      coverWorking = true;
    }

    // Fallback: If hero is not working or missing, but cover is verified working, heal hero
    if (!heroWorking && currentMedia.coverUrl && coverWorking) {
      currentMedia.heroUrl = currentMedia.coverUrl;
      changed = true;
      heroWorking = true;
    }

    return { changed, media: currentMedia };
  }

  /**
   * Enriches a full library of games concurrently with rate-limiting.
   * @param {Array<object>} games
   * @param {function} [onProgress]
   * @returns {Promise<{ updatedCount: number, games: Array<object> }>}
   */
  async enrichLibrary(games, onProgress) {
    if (!Array.isArray(games) || games.length === 0) {
      return { updatedCount: 0, games: [] };
    }

    let updatedCount = 0;
    const enrichedList = [...games];
    const concurrency = 4;

    for (let i = 0; i < enrichedList.length; i += concurrency) {
      const slice = enrichedList.slice(i, i + concurrency);
      await Promise.all(
        slice.map(async (game, sliceIdx) => {
          const globalIdx = i + sliceIdx;
          try {
            const { changed, media } = await this.enrichGameMedia(game);
            if (changed) {
              enrichedList[globalIdx] = {
                ...game,
                media,
              };
              updatedCount++;
            }
          } catch (err) {
            console.warn(`[SteamDBImageService] Failed to enrich game "${game.title}":`, err.message);
          }
        })
      );

      if (typeof onProgress === 'function') {
        const pct = Math.round((Math.min(i + concurrency, enrichedList.length) / enrichedList.length) * 100);
        onProgress(pct, enrichedList.length);
      }
    }

    return { updatedCount, games: enrichedList };
  }
}

module.exports = new SteamDBImageService();
