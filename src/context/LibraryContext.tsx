import React, { createContext, useContext, useState, useMemo } from 'react';
import { Game, LauncherType, ViewMode, SortField, SortDirection, FilterState } from '../types/game';
import { MOCK_GAMES } from '../data/mockGames';

interface LibraryContextType {
  games: Game[];
  selectedGame: Game;
  setSelectedGame: (game: Game) => void;
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
  filteredGames: Game[];
  allCategories: { name: string; count: number }[];
  allLaunchers: { name: LauncherType; count: number }[];
  totalPlaytimeHours: number;
  totalGamesCount: number;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>(MOCK_GAMES);
  const [selectedGameId, setSelectedGameId] = useState<string>(MOCK_GAMES[0]?.id || '');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedCategory: null,
    selectedLauncher: null,
    onlyFavorites: false,
    onlyInstalled: false,
    sortField: 'lastPlayed',
    sortDirection: 'desc',
  });

  const selectedGame = useMemo(() => {
    return games.find((g) => g.id === selectedGameId) || games[0];
  }, [games, selectedGameId]);

  const setSelectedGame = (game: Game) => {
    setSelectedGameId(game.id);
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
      Xbox: 0,
      'Battle.net': 0,
      Local: 0,
    };
    games.forEach((g) => {
      counts[g.launcher] = (counts[g.launcher] || 0) + 1;
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
        filteredGames,
        allCategories,
        allLaunchers,
        totalPlaytimeHours,
        totalGamesCount: games.length,
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
