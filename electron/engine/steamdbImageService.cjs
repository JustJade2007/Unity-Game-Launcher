const https = require('https');

/**
 * Clean a game title to improve Steam catalog matching.
 * @param {string} title
 * @returns {string}
 */
function cleanGameTitle(title) {
  if (!title) return '';
  return title
    .replace(/[™®©]/g, '')
    .replace(/\b(GOTY|Game of the Year|Deluxe|Standard|Collector's|Definitive|Enhanced|Gold|Ultimate|Special)\s*(Edition|Bundle)?\b/gi, '')
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

class SteamDBImageService {
  constructor() {
    this.appDetailsCache = new Map();
    this.titleSearchCache = new Map();
    this.verifiedUrlsCache = new Map(); // url -> boolean
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
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/capsule_616x353.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/header.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${cleanId}/header.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/capsule_231x87.jpg`,
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

    if (this.titleSearchCache.has(clean.toLowerCase())) {
      return this.titleSearchCache.get(clean.toLowerCase());
    }

    try {
      const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(clean)}&l=english&cc=US`;
      const data = await httpsGetJson(url);
      const items = data?.items || [];
      if (items.length > 0) {
        // Pick the top matching item
        const best = items[0];
        const appId = String(best.id);
        this.titleSearchCache.set(clean.toLowerCase(), appId);
        return appId;
      }
    } catch (err) {
      console.error(`[SteamDBImageService] Search failed for "${title}":`, err);
    }

    this.titleSearchCache.set(clean.toLowerCase(), null);
    return null;
  }

  /**
   * Fetch official store metadata (with exact CDN hashes) from Steam.
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
   * Resolves valid cover, hero banner, logo, and screenshots using SteamDB & Steam static CDNs.
   * @param {object} game
   * @returns {Promise<{ changed: boolean, media: object }>}
   */
  async enrichGameMedia(game) {
    if (!game) return { changed: false, media: {} };

    const currentMedia = { ...(game.media || {}) };
    let changed = false;

    // 1. Determine target Steam AppID (either existing or by searching title)
    let targetAppId = game.appId || (game.id?.startsWith('steam_') ? game.id.replace('steam_', '') : null);

    if (!targetAppId && game.title) {
      targetAppId = await this.findAppIdByTitle(game.title);
      if (targetAppId) {
        changed = true;
      }
    }

    // 2. Test current cover image validity
    let coverWorking = false;
    if (currentMedia.coverUrl && !currentMedia.coverUrl.includes('placeholder.com')) {
      coverWorking = await this.checkUrl(currentMedia.coverUrl);
    }

    let heroWorking = false;
    if (currentMedia.heroUrl) {
      heroWorking = await this.checkUrl(currentMedia.heroUrl);
    }

    // If both cover and hero are already working and screenshots exist, no enrichment needed
    if (coverWorking && heroWorking && currentMedia.screenshots?.length > 0) {
      return { changed: false, media: currentMedia };
    }

    // 3. If we have a target AppID, query SteamDB candidates & store details
    if (targetAppId) {
      const candidates = this.getCandidateUrls(targetAppId);
      const storeDetails = await this.fetchStoreDetails(targetAppId);

      // --- Resolve Cover ---
      if (!coverWorking) {
        const coverCandidates = [
          ...candidates.covers,
          ...(storeDetails?.headerImage ? [storeDetails.headerImage] : []),
          ...(storeDetails?.capsuleImage ? [storeDetails.capsuleImage] : []),
        ];

        const workingCover = await this.findFirstWorkingUrl(coverCandidates);
        if (workingCover && workingCover !== currentMedia.coverUrl) {
          currentMedia.coverUrl = workingCover;
          changed = true;
        }
      }

      // --- Resolve Hero Banner ---
      if (!heroWorking) {
        const heroCandidates = [
          ...candidates.heroes,
          ...(storeDetails?.background ? [storeDetails.background] : []),
          ...(storeDetails?.screenshots?.[0] ? [storeDetails.screenshots[0]] : []),
        ];

        const workingHero = await this.findFirstWorkingUrl(heroCandidates);
        if (workingHero && workingHero !== currentMedia.heroUrl) {
          currentMedia.heroUrl = workingHero;
          changed = true;
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
              enrichedList[globalIdx] = { ...game, media };
              updatedCount++;
            }
          } catch (err) {
            console.error(`[SteamDBImageService] Error enriching game "${game.title}":`, err);
          }
        })
      );

      if (typeof onProgress === 'function') {
        onProgress(Math.min(i + concurrency, enrichedList.length), enrichedList.length);
      }
    }

    return { updatedCount, games: enrichedList };
  }
}

module.exports = new SteamDBImageService();
