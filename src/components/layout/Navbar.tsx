import React from 'react';
import { Search, LayoutGrid, Rows3, Sparkles, ArrowUpDown, Clock, Gamepad2 } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';

export const Navbar: React.FC = () => {
  const {
    filters,
    setSearchQuery,
    viewMode,
    setViewMode,
    setSorting,
    totalGamesCount,
    totalPlaytimeHours,
  } = useLibrary();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    switch (value) {
      case 'lastPlayed-desc':
        setSorting('lastPlayed', 'desc');
        break;
      case 'playtime-desc':
        setSorting('playtime', 'desc');
        break;
      case 'title-asc':
        setSorting('title', 'asc');
        break;
      case 'releaseDate-desc':
        setSorting('releaseDate', 'desc');
        break;
      default:
        setSorting('lastPlayed', 'desc');
    }
  };

  const sortValue = `${filters.sortField}-${filters.sortDirection}`;

  return (
    <header className="h-16 px-6 border-b border-white/10 bg-[#0c0e14]/80 backdrop-blur-md flex items-center justify-between z-30 sticky top-0">
      {/* Search Input */}
      <div className="relative w-80">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search games, genres, or tags..."
          className="w-full bg-[#161822] text-sm text-gray-200 placeholder-gray-500 rounded-lg pl-10 pr-4 py-2 border border-white/5 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50 transition-all"
        />
      </div>

      {/* Middle Stats Badges */}
      <div className="hidden md:flex items-center gap-4 text-xs font-medium text-gray-400">
        <div className="flex items-center gap-1.5 bg-[#161822] px-3 py-1.5 rounded-full border border-white/5">
          <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>{totalGamesCount} Games</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#161822] px-3 py-1.5 rounded-full border border-white/5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{totalPlaytimeHours.toLocaleString()}h Total Playtime</span>
        </div>
      </div>

      {/* View & Sort Controls */}
      <div className="flex items-center gap-3">
        {/* Sort Select */}
        <div className="relative flex items-center bg-[#161822] rounded-lg border border-white/5 px-2.5 py-1.5 text-xs text-gray-300">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 mr-2" />
          <select
            value={sortValue}
            onChange={handleSortChange}
            className="bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer pr-1"
          >
            <option value="lastPlayed-desc" className="bg-[#161822] text-gray-200">Recently Played</option>
            <option value="playtime-desc" className="bg-[#161822] text-gray-200">Most Played</option>
            <option value="title-asc" className="bg-[#161822] text-gray-200">Alphabetical (A-Z)</option>
            <option value="releaseDate-desc" className="bg-[#161822] text-gray-200">Release Date</option>
          </select>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-[#161822] p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid View"
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'grid'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            title="Detailed View"
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'detailed'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Rows3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('spotlight')}
            title="Spotlight View"
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'spotlight'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
