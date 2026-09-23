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

const SOFTWARE_TITLE_PATTERNS = /crosshair|scope x|mouse x|soundpad|voiceattack|voice attack|lossless scaling|wallpaper engine|dedicated server|test server|benchmark|sdk|utility|driver|virtual desktop|openvr|controller tester|blender|obs studio|git|discord|spotify|tiny desktop pal|desktop pal|vroid|tmodloader/i;
const SERVER_PATTERNS = /dedicated server|server tool|multiplayer server|test server/i;

// Curated accurate genres for prominent games and software
const KNOWN_GAME_CATEGORIES = {
  // Sandbox, Survival & Adventure
  minecraft: ['Sandbox', 'Survival', 'Adventure'],
  'minecraft for windows': ['Sandbox', 'Survival', 'Adventure'],
  'minecraft uwp': ['Sandbox', 'Survival', 'Adventure'],
  'minecraft launcher': ['Utilities', 'Software'],
  palworld: ['Adventure', 'Survival', 'RPG'],
  'lethal company': ['Action', 'Survival', 'Co-op', 'Indie'],
  subnautica: ['Adventure', 'Survival', 'Indie'],
  'subnautica below zero': ['Adventure', 'Survival', 'Indie'],
  'stardew valley': ['Simulation', 'RPG', 'Indie'],
  'among us': ['Casual', 'Party', 'Indie'],
  phasmophobia: ['Action', 'Horror', 'Indie'],

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
  plateup: ['Simulation', 'Casual', 'Co-op'],
  'yu gi oh master duel': ['Strategy', 'Card Game'],
  'peggle deluxe': ['Casual', 'Puzzle'],
  'how to fish': ['Casual', 'Indie', 'Simulation'],
  'meccha chameleon': ['Casual', 'Indie'],
  'starcraft ii': ['Strategy', 'RTS'],
  'starcraft 2': ['Strategy', 'RTS'],
  hearthstone: ['Strategy', 'Card Game'],
  'the sims 4': ['Simulation'],
  'jurassic world evolution': ['Simulation', 'Strategy'],
  'x4 foundations': ['Simulation', 'Space', 'Strategy'],
  everspace: ['Action', 'Space', 'Roguelike'],
  forts: ['Strategy', 'Action', 'Indie'],
  'oxygen not included': ['Simulation', 'Strategy', 'Indie'],
  'the lab': ['Simulation', 'VR'],
  'rec room': ['Casual', 'VR', 'Social'],
  '911 operator': ['Simulation', 'Strategy', 'Indie'],
  'the escapists 2': ['Strategy', 'Simulation', 'Indie'],
  'star trek bridge crew': ['Simulation', 'VR', 'Co-op'],
  'golf with your friends': ['Sports', 'Casual', 'Indie'],
  votv: ['Simulation', 'Horror', 'Indie'],
  'chained together': ['Action', 'Casual', 'Indie'],
  'content warning': ['Action', 'Casual', 'Indie'],
  webfishing: ['Casual', 'Simulation', 'Indie'],
  peak: ['Casual', 'Indie'],

  // RPG & Turn-Based
  'baldurs gate 3': ['RPG', 'Adventure', 'Strategy'],
  'cyberpunk 2077': ['RPG', 'Action', 'Open World'],
  'fallout new vegas': ['RPG', 'Action', 'Open World'],
  'fallout 4': ['RPG', 'Action', 'Open World'],
  'fallout shelter': ['Simulation', 'Strategy'],
  'world of warcraft': ['MMORPG', 'RPG'],
  'diablo iv': ['Action RPG', 'RPG'],
  'the witcher 3 wild hunt': ['RPG', 'Adventure'],

  // Racing & Sports
  'f1 24': ['Racing', 'Sports'],
  'f1 23': ['Racing', 'Sports'],
  'f1 manager 2022': ['Strategy', 'Simulation', 'Sports'],
  'f1 manager 2024': ['Strategy', 'Simulation', 'Sports'],
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
  'hitman 2': ['Action', 'Stealth'],
  watch_dogs: ['Action', 'Adventure', 'Open World'],
  'watch dogs legion': ['Action', 'Adventure', 'Open World'],
  'ghost recon breakpoint': ['Action', 'Shooter', 'Open World'],
  'tom clancy s ghost recon breakpoint': ['Action', 'Shooter', 'Open World'],
  'grand theft auto v': ['Action', 'Adventure', 'Open World'],
  'grand theft auto v enhanced': ['Action', 'Adventure', 'Open World'],
  doom: ['Action', 'Shooter', 'FPS'],
  'destiny 2': ['Action', 'Shooter', 'FPS'],
  'battlefield 2042': ['Action', 'Shooter', 'FPS'],
  'overwatch 2': ['Action', 'Shooter', 'FPS'],
  'the finals': ['Action', 'Shooter', 'FPS'],
  'delta force': ['Action', 'Shooter', 'FPS'],
  splitgate: ['Action', 'Shooter', 'FPS'],
  'death stranding': ['Action', 'Adventure', 'Open World'],
  'death stranding director s cut': ['Action', 'Adventure', 'Open World'],
  'starship troopers extermination': ['Action', 'Shooter', 'FPS'],
  'a way out': ['Action', 'Adventure', 'Co-op'],

  // Software & Utilities (guaranteed no Action tag)
  'crosshair x': ['Utilities', 'Software'],
  'scope x': ['Utilities', 'Software'],
  'mouse x': ['Utilities', 'Software', 'Design & Illustration'],
  'tiny desktop pals': ['Utilities', 'Software'],
  'lossless scaling': ['Utilities', 'Software'],
  voiceattack: ['Utilities', 'Software'],
  'soundpad demo': ['Utilities', 'Software', 'Audio Production'],
  soundpad: ['Utilities', 'Software', 'Audio Production'],
  'vroid studio': ['Animation & Modeling', 'Design & Illustration', 'Software'],
  'insurgency sandstorm dedicated server': ['Tools', 'Server'],
  tmodloader: ['Tools', 'Utilities', 'Software'],
  'tom clancy s rainbow six siege test server': ['Tools', 'Server'],
  'rainbow six siege test server': ['Tools', 'Server'],
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
  if (/sandbox|survival|craft/i.test(title)) { cats.push('Sandbox'); cats.push('Survival'); }

  if (cats.length > 0) {
    return cats;
  }

  // 6. Existing categories cleanup (remove launcher names)
  const existing = Array.isArray(game?.categories)
    ? game.categories.filter((c) => !LAUNCHER_NAMES.has(c))
    : [];

  if (existing.length > 0) {
    return existing;
  }

  // 7. Neutral default
  return ['Action'];
}

/**
 * Determines if a game item is a software application, utility, or server tool.
 * @param {object} game
 * @returns {boolean}
 */
function isSoftwareItem(game) {
  if (!game) return false;
  if (game.isSoftware === true) return true;

  const title = game.title || '';
  const norm = normalizeTitle(title);

  if (norm in KNOWN_GAME_CATEGORIES) {
    const cats = KNOWN_GAME_CATEGORIES[norm];
    if (cats.some((c) => c === 'Software' || c === 'Utilities' || c === 'Tools' || c === 'Server')) {
      return true;
    }
  }

  if (SOFTWARE_TITLE_PATTERNS.test(title)) {
    return true;
  }

  const cats = Array.isArray(game.categories) ? game.categories : [];
  if (cats.some((c) => SOFTWARE_GENRES.has(c) || c === 'Software' || c === 'Utilities' || c === 'Tools' || c === 'Server')) {
    return true;
  }

  return false;
}

module.exports = {
  resolveGameCategories,
  isSoftwareItem,
  SOFTWARE_GENRES,
  LAUNCHER_NAMES,
  SOFTWARE_TITLE_PATTERNS,
};
