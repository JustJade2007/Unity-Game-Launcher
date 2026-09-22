import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Game, LauncherType, ViewMode, SortField, SortDirection, FilterState, LauncherStatus } from '../types/game';

interface LibraryContextType {
  games: Game[];
  selectedGame: Game | null;
  setSelectedGame: (game: Game | null) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  filters: FilterState;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  setSelectedLauncher: (launcher: LauncherType | null) => void;
  toggleFavoritesOnly: () => void;
  toggleInstalledOnly: () => void;
  setSorting: (field: SortField, direction: SortDirection) => void;
  toggleFavorite: (gameId: string) => void;
  addGame: (game: Game) => void;
  removeGame: (gameId: string) => void;
  filteredGames: Game[];
  allCategories: { name: string; count: number }[];
  allLaunchers: { name: LauncherType; count: number }[];
  totalPlaytimeHours: number;
  totalGamesCount: number;
  // Launcher integration & syncing
  launcherStatuses: LauncherStatus[];
  isSyncing: boolean;
  syncError: string | null;
  refreshLauncherStatuses: () => Promise<void>;
  syncLaunchers: (options?: { apiKey?: string; steamId?: string }) => Promise<{ success: boolean; totalGames?: number; error?: string }>;
  launchGame: (game: Game, launcher?: LauncherType) => Promise<boolean>;
  installGame: (game: Game, launcher?: LauncherType) => Promise<boolean>;
  hasPendingCloudUploads: boolean;
  markCloudUploaded: () => void;
}

