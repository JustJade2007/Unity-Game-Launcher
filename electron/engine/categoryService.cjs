/**
 * Category & Genre Classification Engine
 * Accurately categorizes games and software utilities, removing inaccurate "Action" tags.
 */

const SOFTWARE_GENRES = new Set([
  'Utilities',
  'Software Training',
  'Animation & Modeling',
  'Audio Production',
  'Video Production',
  'Design & Illustration',
  'Photo Editing',
  'Web Publishing',
  'Game Development',
  'Accounting',
  'Education',
]);

const LAUNCHER_NAMES = new Set([
  'Steam',
  'Epic Games',
  'Epic',
  'GOG',
  'GOG Galaxy',
  'EA',
  'EA App',
  'Origin',
  'Ubisoft',
  'Ubisoft Connect',
  'Uplay',
  'Xbox',
  'Xbox App',
  'Microsoft Store',
  'Battle.net',
  'Blizzard',
  'Local',
  'Custom',
]);

const SOFTWARE_TITLE_PATTERNS = /crosshair|scope x|mouse x|soundpad|voiceattack|lossless scaling|wallpaper engine|dedicated server|benchmark|sdk|utility|driver|virtual desktop|openvr|controller tester|blender|obs studio|git|discord|spotify/i;
const SERVER_PATTERNS = /dedicated server|server tool|multiplayer server/i;

// Curated accurate genres for prominent games and software
const KNOWN_GAME_CATEGORIES = {
  // Strategy, Card, & Simulation
  balatro: ['Strategy', 'Casual', 'Indie'],
  'manor lords': ['Strategy', 'Simulation'],
  rimworld: ['Strategy', 'Simulation', 'Survival'],
  'beamng drive': ['Simulation', 'Driving'],
  'garry s mod': ['Simulation', 'Casual', 'Indie'],
  'garrys mod': ['Simulation', 'Casual', 'Indie'],
  'carrier command 2': ['Strategy', 'Simulation'],
  'sins of a solar empire rebellion': ['Strategy', 'Sci-Fi'],
  'sins of a solar empire trinity': ['Strategy', 'Sci-Fi'],
  'kerbal space program': ['Simulation', 'Space', 'Indie'],
  'brick rigs': ['Simulation', 'Sandbox'],
  barotrauma: ['Simulation', 'Survival', 'Co-op'],
  'dungeons degenerate gamblers': ['Strategy', 'Casual', 'Indie'],
  'plateup': ['Simulation', 'Casual', 'Co-op'],
  'yu gi oh master duel': ['Strategy', 'Card Game'],
  'tiny desktop pals': ['Casual', 'Simulation'],
  'peggle deluxe': ['Casual', 'Puzzle'],
  'how to fish': ['Casual', 'Indie', 'Simulation'],
  'meccha chameleon': ['Casual', 'Indie'],

  // RPG & Turn-Based
  'baldurs gate 3': ['RPG', 'Adventure', 'Strategy'],
  'cyberpunk 2077': ['RPG', 'Action', 'Open World'],
  'fallout new vegas': ['RPG', 'Action', 'Open World'],
  'the witcher 3 wild hunt': ['RPG', 'Adventure'],

  // Racing & Sports
  'f1 24': ['Racing', 'Sports'],
  'super battle golf': ['Sports', 'Casual', 'Indie'],
  'wheelmates friend s pass': ['Racing', 'Indie'],

  // Puzzle & Adventure
  'portal 2': ['Puzzle', 'Adventure', 'Co-op'],
  portal: ['Puzzle', 'Action'],
  terraria: ['Adventure', 'RPG', 'Sandbox', 'Indie'],

  // Shooter & Action
  'counter strike 2': ['Action', 'Shooter', 'FPS'],
  'tom clancy s rainbow six siege': ['Action', 'Shooter', 'FPS'],
  'rainbow six siege': ['Action', 'Shooter', 'FPS'],
  'left 4 dead 2': ['Action', 'Co-op', 'Shooter'],
  'arma 3': ['Simulation', 'Tactical', 'Shooter'],
  'insurgency sandstorm': ['Action', 'Shooter', 'FPS'],
  'helldivers 2': ['Action', 'Shooter', 'Co-op'],
  'sniper elite 5': ['Action', 'Adventure', 'Shooter'],
  'red dead redemption 2': ['Action', 'Adventure', 'Open World'],
  'hollow knight': ['Action', 'Adventure', 'Indie'],
  'star wars battlefront ii': ['Action', 'Shooter', 'Sci-Fi'],
  'star wars jedi survivor': ['Action', 'Adventure', 'Sci-Fi'],
  'star wars jedi fallen order': ['Action', 'Adventure', 'Sci-Fi'],
  'hitman world of assassination': ['Action', 'Stealth'],
  watch_dogs: ['Action', 'Adventure', 'Open World'],
  'grand theft auto v': ['Action', 'Adventure', 'Open World'],

  // Software & Utilities (guaranteed no Action tag)
  'crosshair x': ['Utilities', 'Software'],
  'scope x': ['Utilities', 'Software'],
  'mouse x': ['Utilities', 'Software', 'Design & Illustration'],
  'lossless scaling': ['Utilities', 'Software'],
  voiceattack: ['Utilities', 'Software'],
  'soundpad demo': ['Utilities', 'Software', 'Audio Production'],
  soundpad: ['Utilities', 'Software', 'Audio Production'],
  'vroid studio': ['Animation & Modeling', 'Design & Illustration', 'Software'],
  'insurgency sandstorm dedicated server': ['Tools', 'Server'],
};

