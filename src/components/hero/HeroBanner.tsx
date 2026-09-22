import React from 'react';
import { Play, Star, Clock, Trophy } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';

export const HeroBanner: React.FC = () => {
  const { selectedGame, toggleFavorite } = useLibrary();

  if (!selectedGame) return null;

  const hoursPlayed = Math.round((selectedGame.playtime.totalMinutes / 60) * 10) / 10;
  const unlockedCount = selectedGame.achievements.filter((a) => a.unlocked).length;
  const totalAchievements = selectedGame.achievements.length;
  const achievementPercent =
    totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0;

  const friendsPlayingNow = selectedGame.friends.filter(
    (f) => f.status === 'playing_now'
  );

  return (
    <div className="relative w-full h-[360px] overflow-hidden rounded-2xl mb-6 select-none border border-white/10 shadow-2xl group">
      {/* Background Image with Ambient Overlays */}
      <img
        src={selectedGame.media.heroUrl}
        alt={selectedGame.title}
        className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
      />
      {/* Dark gradient fades */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#08090c] via-[#08090c]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#08090c] via-[#08090c]/80 to-transparent" />

      {/* Content Container */}
      <div className="relative z-10 h-full p-8 flex flex-col justify-end max-w-3xl">
        {/* Launcher Badge & Categories */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {selectedGame.launcher}
          </span>
          <div className="flex items-center gap-1.5 overflow-hidden">
            {selectedGame.categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-gray-300 backdrop-blur-sm"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Game Logo or Stylized Title */}
        <div className="mb-2">
          {selectedGame.media.logoUrl ? (
            <img
              src={selectedGame.media.logoUrl}
              alt={selectedGame.title}
              className="max-h-16 max-w-sm object-contain drop-shadow-2xl mb-2"
              onError={(e) => {
                // Fallback to text if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : null}
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow-md">
            {selectedGame.title}
          </h2>
        </div>

        {/* Tagline */}
        <p className="text-sm text-gray-300 line-clamp-2 mb-5 font-normal max-w-2xl text-shadow">
          {selectedGame.tagline || selectedGame.description}
        </p>

        {/* Action Row & Quick Stats */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Play / Launch Button */}
          <button
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/40 hover:shadow-indigo-500/60 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{selectedGame.installed ? 'Play Now' : 'Install Game'}</span>
          </button>

          {/* Favorite Toggle */}
          <button
            onClick={() => toggleFavorite(selectedGame.id)}
            className={`p-2.5 rounded-xl border backdrop-blur-md transition-all ${
              selectedGame.favorite
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-white/10 border-white/10 text-gray-300 hover:text-white hover:bg-white/20'
            }`}
            title="Toggle Favorite"
          >
            <Star
              className={`w-4 h-4 ${selectedGame.favorite ? 'fill-current' : ''}`}
            />
          </button>

          {/* Quick Stats Separator */}
          <div className="hidden sm:flex items-center gap-5 border-l border-white/15 pl-5 text-xs text-gray-300">
            {/* Playtime */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-semibold text-white">{hoursPlayed} hrs</div>
                <div className="text-[10px] text-gray-400">Playtime</div>
              </div>
            </div>

            {/* Achievements */}
            {totalAchievements > 0 && (
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="font-semibold text-white">
                    {unlockedCount}/{totalAchievements} ({achievementPercent}%)
                  </div>
                  <div className="text-[10px] text-gray-400">Achievements</div>
                </div>
              </div>
            )}

            {/* Friends in-game */}
            {friendsPlayingNow.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5 overflow-hidden">
                  {friendsPlayingNow.slice(0, 3).map((friend) => (
                    <img
                      key={friend.id}
                      src={friend.avatarUrl}
                      alt={friend.name}
                      title={`${friend.name} is playing`}
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-[#08090c] object-cover"
                    />
                  ))}
                </div>
                <div>
                  <div className="font-semibold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {friendsPlayingNow.length} Playing Now
                  </div>
                  <div className="text-[10px] text-gray-400">Friends</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
