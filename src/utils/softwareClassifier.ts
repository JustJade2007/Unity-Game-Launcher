import { Game } from '../types/game';

export const SOFTWARE_CATEGORIES = new Set([
  'Utilities',
  'Software',
  'Tools',
  'Server',
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

export const SOFTWARE_TITLE_PATTERNS = /crosshair|scope x|mouse x|soundpad|voiceattack|voice attack|lossless scaling|wallpaper engine|dedicated server|test server|benchmark|sdk|utility|driver|virtual desktop|openvr|controller tester|blender|obs studio|git|discord|spotify|tiny desktop pal|desktop pal|vroid|tmodloader/i;

const KNOWN_SOFTWARE_TITLES = new Set([
  'crosshair x',
  'scope x',
  'mouse x',
  'tiny desktop pals',
  'voiceattack',
  'voice attack',
  'soundpad demo',
  'soundpad',
  'lossless scaling',
  'vroid studio',
  'insurgency sandstorm dedicated server',
  'insurgency: sandstorm dedicated server',
  'tom clancy s rainbow six siege test server',
  'tom clancy\'s rainbow six siege - test server',
  'tmodloader',
]);

/**
 * Normalizes title for dictionary checks
 */
function normalizeTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determines whether a game entry is a software application, utility, or server tool.
 */
export function isSoftwareGame(game: Partial<Game> | null | undefined): boolean {
  if (!game) return false;

  // 1. Explicit software flag
  if (game.isSoftware === true) return true;

  const rawTitle = game.title || '';
  const normTitle = normalizeTitle(rawTitle);

  // 2. Direct title match in known software set
  if (KNOWN_SOFTWARE_TITLES.has(rawTitle.toLowerCase().trim()) || KNOWN_SOFTWARE_TITLES.has(normTitle)) {
    return true;
  }

  // 3. Title regex pattern match
  if (SOFTWARE_TITLE_PATTERNS.test(rawTitle)) {
    return true;
  }

  // 4. Categories check
  const cats = Array.isArray(game.categories) ? game.categories : [];
  if (cats.some((c) => SOFTWARE_CATEGORIES.has(c))) {
    return true;
  }

  return false;
}

/**
 * Checks if a category name is exclusive to software/tools
 */
export function isSoftwareCategory(categoryName: string): boolean {
  return SOFTWARE_CATEGORIES.has(categoryName);
}
