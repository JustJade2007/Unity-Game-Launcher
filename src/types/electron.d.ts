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
  isElectron?: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
