import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Game, LauncherType, ViewMode, SortField, SortDirection, FilterState, LauncherStatus, Achievement } from '../types/game';
import { isSoftwareGame, isSoftwareCategory } from '../utils/softwareClassifier';

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
  toggleSoftwareOnly: () => void;
  setSorting: (field: SortField, direction: SortDirection) => void;
  toggleFavorite: (gameId: string) => void;
  addGame: (game: Game) => void;
  updateGame: (game: Game) => void;
  removeGame: (gameId: string) => void;
  deleteGame: (gameId: string) => Promise<boolean>;
  toggleHideGame: (gameId: string) => void;
  rescanGame: (gameId: string) => Promise<{ success: boolean; game?: Game; error?: string }>;
  toggleShowHidden: () => void;
  hiddenGamesCount: number;
  filteredGames: Game[];
  allCategories: { name: string; count: number }[];
  allLaunchers: { name: LauncherType; count: number }[];
  totalPlaytimeHours: number;
  totalGamesCount: number;
  totalSoftwareCount: number;
  // Launcher integration & syncing
  launcherStatuses: LauncherStatus[];
  isSyncing: boolean;
  syncError: string | null;
  refreshLauncherStatuses: () => Promise<void>;
  syncLaunchers: (options?: { apiKey?: string; steamId?: string }) => Promise<{ success: boolean; totalGames?: number; error?: string }>;
  launchGame: (game: Game, launcher?: LauncherType) => Promise<boolean>;
  installGame: (game: Game, launcher?: LauncherType) => Promise<boolean>;
  fetchAchievements: (gameId: string) => Promise<Achievement[]>;
  enrichGameMedia: (gameId: string) => Promise<boolean>;
  enrichAllMedia: () => Promise<number>;
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
    onlySoftware: false,
    showHidden: false,
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

  // Listen for background multi-launcher library sync updates
  useEffect(() => {
    if (window.electronAPI?.onLibraryUpdated) {
      const unsub = window.electronAPI.onLibraryUpdated((updatedGames) => {
        if (Array.isArray(updatedGames) && updatedGames.length > 0) {
          setGames(updatedGames);
          refreshLauncherStatuses();
        }
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

  const fetchAchievements = async (gameId: string): Promise<Achievement[]> => {
    const target = games.find((g) => g.id === gameId);
    if (!target) return [];

    if (window.electronAPI?.getAchievements) {
      try {
        const res = await window.electronAPI.getAchievements(target.id, target.launcher, target.appId);
        if (res.success && Array.isArray(res.achievements)) {
          setGames((prev) => {
            const next = prev.map((g) => (g.id === gameId ? { ...g, achievements: res.achievements } : g));
            if (window.electronAPI?.saveLibrary) {
              window.electronAPI.saveLibrary(next);
            }
            return next;
          });
          return res.achievements;
        }
      } catch (err) {
        console.error('Failed to fetch achievements for game:', err);
      }
    }
    return target.achievements || [];
  };

  const enrichGameMedia = async (gameId: string): Promise<boolean> => {
    if (window.electronAPI?.enrichGameMedia) {
      try {
        const res = await window.electronAPI.enrichGameMedia(gameId);
        if (res.success && (res.game || res.media)) {
          setGames((prev) =>
            prev.map((g) => {
              if (g.id !== gameId) return g;
              if (res.game) return { ...g, ...res.game };
              return { ...g, media: res.media! };
            })
          );
          return Boolean(res.changed);
        }
      } catch (err) {
        console.error('Failed to enrich game media:', err);
      }
    }
    return false;
  };

  const enrichAllMedia = async (): Promise<number> => {
    if (window.electronAPI?.enrichAllMedia) {
      try {
        const res = await window.electronAPI.enrichAllMedia();
        if (res.success && Array.isArray(res.games)) {
          setGames(res.games);
          return res.updatedCount || 0;
        }
      } catch (err) {
        console.error('Failed to bulk enrich media:', err);
      }
    }
    return 0;
  };

  const markCloudUploaded = () => {
    setHasPendingCloudUploads(false);
    localStorage.setItem(PENDING_UPLOAD_KEY, 'false');
  };

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
    setFilters((prev) => ({ ...prev, onlyFavorites: !prev.onlyFavorites, onlySoftware: false }));
  };

  const toggleInstalledOnly = () => {
    setFilters((prev) => ({ ...prev, onlyInstalled: !prev.onlyInstalled, onlySoftware: false }));
  };

  const toggleSoftwareOnly = () => {
    setFilters((prev) => ({
      ...prev,
      onlySoftware: !prev.onlySoftware,
      selectedCategory: null,
      onlyFavorites: false,
      onlyInstalled: false,
    }));
  };

  const setSorting = (sortField: SortField, sortDirection: SortDirection) => {
    setFilters((prev) => ({ ...prev, sortField, sortDirection }));
  };

  const toggleFavorite = (gameId: string) => {
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, favorite: !g.favorite } : g))
    );
  };

  const toggleHideGame = (gameId: string) => {
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, hidden: !g.hidden } : g))
    );
  };

  const addGame = (game: Game) => {
    setGames((prev) => [...prev.filter((g) => g.id !== game.id), game]);
  };

  const updateGame = (updated: Game) => {
    setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  const removeGame = (gameId: string) => {
    setGames((prev) => prev.filter((g) => g.id !== gameId));
  };

  const deleteGame = async (gameId: string): Promise<boolean> => {
    if (window.electronAPI?.deleteGame) {
      try {
        await window.electronAPI.deleteGame(gameId);
      } catch (err) {
        console.error('Failed to delete game via Electron API:', err);
      }
    }
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    if (selectedGameId === gameId) {
      setSelectedGameId(null);
    }
    return true;
  };

  const rescanGame = async (gameId: string): Promise<{ success: boolean; game?: Game; error?: string }> => {
    const target = games.find((g) => g.id === gameId);
    if (!target) return { success: false, error: 'Game not found in library' };

    if (window.electronAPI?.rescanCustomGame) {
      try {
        const res = await window.electronAPI.rescanCustomGame(target);
        if (res.success && res.game) {
          setGames((prev) => prev.map((g) => (g.id === gameId ? res.game! : g)));
          return { success: true, game: res.game };
        }
        return { success: false, error: res.error || 'Failed to rescan executable' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown rescan error';
        return { success: false, error: msg };
      }
    }
    return { success: false, error: 'Rescan API unavailable' };
  };

  const toggleShowHidden = () => {
    setFilters((prev) => ({ ...prev, showHidden: !prev.showHidden }));
  };

  const hiddenGamesCount = useMemo(() => games.filter((g) => g.hidden).length, [games]);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    return games
      .filter((game) => {
        // Soft-hide filter: If in normal mode, hide games marked hidden.
        // If in showHidden mode, display only hidden games.
        if (filters.showHidden) {
          if (!game.hidden) return false;
        } else {
          if (game.hidden) return false;
        }

        // Software separation filter:
        // By default (onlySoftware === false), software items are completely invisible in game views.
        // When onlySoftware === true, show exclusively software & tools.
        const isSoft = isSoftwareGame(game);
        if (filters.onlySoftware) {
          if (!isSoft) return false;
        } else {
          if (isSoft) return false;
        }

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
          const selected = filters.selectedLauncher.toLowerCase();
          const matchesLauncher = game.launcher.toLowerCase() === selected;
          const matchesOwnership = game.ownershipSources?.some(
            (s) => s.launcher?.toLowerCase() === selected
          );
          if (!matchesLauncher && !matchesOwnership) return false;
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
          const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          compare = (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
        }

        return filters.sortDirection === 'asc' ? compare : -compare;
      });
  }, [games, filters]);

  const selectedGame = useMemo(() => {
    if (selectedGameId) {
      const match = games.find((g) => g.id === selectedGameId);
      if (match) return match;
    }
    if (filteredGames.length > 0) {
      return filteredGames[0];
    }
    const fallback = filters.onlySoftware
      ? games.find((g) => isSoftwareGame(g))
      : games.find((g) => !isSoftwareGame(g));
    return fallback || (games.length > 0 ? games[0] : null);
  }, [games, selectedGameId, filteredGames, filters.onlySoftware]);

  // Aggregate categories (excluding launcher names and software-specific genres from games list)
  const allCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    const visible = games.filter((g) => {
      const hiddenMatch = filters.showHidden ? g.hidden : !g.hidden;
      if (!hiddenMatch) return false;
      return filters.onlySoftware ? isSoftwareGame(g) : !isSoftwareGame(g);
    });
    const LAUNCHER_NAMES = new Set(['Steam', 'Epic Games', 'GOG', 'EA', 'Ubisoft', 'Xbox', 'Battle.net', 'Local', 'Custom']);
    visible.forEach((g) => {
      g.categories.forEach((cat) => {
        if (!cat || LAUNCHER_NAMES.has(cat)) return;
        if (!filters.onlySoftware && isSoftwareCategory(cat)) return;
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [games, filters.showHidden, filters.onlySoftware]);

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
    const visible = games.filter((g) => (filters.showHidden ? g.hidden : !g.hidden));
    visible.forEach((g: Game) => {
      const launchersForGame = new Set<string>();
      if (g.launcher) launchersForGame.add(g.launcher);
      if (g.isCustom) launchersForGame.add('Local');
      if (Array.isArray(g.ownershipSources)) {
        g.ownershipSources.forEach((s) => {
          if (s.launcher) launchersForGame.add(s.launcher);
        });
      }
      launchersForGame.forEach((l) => {
        const key = l as LauncherType;
        if (counts[key] !== undefined) {
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    });
    return (Object.entries(counts) as [LauncherType, number][])
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({ name, count }));
  }, [games, filters.showHidden]);

  const totalPlaytimeHours = useMemo(() => {
    const totalMinutes = games.reduce((acc, g) => acc + g.playtime.totalMinutes, 0);
    return Math.round((totalMinutes / 60) * 10) / 10;
  }, [games]);

  const totalGamesCount = useMemo(() => {
    return games.filter((g) => (filters.showHidden ? g.hidden : !g.hidden) && !isSoftwareGame(g)).length;
  }, [games, filters.showHidden]);

  const totalSoftwareCount = useMemo(() => {
    return games.filter((g) => (filters.showHidden ? g.hidden : !g.hidden) && isSoftwareGame(g)).length;
  }, [games, filters.showHidden]);

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
        toggleSoftwareOnly,
        setSorting,
        toggleFavorite,
        addGame,
        updateGame,
        removeGame,
        deleteGame,
        toggleHideGame,
        rescanGame,
        toggleShowHidden,
        hiddenGamesCount,
        filteredGames,
        allCategories,
        allLaunchers,
        totalPlaytimeHours,
        totalGamesCount,
        totalSoftwareCount,
        launcherStatuses,
        isSyncing,
        syncError,
        refreshLauncherStatuses,
        syncLaunchers,
        launchGame,
        installGame,
        fetchAchievements,
        enrichGameMedia,
        enrichAllMedia,
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