/**
 * Normalizes title for lookup dictionary.
 * @param {string} title
 * @returns {string}
 */
function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves accurate categories for a game or software utility.
 * @param {object} game
 * @param {object} [storeData]
 * @returns {string[]}
 */
function resolveGameCategories(game, storeData = null) {
  const title = game?.title || '';
  const normTitle = normalizeTitle(title);

  // 1. Direct dictionary lookup for verified curated entries
  if (normTitle in KNOWN_GAME_CATEGORIES) {
    return [...KNOWN_GAME_CATEGORIES[normTitle]];
  }

  const genres = Array.isArray(storeData?.genres) ? storeData.genres : [];
  const type = storeData?.type || '';

  const hasSoftwareGenre = genres.some((g) => SOFTWARE_GENRES.has(g));
  const isSoftwareTitle = SOFTWARE_TITLE_PATTERNS.test(title);
  const isSoftwareType = type === 'software' || type === 'tool';
  const isDedicatedServer = SERVER_PATTERNS.test(title);

  // 2. Dedicated Servers & Multiplayer Daemons
  if (isDedicatedServer) {
    return ['Tools', 'Server'];
  }

  // 3. Software, Utilities, & Productivity Tools
  // CRITICAL: Guaranteed exclusion of 'Action', 'Adventure', or gaming genres from software
  if (hasSoftwareGenre || isSoftwareTitle || isSoftwareType) {
    const cats = new Set();
    cats.add('Utilities');
    cats.add('Software');
    genres.forEach((g) => {
      if (SOFTWARE_GENRES.has(g)) {
        cats.add(g);
      }
    });
    return Array.from(cats);
  }

  // 4. Official Store Genres (filtered and stripped of launcher and meta tags)
  if (genres.length > 0) {
    const filtered = genres.filter(
      (g) =>
        g !== 'Free To Play' &&
        g !== 'Free to Play' &&
        g !== 'Early Access' &&
        !LAUNCHER_NAMES.has(g)
    );
    const chosen = filtered.length > 0 ? filtered : genres.filter((g) => !LAUNCHER_NAMES.has(g));
    if (chosen.length > 0) {
      return chosen.slice(0, 4);
    }
  }

  // 5. Intelligent Title Keyword Heuristics
  const cats = [];
  if (/simulator|sim\b/i.test(title)) cats.push('Simulation');
  if (/racing|rally|speed|kart|motorsport/i.test(title)) cats.push('Racing');
  if (/football|fifa|madden|nba|golf|tennis|baseball|hockey/i.test(title)) cats.push('Sports');
  if (/strategy|tactics|empire|warhammer|crusader|civilization|command/i.test(title)) cats.push('Strategy');
  if (/rpg|quest|witcher|scrolls|fantasy|souls/i.test(title)) cats.push('RPG');
  if (/shooter|sniper|combat|warfare|strike/i.test(title)) cats.push('Shooter');
  if (/puzzle|tetris|logic|chess|card/i.test(title)) cats.push('Puzzle');
  if (/adventure|journey|chronicles/i.test(title)) cats.push('Adventure');

  if (cats.length > 0) {
    return cats;
  }

  // 6. Existing categories cleanup (remove launcher names and stray fake Action)
  const existing = Array.isArray(game?.categories)
    ? game.categories.filter((c) => !LAUNCHER_NAMES.has(c))
    : [];

  // If existing is simply ['Action'] without specific basis, default to 'Indie' instead of forcing Action
  if (existing.length === 1 && existing[0] === 'Action') {
    return ['Indie'];
  }

  if (existing.length > 0) {
    return existing;
  }

  // 7. Neutral default
  return ['Indie'];
}

module.exports = {
  resolveGameCategories,
  SOFTWARE_GENRES,
  LAUNCHER_NAMES,
  SOFTWARE_TITLE_PATTERNS,
};