const STORAGE_KEY = 'unity_launcher_games';
const PENDING_UPLOAD_KEY = 'unity_launcher_pending_uploads';

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse errors and fallback to empty
    }
    return [];
  });

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [launcherStatuses, setLauncherStatuses] = useState<LauncherStatus[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasPendingCloudUploads, setHasPendingCloudUploads] = useState<boolean>(() => {
    return localStorage.getItem(PENDING_UPLOAD_KEY) === 'true';
  });

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedCategory: null,
    selectedLauncher: null,
    onlyFavorites: false,
    onlyInstalled: false,
    sortField: 'lastPlayed',
    sortDirection: 'desc',
  });

  const refreshLauncherStatuses = async () => {
    if (window.electronAPI?.getLauncherStatus) {
      try {
        const statuses = await window.electronAPI.getLauncherStatus();
        setLauncherStatuses(statuses);
      } catch (err) {
        console.error('Failed to get launcher statuses:', err);
      }
    }
  };

  // Load games from external file system if running in Electron
  useEffect(() => {
    if (window.electronAPI?.loadLibrary) {
      window.electronAPI.loadLibrary().then(async (diskGames) => {
        if (Array.isArray(diskGames) && diskGames.length > 0) {
          setGames(diskGames);
        } else {
          // If library is empty, automatically discover installed and owned titles
          if (window.electronAPI?.syncLaunchers) {
            try {
              const res = await window.electronAPI.syncLaunchers();
              if (res.success && Array.isArray(res.games) && res.games.length > 0) {
                setGames(res.games);
              }
            } catch (err) {
              console.error('Initial auto-sync error:', err);
            }
          }
        }
      }).catch(console.error);

      refreshLauncherStatuses();
    }
  }, []);

  // Listen for active game session events
  useEffect(() => {
    if (window.electronAPI?.onSessionEnded) {
      const unsub = window.electronAPI.onSessionEnded((session) => {
        setGames((prev) =>
          prev.map((g) => {
            if (g.id === session.gameId) {
              const prevMins = g.playtime?.totalMinutes || 0;
              return {
                ...g,
                playtime: {
                  ...g.playtime,
                  totalMinutes: prevMins + session.durationMinutes,
                  lastPlayed: session.endedAt,
                },
              };
            }
            return g;
          })
        );
        setHasPendingCloudUploads(true);
        localStorage.setItem(PENDING_UPLOAD_KEY, 'true');
      });
      return unsub;
    }
  }, []);

  // Persist games changes to localStorage and external disk file
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    } catch {
      // LocalStorage error handling
    }

    if (window.electronAPI?.saveLibrary) {
      window.electronAPI.saveLibrary(games).catch(console.error);
    }
  }, [games]);

  const syncLaunchers = async (options?: { apiKey?: string; steamId?: string }) => {
    if (!window.electronAPI?.syncLaunchers) {
      return { success: false, error: 'Electron runtime not detected' };
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await window.electronAPI.syncLaunchers(options);
      if (result.success && Array.isArray(result.games)) {
        setGames(result.games);
        setHasPendingCloudUploads(true);
        localStorage.setItem(PENDING_UPLOAD_KEY, 'true');
        await refreshLauncherStatuses();
        return { success: true, totalGames: result.totalGames };
      } else {
        const errorMsg = result.error || 'Failed to sync launchers';
        setSyncError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown sync error';
      setSyncError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsSyncing(false);
    }
  };

  const launchGame = async (game: Game, launcher?: LauncherType): Promise<boolean> => {
    if (window.electronAPI?.launchGame) {
      const res = await window.electronAPI.launchGame(game, launcher);
      return Boolean(res?.success);
    }
    return false;
  };

  const installGame = async (game: Game, launcher?: LauncherType): Promise<boolean> => {
    if (window.electronAPI?.installGame) {
      const res = await window.electronAPI.installGame(game, launcher);
      return Boolean(res?.success);
    }
    return false;
  };

  const markCloudUploaded = () => {
    setHasPendingCloudUploads(false);
    localStorage.setItem(PENDING_UPLOAD_KEY, 'false');
  };

  const selectedGame = useMemo(() => {
    if (!selectedGameId) {
      return games.length > 0 ? games[0] : null;
    }
    return games.find((g) => g.id === selectedGameId) || (games.length > 0 ? games[0] : null);
  }, [games, selectedGameId]);

  const setSelectedGame = (game: Game | null) => {
    setSelectedGameId(game ? game.id : null);
  };

  const setSearchQuery = (query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  };

  const setSelectedCategory = (category: string | null) => {
    setFilters((prev) => ({ ...prev, selectedCategory: category }));
  };

  const setSelectedLauncher = (launcher: LauncherType | null) => {
    setFilters((prev) => ({ ...prev, selectedLauncher: launcher }));
  };

  const toggleFavoritesOnly = () => {
    setFilters((prev) => ({ ...prev, onlyFavorites: !prev.onlyFavorites }));
  };

  const toggleInstalledOnly = () => {
    setFilters((prev) => ({ ...prev, onlyInstalled: !prev.onlyInstalled }));
  };

  const setSorting = (sortField: SortField, sortDirection: SortDirection) => {
    setFilters((prev) => ({ ...prev, sortField, sortDirection }));
  };

  const toggleFavorite = (gameId: string) => {
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, favorite: !g.favorite } : g))
    );
  };

  const addGame = (game: Game) => {
    setGames((prev) => [...prev.filter((g) => g.id !== game.id), game]);
  };

  const removeGame = (gameId: string) => {
    setGames((prev) => prev.filter((g) => g.id !== gameId));
  };

  // Filter and sort games
  const filteredGames = useMemo(() => {
    return games
      .filter((game) => {
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          const matchTitle = game.title.toLowerCase().includes(q);
          const matchTagline = game.tagline.toLowerCase().includes(q);
          const matchCategory = game.categories.some((c) => c.toLowerCase().includes(q));
          if (!matchTitle && !matchTagline && !matchCategory) return false;
        }

        if (filters.selectedCategory) {
          if (!game.categories.includes(filters.selectedCategory)) return false;
        }

        if (filters.selectedLauncher) {
          if (game.launcher !== filters.selectedLauncher) return false;
        }

        if (filters.onlyFavorites && !game.favorite) return false;
        if (filters.onlyInstalled && !game.installed) return false;

        return true;
      })
      .sort((a, b) => {
        let compare = 0;
        if (filters.sortField === 'title') {
          compare = a.title.localeCompare(b.title);
        } else if (filters.sortField === 'playtime') {
          compare = a.playtime.totalMinutes - b.playtime.totalMinutes;
        } else if (filters.sortField === 'lastPlayed') {
          const dateA = a.playtime.lastPlayed ? new Date(a.playtime.lastPlayed).getTime() : 0;
          const dateB = b.playtime.lastPlayed ? new Date(b.playtime.lastPlayed).getTime() : 0;
          compare = dateA - dateB;
        } else if (filters.sortField === 'releaseDate') {
          compare = new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
        }

        return filters.sortDirection === 'asc' ? compare : -compare;
      });
  }, [games, filters]);

  // Aggregate categories
  const allCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    games.forEach((g) => {
      g.categories.forEach((cat) => {
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [games]);

  // Aggregate launchers
  const allLaunchers = useMemo(() => {
    const counts: Record<LauncherType, number> = {
      Steam: 0,
      'Epic Games': 0,
      GOG: 0,
      EA: 0,
      Ubisoft: 0,
      Xbox: 0,
      'Battle.net': 0,
      Local: 0,
    };
    games.forEach((g: Game) => {
      if (counts[g.launcher] !== undefined) {
        counts[g.launcher] = (counts[g.launcher] || 0) + 1;
      }
    });
    return (Object.entries(counts) as [LauncherType, number][])
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({ name, count }));
  }, [games]);

  const totalPlaytimeHours = useMemo(() => {
    const totalMinutes = games.reduce((acc, g) => acc + g.playtime.totalMinutes, 0);
    return Math.round((totalMinutes / 60) * 10) / 10;
  }, [games]);

  return (
    <LibraryContext.Provider
      value={{
        games,
        selectedGame,
        setSelectedGame,
        viewMode,
        setViewMode,
        filters,
        setSearchQuery,
        setSelectedCategory,
        setSelectedLauncher,
        toggleFavoritesOnly,
        toggleInstalledOnly,
        setSorting,
        toggleFavorite,
        addGame,
        removeGame,
        filteredGames,
        allCategories,
        allLaunchers,
        totalPlaytimeHours,
        totalGamesCount: games.length,
        launcherStatuses,
        isSyncing,
        syncError,
        refreshLauncherStatuses,
        syncLaunchers,
        launchGame,
        installGame,
        hasPendingCloudUploads,
        markCloudUploaded,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
