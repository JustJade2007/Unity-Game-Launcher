import { Game } from './game';

export interface AppPathsInfo {
  userDataDir: string;
  configPath: string;
  gamesPath: string;
  isPortable: boolean;
  appPath: string;
}

export interface AppConfig {
  version: string;
  theme: string;
  autoLaunchOnStartup: boolean;
  minimizeToTray: boolean;
  defaultViewMode: 'grid' | 'list';
  defaultSortField: string;
  defaultSortDirection: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface ElectronAPI {
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizedState: (callback: (isMax: boolean) => void) => () => void;
  getAppPaths: () => Promise<AppPathsInfo>;
  openConfigFolder: () => Promise<{ success: boolean; path?: string; error?: string }>;
  loadConfig: () => Promise<AppConfig | null>;
  saveConfig: (config: AppConfig) => Promise<{ success: boolean; error?: string }>;
  loadLibrary: () => Promise<Game[]>;
  saveLibrary: (games: Game[]) => Promise<{ success: boolean; error?: string }>;
  getLauncherStatus: () => Promise<import('./game').LauncherStatus[]>;
  syncLaunchers: (options?: { apiKey?: string; steamId?: string }) => Promise<{
    success: boolean;
    totalGames?: number;
    installedCount?: number;
    uninstalledCount?: number;
    games?: Game[];
    error?: string;
  }>;
  launchGame: (game: Game, launcher?: string) => Promise<{ success: boolean; uri?: string; error?: string }>;
  installGame: (game: Game, launcher?: string) => Promise<{ success: boolean; uri?: string; error?: string }>;
  getAchievements: (
    gameId?: string,
    launcher?: string,
    appId?: string
  ) => Promise<{
    success: boolean;
    achievements: import('./game').Achievement[];
    error?: string;
  }>;
  enrichGameMedia: (gameId: string) => Promise<{
    success: boolean;
    changed?: boolean;
    media?: import('./game').GameMedia;
    game?: Game;
    error?: string;
  }>;
  enrichAllMedia: () => Promise<{
    success: boolean;
    updatedCount?: number;
    games?: Game[];
    error?: string;
  }>;
  stopGameSession: (gameId: string) => Promise<{ success: boolean; session?: { gameId: string; durationMinutes: number; endedAt: string } }>;
  getActiveSessions: () => Promise<Array<{ gameId: string; gameTitle: string; durationMinutes: number; startTime: number }>>;
  onSessionStarted: (callback: (session: { gameId: string; gameTitle: string }) => void) => () => void;
  onSessionEnded: (callback: (session: { gameId: string; gameTitle: string; durationMinutes: number; endedAt: string }) => void) => () => void;
  isElectron?: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
