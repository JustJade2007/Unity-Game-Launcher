import React, { useState } from 'react';
import { LibraryProvider, useLibrary } from './context/LibraryContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { HeroBanner } from './components/hero/HeroBanner';
import { GameGrid } from './components/library/GameGrid';
import { GameDetailView } from './components/detail/GameDetailView';
import { Game } from './types/game';
import { TitleBar } from './components/layout/TitleBar';

const MainLayout: React.FC = () => {
  const { filters, filteredGames } = useLibrary();
  const [detailGame, setDetailGame] = useState<Game | null>(null);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#08090c] text-gray-100 overflow-hidden font-sans">
      {/* Desktop Native Titlebar */}
      <TitleBar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0a0b10]">
          <Navbar />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Dynamic Hero Showcase */}
          <HeroBanner />

          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                {filters.selectedCategory
                  ? `${filters.selectedCategory} Games`
                  : filters.selectedLauncher
                  ? `${filters.selectedLauncher} Library`
                  : filters.onlyFavorites
                  ? 'Favorite Games'
                  : filters.onlyInstalled
                  ? 'Installed Games'
                  : 'Library Games'}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
                {filteredGames.length}
              </span>
            </div>

            <span className="text-xs text-gray-400">
              Click any game for full details & achievements
            </span>
          </div>

          {/* Game Library Collection */}
          <GameGrid onOpenDetail={(game) => setDetailGame(game)} />
        </main>
      </div>
      </div>

      {/* Detail Modal Overlay */}
      {detailGame && (
        <GameDetailView
          game={detailGame}
          onClose={() => setDetailGame(null)}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <LibraryProvider>
      <MainLayout />
    </LibraryProvider>
  );
}

export default App;
