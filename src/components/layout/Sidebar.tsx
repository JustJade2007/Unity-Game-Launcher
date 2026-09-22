import React from 'react';
import {
  Gamepad2,
  Star,
  HardDrive,
  Compass,
  FilterX,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';

export const Sidebar: React.FC = () => {
  const {
    filters,
    setSelectedCategory,
    setSelectedLauncher,
    toggleFavoritesOnly,
    toggleInstalledOnly,
    allCategories,
    allLaunchers,
    totalGamesCount,
    setSearchQuery,
  } = useLibrary();

  const resetAllFilters = () => {
    setSelectedCategory(null);
    setSelectedLauncher(null);
    setSearchQuery('');
    if (filters.onlyFavorites) toggleFavoritesOnly();
    if (filters.onlyInstalled) toggleInstalledOnly();
  };

  const hasActiveFilters =
    filters.selectedCategory !== null ||
    filters.selectedLauncher !== null ||
    filters.onlyFavorites ||
    filters.onlyInstalled ||
    filters.searchQuery.trim().length > 0;

  return (
    <aside className="w-64 bg-[#090b10] border-r border-white/5 flex flex-col h-screen select-none flex-shrink-0">
      {/* Brand / Logo */}
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <Gamepad2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            Unity <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">HUB</span>
          </h1>
          <p className="text-[11px] text-gray-400">Universal Game Library</p>
        </div>
      </div>

      {/* Navigation & Filters scrollable area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Main Views */}
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 px-3 mb-2">
            Library
          </div>
          <div className="space-y-1">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedLauncher(null);
                if (filters.onlyFavorites) toggleFavoritesOnly();
                if (filters.onlyInstalled) toggleInstalledOnly();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                !filters.onlyFavorites && !filters.onlyInstalled && !filters.selectedLauncher && !filters.selectedCategory
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4" />
                <span>All Games</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                {totalGamesCount}
              </span>
            </button>

            <button
              onClick={toggleFavoritesOnly}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filters.onlyFavorites
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-400" />
                <span>Favorites</span>
              </div>
            </button>

            <button
              onClick={toggleInstalledOnly}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filters.onlyInstalled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Installed</span>
              </div>
            </button>
          </div>
        </div>

        {/* Launchers Section */}
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 px-3 mb-2 flex items-center justify-between">
            <span>Launchers</span>
            <Layers className="w-3 h-3 text-gray-500" />
          </div>
          <div className="space-y-1">
            {allLaunchers.map(({ name, count }) => {
              const isSelected = filters.selectedLauncher === name;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedLauncher(isSelected ? null : name)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories / Genres Section */}
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 px-3 mb-2 flex items-center justify-between">
            <span>Genres & Tags</span>
            <Sparkles className="w-3 h-3 text-gray-500" />
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            {allCategories.map(({ name, count }) => {
              const isSelected = filters.selectedCategory === name;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedCategory(isSelected ? null : name)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-[#151722] text-gray-400 hover:text-gray-200 hover:bg-[#1e2130] border border-white/5'
                  }`}
                >
                  <span>{name}</span>
                  <span className="text-[9px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom status & filter reset */}
      {hasActiveFilters && (
        <div className="p-3 border-t border-white/5 bg-[#0e1017]">
          <button
            onClick={resetAllFilters}
            className="w-full py-1.5 px-3 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <FilterX className="w-3.5 h-3.5 text-gray-400" />
            <span>Clear Filters</span>
          </button>
        </div>
      )}
    </aside>
  );
};
