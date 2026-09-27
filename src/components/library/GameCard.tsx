import React, { useState, useMemo } from 'react';
import { Game } from '../../types/game';
import { useLibrary } from '../../context/LibraryContext';
import { Clock, Star, Play, Download, Gamepad2, FolderCode, EyeOff } from 'lucide-react';

interface GameCardProps {
  game: Game;
  onOpenDetail?: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onOpenDetail }) => {
  const { selectedGame, setSelectedGame, toggleFavorite, launchGame, installGame } = useLibrary();

  const isSelected = selectedGame?.id === game.id;
  const hoursPlayed = Math.round((game.playtime.totalMinutes / 60) * 10) / 10;
  const friendsPlayingNow = game.friends.filter((f) => f.status === 'playing_now');

  const targetAppId = game.appId || (game.id?.startsWith('steam_') ? game.id.replace('steam_', '') : null);

  // Progressive SteamDB, hero banner & static CDN fallback candidates
  const fallbackCandidates = useMemo(() => {
    const list: string[] = [];
    if (game.media.coverUrl) list.push(game.media.coverUrl);
    if (targetAppId) {
      list.push(
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/library_600x900.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${targetAppId}/library_600x900.jpg`,
        `https://steamcdn-a.akamaihd.net/steam/apps/${targetAppId}/library_600x900.jpg`
      );
    }
    // Hero banner fallback: if the game has a hero banner, cleanly center & crop to 2:3 card
    if (game.media.heroUrl) list.push(game.media.heroUrl);
    if (targetAppId) {
      list.push(
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/library_hero.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${targetAppId}/library_hero.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/capsule_616x353.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${targetAppId}/capsule_616x353.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/header.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${targetAppId}/header.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/page_bg_generated_v6b.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/capsule_231x87.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${targetAppId}/capsule_231x87.jpg`
      );
    }
    if (game.media.screenshots && game.media.screenshots.length > 0) {
      list.push(...game.media.screenshots);
    }
    if (game.media.iconUrl) list.push(game.media.iconUrl);
    return Array.from(new Set(list.filter(Boolean)));
  }, [game.media.coverUrl, game.media.heroUrl, game.media.screenshots, game.media.iconUrl, targetAppId]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasImageFailed, setHasImageFailed] = useState(false);

  React.useEffect(() => {
    setCandidateIdx(0);
    setHasImageFailed(false);
  }, [game.id, game.media.coverUrl, game.media.heroUrl]);

  const currentImageSrc = candidateIdx < fallbackCandidates.length ? fallbackCandidates[candidateIdx] : null;

  const handleImageError = () => {
    if (candidateIdx + 1 < fallbackCandidates.length) {
      setCandidateIdx((prev) => prev + 1);
    } else {
      setHasImageFailed(true);
    }
  };

  const handleClick = () => {
    setSelectedGame(game);
    if (onOpenDetail) {
      onOpenDetail(game);
    }
  };

  const handleAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (game.installed) {
      await launchGame(game);
    } else {
      await installGame(game);
    }
  };

  const otherLaunchers = game.ownershipSources?.filter((s) => s.launcher !== game.launcher) || [];

  return (
    <div
      onClick={handleClick}
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col bg-[#141620] border ${
        isSelected
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/50'
          : 'border-white/5 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-black/60'
      } ${game.hidden ? 'opacity-65 saturate-[0.65]' : ''}`}
    >
      {/* Poster Image (2:3 aspect ratio) */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0d0e14]">
        {!hasImageFailed && currentImageSrc ? (
          <img
            key={currentImageSrc}
            src={currentImageSrc}
            alt={game.title}
            loading="lazy"
            onError={handleImageError}
            className={`w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out ${
              !game.installed ? 'opacity-80 saturate-[0.85]' : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-950/60 via-[#121420] to-[#0a0c12] text-center select-none relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl" />
            <Gamepad2 className="w-10 h-10 text-indigo-400/40 mb-3" />
            <h3 className="text-xs font-bold text-white line-clamp-3 leading-snug drop-shadow-md">
              {game.title}
            </h3>
            <span className="mt-3 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-indigo-300">
              {game.launcher}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141620] via-transparent to-black/40 opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-1">
            {game.isCustom || game.launcher === 'Local' ? (
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white border border-violet-400/40 shadow-sm flex items-center gap-1">
                <FolderCode className="w-2.5 h-2.5" />
                <span>Custom</span>
              </span>
            ) : (
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-sm">
                {game.launcher}
              </span>
            )}

            {game.hidden && (
              <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md flex items-center gap-1">
                <EyeOff className="w-2.5 h-2.5" />
                <span>Hidden</span>
              </span>
            )}

            {otherLaunchers.map((source) => (
              <span
                key={source.launcher}
                title={`Also owned on ${source.launcher}`}
                className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-gray-300 border border-white/10"
              >
                +{source.launcher.slice(0, 3)}
              </span>
            ))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(game.id);
            }}
            className={`p-1.5 rounded-md backdrop-blur-md transition-colors ${
              game.favorite
                ? 'bg-amber-500/30 text-amber-400 border border-amber-500/40'
                : 'bg-black/40 text-gray-400 hover:text-white hover:bg-black/60 border border-white/10 opacity-0 group-hover:opacity-100'
            }`}
            title="Favorite"
          >
            <Star className={`w-3.5 h-3.5 ${game.favorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Quick Action Button on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
          <button
            onClick={handleAction}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-xl transform scale-90 group-hover:scale-100 transition-all ${
              game.installed
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/40'
                : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-blue-600/40'
            }`}
          >
            {game.installed ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Play</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Install via {game.launcher}</span>
              </>
            )}
          </button>
        </div>

        {/* Friends Playing Now Indicator */}
        {friendsPlayingNow.length > 0 && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md border border-emerald-500/30 z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] text-emerald-300 font-medium truncate">
              {friendsPlayingNow[0].name} {friendsPlayingNow.length > 1 ? `+${friendsPlayingNow.length - 1} playing` : 'is playing'}
            </span>
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight truncate group-hover:text-indigo-300 transition-colors">
            {game.title}
          </h3>
          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
            {game.categories.join(' • ')}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{hoursPlayed}h</span>
          </div>

          <span className="text-[10px]">
            {game.installed ? (
              <span className="text-emerald-400 font-medium">Installed</span>
            ) : (
              <span className="text-sky-400/80 font-medium px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                Not Installed
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
