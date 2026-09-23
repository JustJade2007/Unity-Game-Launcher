export type LauncherType = 'Steam' | 'Epic Games' | 'GOG' | 'EA' | 'Ubisoft' | 'Xbox' | 'Battle.net' | 'Local';

export type FriendStatus = 'playing_now' | 'online' | 'away' | 'offline';

export interface FriendActivity {
  id: string;
  name: string;
  avatarUrl: string;
  status: FriendStatus;
  currentActivity?: string; // e.g. "Chapter 3: Night City Outskirts", "In Menu"
  playtimeHours: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
  unlocked: boolean;
  unlockedAt?: string; // ISO date string
  rarityPercentage: number; // e.g. 14.5
  points?: number; // e.g. 25
  isSecret?: boolean;
}

export interface GameMedia {
  coverUrl: string;       // Vertical poster (approx 2:3 aspect ratio, e.g. 600x900)
  heroUrl: string;        // Wide cinematic backdrop (16:9)
  logoUrl?: string;       // Transparent PNG logo
  screenshots: string[];  // In-game screenshots
  iconUrl?: string;       // Mini launcher icon
}

export interface GamePlaytime {
  totalMinutes: number;   // Lifetime minutes
  lastPlayed?: string;    // ISO date string
  recentMinutes?: number; // Minutes played in the last 2 weeks
}

export interface OwnershipSource {
  launcher: LauncherType;
  gameId: string;
  installed: boolean;
  installPath?: string;
  launchUri?: string;
  installUri?: string;
}

export interface LauncherStatus {
  id: LauncherType;
  name: string;
  installed: boolean;
  accountName?: string;
  accountId?: string;
  clientPath?: string;
  gameCount: number;
  isSyncing?: boolean;
  error?: string;
}

export interface Game {
  id: string;
  appId?: string;
  title: string;
  tagline: string;
  description: string;
  developer: string;
  publisher: string;
  releaseDate: string;
  categories: string[];
  launcher: LauncherType;
  installed: boolean;
  installPath?: string;
  launchUri?: string;
  installUri?: string;
  sizeGb?: number;
  playtime: GamePlaytime;
  media: GameMedia;
  achievements: Achievement[];
  friends: FriendActivity[];
  favorite?: boolean;
  hidden?: boolean;
  isCustom?: boolean;
  executablePath?: string;
  launchArguments?: string;
  workingDirectory?: string;
  sourceDirectory?: string;
  version?: string;
  ownershipSources?: OwnershipSource[];
  needsCloudUpload?: boolean;
  isSoftware?: boolean;
  tags?: string[];
  dateAdded?: string;
}

export type ViewMode = 'grid' | 'detailed' | 'spotlight';

export type SortField =
  | 'title'
  | 'playtime'
  | 'lastPlayed'
  | 'releaseDate'
  | 'dateAdded'
  | 'genre'
  | 'launcher';

export type SortDirection = 'asc' | 'desc';

export type SmartCollectionType = 'all' | 'unplayed' | 'recently_added' | 'backlog' | 'completed' | string;

export interface FilterState {
  searchQuery: string;
  selectedCategory: string | null;
  selectedLauncher: LauncherType | null;
  selectedTags: string[];
  activeSmartCollection: SmartCollectionType | null;
  onlyFavorites: boolean;
  onlyInstalled: boolean;
  onlySoftware: boolean;
  showHidden: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
}

