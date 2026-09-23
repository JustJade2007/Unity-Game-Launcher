import React from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { GameCard } from './GameCard';
import { Game, Achievement, FriendActivity } from '../../types/game';
import { Gamepad2, Clock, Trophy, Play, Download } from 'lucide-react';

interface GameGridProps {
  onOpenDetail?: (game: Game) => void;
}

const GameListThumbnail: React.FC<{ game: Game }> = ({ game }) => {
  const targetAppId = game.appId || (game.id?.startsWith('steam_') ? game.id.replace('steam_', '') : null);

  const fallbackCandidates = React.useMemo(() => {
    const list: string[] = [];
    if (game.media.coverUrl) list.push(game.media.coverUrl);
    if (targetAppId) {
      list.push(
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/library_600x900.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${targetAppId}/library_600x900.jpg`,
        `https://steamcdn-a.akamaihd.net/steam/apps/${targetAppId}/library_600x900.jpg`
      );
    }
    if (game.media.heroUrl) list.push(game.media.heroUrl);
    if (targetAppId) {
      list.push(
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/library_hero.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${targetAppId}/library_hero.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/capsule_616x353.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${targetAppId}/capsule_616x353.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/header.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${targetAppId}/header.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/page_bg_generated_v6b.jpg`
      );
    }
    if (game.media.screenshots && game.media.screenshots.length > 0) {
      list.push(...game.media.screenshots);
    }
    if (game.media.iconUrl) list.push(game.media.iconUrl);
    return Array.from(new Set(list.filter(Boolean)));
  }, [game.media.coverUrl, game.media.heroUrl, game.media.screenshots, game.media.iconUrl, targetAppId]);

  const [idx, setIdx] = React.useState(0);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [game.id, game.media.coverUrl, game.media.heroUrl]);

  const src = idx < fallbackCandidates.length ? fallbackCandidates[idx] : null;

  if (failed || !src) {
    return (
      <div className="w-14 h-18 bg-indigo-950/40 border border-white/10 rounded-lg flex items-center justify-center flex-shrink-0 text-indigo-400/50">
        <Gamepad2 className="w-6 h-6" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={game.title}
      loading="lazy"
      onError={() => {
        if (idx + 1 < fallbackCandidates.length) setIdx((prev) => prev + 1);
        else setFailed(true);
      }}
      className="w-14 h-18 object-cover rounded-lg flex-shrink-0 bg-[#0d0e14]"
    />
  );
};

export const GameGrid: React.FC<GameGridProps> = ({ onOpenDetail }) => {
  const { filteredGames, viewMode, selectedGame, setSelectedGame, totalGamesCount, launchGame, installGame } = useLibrary();

  if (totalGamesCount === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 shadow-lg shadow-indigo-500/10">
          <Gamepad2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1.5">Your library is empty</h3>
        <p className="text-xs text-gray-400 max-w-sm">
          Click "Launchers & Sync" in the top bar to scan your PC and import your games from Steam, Epic, GOG, and other launchers.
        </p>
      </div>
    );
  }

  if (filteredGames.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-gray-400">
          <Gamepad2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1.5">No games match your filters</h3>
        <p className="text-xs text-gray-400 max-w-sm">
          Try changing your search term, clearing category filters, or switching launchers.
        </p>
      </div>
    );
  }

  // Detailed Row / List View
  if (viewMode === 'detailed') {
    return (
      <div className="space-y-2">
        {filteredGames.map((game: Game) => {
          const isSelected = selectedGame?.id === game.id;
          const hoursPlayed = Math.round((game.playtime.totalMinutes / 60) * 10) / 10;
          const unlockedCount = game.achievements.filter((a: Achievement) => a.unlocked).length;
          const friendsPlaying = game.friends.filter((f: FriendActivity) => f.status === 'playing_now');

          return (
            <div
              key={game.id}
              onClick={() => {
                setSelectedGame(game);
                if (onOpenDetail) onOpenDetail(game);
              }}
              className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-[#181a26] border-indigo-500/80 shadow-md shadow-indigo-500/10'
                  : 'bg-[#12141d] border-white/5 hover:border-white/15 hover:bg-[#161822]'
              }`}
            >
              {/* Thumbnail */}
              <GameListThumbnail game={game} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white truncate">{game.title}</h4>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                    {game.launcher}
                  </span>
                  {game.installed && (
                    <span className="text-[10px] text-emerald-400 font-medium">Installed</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{game.tagline}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                  <span>{game.categories.slice(0, 3).join(', ')}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-6 text-xs text-gray-300 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{hoursPlayed} hrs</span>
                </div>

                {game.achievements.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{unlockedCount}/{game.achievements.length}</span>
                  </div>
                )}

                {friendsPlaying.length > 0 && (
                  <div className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{friendsPlaying[0].name} playing</span>
                  </div>
                )}
              </div>

              {/* Action */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (game.installed) {
                    launchGame(game);
                  } else {
                    installGame(game);
                  }
                }}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  game.installed
                    ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white'
                    : 'bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white'
                }`}
                title={game.installed ? 'Play' : `Install via ${game.launcher}`}
              >
                {game.installed ? (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  // Standard Poster Grid View
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {filteredGames.map((game: Game) => (
        <GameCard key={game.id} game={game} onOpenDetail={onOpenDetail} />
      ))}
    </div>
  );
};
