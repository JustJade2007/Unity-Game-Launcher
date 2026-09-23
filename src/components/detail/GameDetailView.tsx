import React, { useState, useEffect } from 'react';
import { Game } from '../../types/game';
import { useLibrary } from '../../context/LibraryContext';
import { AchievementCard } from './AchievementCard';
import { FriendsPlayingList } from './FriendsPlayingList';
import { isSoftwareGame } from '../../utils/softwareClassifier';
import {
  X,
  Play,
  Download,
  Star,
  Clock,
  Trophy,
  Users,
  HardDrive,
  Calendar,
  Layers,
  Image as ImageIcon,
  RefreshCw,
  Edit3,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { LauncherType } from '../../types/game';

export function formatReleaseDate(dateString?: string): string {
  if (!dateString || typeof dateString !== 'string') return 'TBA';
  const clean = dateString.trim();
  if (!clean || /^(invalid date|null|undefined|nan)$/i.test(clean)) return 'TBA';
  if (/^(tba|coming soon|to be announced)$/i.test(clean)) return 'Coming Soon';

  if (/^\d{4}$/.test(clean)) return clean;

  // Handle YYYY-MM-DD or YYYY-MM explicitly to prevent UTC timezone rollback
  const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = ymdMatch[3] ? parseInt(ymdMatch[3], 10) : 1;
    const localDate = new Date(year, month, day);
    if (!isNaN(localDate.getTime())) {
      return localDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        ...(ymdMatch[3] ? { day: 'numeric' } : {}),
      });
    }
  }

  const timestamp = Date.parse(clean);
  if (isNaN(timestamp)) {
    const match = clean.match(/\b(19\d\d|20\d\d)\b/);
    if (match) return match[1];
    return 'TBA';
  }

  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return 'TBA';

  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface GameDetailViewProps {
  game: Game;
  onClose: () => void;
  onEditGame?: (game: Game) => void;
}

type TabType = 'overview' | 'achievements' | 'friends';

export const GameDetailView: React.FC<GameDetailViewProps> = ({ game: initialGame, onClose, onEditGame }) => {
  const { games, toggleFavorite, toggleHideGame, rescanGame, deleteGame, launchGame, installGame, fetchAchievements, enrichGameMedia } = useLibrary();
  const game = games.find((g) => g.id === initialGame.id) || initialGame;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [selectedLauncher, setSelectedLauncher] = useState<LauncherType>(game.launcher);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isFetchingAchievements, setIsFetchingAchievements] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const targetAppId = game.appId || (game.id?.startsWith('steam_') ? game.id.replace('steam_', '') : null);

  const heroCandidates = React.useMemo(() => {
    const list: string[] = [];
    if (game.media.heroUrl) list.push(game.media.heroUrl);
    if (targetAppId) {
      list.push(
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/library_hero.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${targetAppId}/library_hero.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/page_bg_generated_v6b.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${targetAppId}/header.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${targetAppId}/header.jpg`
      );
    }
    if (game.media.screenshots?.[0]) list.push(game.media.screenshots[0]);
    if (game.media.coverUrl) list.push(game.media.coverUrl);
    return Array.from(new Set(list.filter(Boolean)));
  }, [game.media.heroUrl, game.media.screenshots, game.media.coverUrl, targetAppId]);

  const [heroIdx, setHeroIdx] = useState(0);
  const [heroFailed, setHeroFailed] = useState(false);

  useEffect(() => {
    setHeroIdx(0);
    setHeroFailed(false);
  }, [game.id]);

  const currentHeroSrc = heroIdx < heroCandidates.length ? heroCandidates[heroIdx] : null;

  const handleHeroError = () => {
    if (heroIdx + 1 < heroCandidates.length) {
      setHeroIdx((prev) => prev + 1);
    } else {
      setHeroFailed(true);
    }
  };

  useEffect(() => {
    // If game has missing images or missing release date, attempt automatic enrichment with SteamDB
    if (
      !game.media?.coverUrl ||
      !game.media?.heroUrl ||
      !game.releaseDate ||
      game.releaseDate.trim() === '' ||
      /^(invalid date|null|undefined|nan|tba)$/i.test(game.releaseDate)
    ) {
      enrichGameMedia(game.id);
    }
  }, [game.id, game.releaseDate]);

  useEffect(() => {
    // Automatically fetch real achievements if empty or on initial open
    if (!game.achievements || game.achievements.length === 0) {
      setIsFetchingAchievements(true);
      fetchAchievements(game.id).finally(() => {
        setIsFetchingAchievements(false);
      });
    }
  }, [game.id]);

  const handleRefreshAchievements = async () => {
    setIsFetchingAchievements(true);
    try {
      await fetchAchievements(game.id);
    } finally {
      setIsFetchingAchievements(false);
    }
  };

  const hoursPlayed = Math.round((game.playtime.totalMinutes / 60) * 10) / 10;
  const unlockedCount = (game.achievements || []).filter((a) => a.unlocked).length;
  const totalAchievements = (game.achievements || []).length;
  const achievementPercent =
    totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0;

  const friendsPlayingNow = game.friends.filter((f) => f.status === 'playing_now');

  const filteredAchievements = game.achievements.filter((a) => {
    if (achievementFilter === 'unlocked') return a.unlocked;
    if (achievementFilter === 'locked') return !a.unlocked;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0c0e15] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 text-gray-400 hover:text-white border border-white/10 backdrop-blur-md transition-colors"
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto">
          {/* Header Banner */}
          <div className="relative h-72 sm:h-80 w-full overflow-hidden">
            {!heroFailed && currentHeroSrc ? (
              <img
                key={currentHeroSrc}
                src={currentHeroSrc}
                alt={game.title}
                onError={handleHeroError}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-950/70 via-[#101322] to-[#0c0e15]">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e15] via-[#0c0e15]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e15] via-transparent to-transparent" />

            {/* Banner Content */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
              <div className="max-w-2xl">
                {/* Platform badge & categories */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {game.launcher}
                  </span>
                  {game.categories.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-300 backdrop-blur-sm"
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Logo or Title */}
                {game.media.logoUrl ? (
                  <img
                    src={game.media.logoUrl}
                    alt={game.title}
                    className="max-h-16 object-contain mb-2 drop-shadow-xl"
                  />
                ) : null}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                  {game.title}
                </h1>
                <p className="text-xs sm:text-sm text-gray-300 mt-1 line-clamp-2">
                  {game.tagline}
                </p>

                {/* Multi-Launcher Ownership Selector if available */}
                {game.ownershipSources && game.ownershipSources.length > 1 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-gray-400">Launch with:</span>
                    {game.ownershipSources.map((source) => (
                      <button
                        key={source.launcher}
                        onClick={() => setSelectedLauncher(source.launcher)}
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border transition-all ${
                          selectedLauncher === source.launcher
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                            : 'bg-black/40 text-gray-400 border-white/10 hover:text-white'
                        }`}
                      >
                        {source.launcher} {source.installed ? '(Installed)' : '(Owned)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => toggleFavorite(game.id)}
                  className={`p-3 rounded-xl border backdrop-blur-md transition-all ${
                    game.favorite
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : 'bg-black/50 border-white/10 text-gray-300 hover:text-white'
                  }`}
                  title="Favorite"
                >
                  <Star className={`w-5 h-5 ${game.favorite ? 'fill-current' : ''}`} />
                </button>

                {onEditGame && (
                  <button
                    onClick={() => onEditGame(game)}
                    className="p-3 rounded-xl border border-white/10 bg-black/50 text-gray-300 hover:text-white hover:bg-white/10 backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-semibold"
                    title="Edit Game Parameters"
                  >
                    <Edit3 className="w-4 h-4 text-indigo-400" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    toggleHideGame(game.id);
                    setActionStatus({
                      type: 'success',
                      message: game.hidden ? 'Game unhidden' : 'Game hidden from active library',
                    });
                    setTimeout(() => setActionStatus(null), 3000);
                  }}
                  className={`p-3 rounded-xl border backdrop-blur-md transition-all ${
                    game.hidden
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-black/50 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                  title={game.hidden ? 'Unhide Game' : 'Hide Game'}
                >
                  {game.hidden ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-amber-400" />}
                </button>

                {(game.isCustom || game.executablePath) && (
                  <button
                    onClick={async () => {
                      setIsRescanning(true);
                      const res = await rescanGame(game.id);
                      setIsRescanning(false);
                      if (res.success) {
                        setActionStatus({ type: 'success', message: 'Binary verified on disk!' });
                      } else {
                        setActionStatus({ type: 'error', message: res.error || 'Executable not found on disk.' });
                      }
                      setTimeout(() => setActionStatus(null), 4000);
                    }}
                    disabled={isRescanning}
                    className="p-3 rounded-xl border border-white/10 bg-black/50 text-gray-300 hover:text-white hover:bg-white/10 backdrop-blur-md transition-all disabled:opacity-50"
                    title="Rescan Executable on Disk"
                  >
                    <RefreshCw className={`w-4 h-4 text-cyan-400 ${isRescanning ? 'animate-spin' : ''}`} />
                  </button>
                )}

                {game.isCustom && (
                  <button
                    onClick={async () => {
                      const confirmed = window.confirm(`Permanently delete "${game.title}" from library?`);
                      if (confirmed) {
                        await deleteGame(game.id);
                        onClose();
                      }
                    }}
                    className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 backdrop-blur-md transition-all"
                    title="Delete Custom Game"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                )}

                <button
                  onClick={async () => {
                    setIsLaunching(true);
                    try {
                      const source = game.ownershipSources?.find((s) => s.launcher === selectedLauncher);
                      const isInstalled = source ? source.installed : game.installed;
                      if (isInstalled) {
                        await launchGame(game, selectedLauncher);
                      } else {
                        await installGame(game, selectedLauncher);
                      }
                    } finally {
                      setIsLaunching(false);
                    }
                  }}
                  disabled={isLaunching}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm shadow-xl transition-all ${
                    (game.ownershipSources?.find((s) => s.launcher === selectedLauncher)?.installed ?? game.installed)
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/30'
                      : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-blue-600/30'
                  }`}
                >
                  {(game.ownershipSources?.find((s) => s.launcher === selectedLauncher)?.installed ?? game.installed) ? (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isLaunching ? 'Starting...' : (isSoftwareGame(game) ? 'Launch Application' : 'Launch Game')}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>{isLaunching ? 'Requesting Install...' : `Install via ${selectedLauncher}`}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action Status Banner */}
          {actionStatus && (
            <div
              className={`px-6 py-2.5 text-xs flex items-center justify-between border-y ${
                actionStatus.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/70 border-rose-500/30 text-rose-300'
              }`}
            >
              <span>{actionStatus.message}</span>
              <button
                onClick={() => setActionStatus(null)}
                className="text-gray-400 hover:text-white text-xs ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Quick Info Grid Bar */}
          <div className="px-6 py-3 bg-[#11131c] border-y border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <div className="text-gray-400 text-[10px]">Playtime</div>
                <div className="font-semibold text-white">{hoursPlayed} Hours</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <div className="text-gray-400 text-[10px]">Achievements</div>
                <div className="font-semibold text-white">
                  {unlockedCount}/{totalAchievements} ({achievementPercent}%)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <div className="text-gray-400 text-[10px]">Install Size</div>
                <div className="font-semibold text-white">
                  {game.sizeGb ? `${game.sizeGb} GB` : 'Unknown'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <div>
                <div className="text-gray-400 text-[10px]">Release Date</div>
                <div className="font-semibold text-white">
                  {formatReleaseDate(game.releaseDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 border-b border-white/5 flex items-center gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('achievements')}
              className={`py-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'achievements'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Achievements ({unlockedCount}/{totalAchievements})</span>
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className={`py-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'friends'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>
                Friends Activity ({game.friends.length})
                {friendsPlayingNow.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                    {friendsPlayingNow.length} live
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* Tab Content Panes */}
          <div className="p-6">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left 2 Cols: Description & Screenshots */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      About the Game
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {game.description}
                    </p>
                  </div>

                  {/* Screenshots Gallery */}
                  {game.media.screenshots.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        <span>Screenshots</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {game.media.screenshots.map((shot, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedScreenshot(shot)}
                            className="group relative aspect-video rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-indigo-500/50"
                          >
                            <img
                              src={shot}
                              alt={`${game.title} screenshot ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right 1 Col: Metadata & Developer Card */}
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-[#141622] border border-white/5 space-y-3 text-xs">
                    <div>
                      <div className="text-gray-400 text-[11px]">Developer</div>
                      <div className="font-semibold text-white mt-0.5">{game.developer}</div>
                    </div>

                    <div>
                      <div className="text-gray-400 text-[11px]">Publisher</div>
                      <div className="font-semibold text-white mt-0.5">{game.publisher}</div>
                    </div>

                    <div>
                      <div className="text-gray-400 text-[11px]">Platform</div>
                      <div className="font-semibold text-white mt-0.5 flex items-center gap-1.5">
                        <span>{game.launcher}</span>
                        {(game.isCustom || game.launcher === 'Local') && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 font-normal">
                            Custom Title
                          </span>
                        )}
                      </div>
                    </div>

                    {game.sizeGb !== undefined && game.sizeGb > 0 && (
                      <div>
                        <div className="text-gray-400 text-[11px]">Size on Disk</div>
                        <div className="font-semibold text-white mt-0.5">{game.sizeGb} GB</div>
                      </div>
                    )}

                    {game.executablePath && (
                      <div>
                        <div className="text-gray-400 text-[11px]">Executable Path</div>
                        <div className="font-mono text-[10px] text-gray-300 mt-0.5 break-all bg-black/30 p-1.5 rounded border border-white/5">
                          {game.executablePath}
                        </div>
                      </div>
                    )}

                    {game.workingDirectory && (
                      <div>
                        <div className="text-gray-400 text-[11px]">Working Directory</div>
                        <div className="font-mono text-[10px] text-gray-300 mt-0.5 break-all bg-black/30 p-1.5 rounded border border-white/5">
                          {game.workingDirectory}
                        </div>
                      </div>
                    )}

                    {game.launchArguments && (
                      <div>
                        <div className="text-gray-400 text-[11px]">Launch Arguments</div>
                        <div className="font-mono text-[10px] text-indigo-300 mt-0.5 break-all bg-black/30 p-1.5 rounded border border-white/5">
                          {game.launchArguments}
                        </div>
                      </div>
                    )}

                    {game.installPath && !game.executablePath && (
                      <div>
                        <div className="text-gray-400 text-[11px]">Install Path</div>
                        <div className="font-mono text-[10px] text-gray-300 mt-0.5 break-all">
                          {game.installPath}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 mb-2">Categories & Tags</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {game.categories.map((c) => (
                        <span
                          key={c}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-[#161824] border border-white/5 text-gray-300"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ACHIEVEMENTS TAB */}
            {activeTab === 'achievements' && (
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="p-4 rounded-xl bg-[#141622] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex-1 w-full">
                    <div className="flex justify-between items-center text-xs font-medium mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">Achievement Progress</span>
                        <button
                          onClick={handleRefreshAchievements}
                          disabled={isFetchingAchievements}
                          title="Refresh achievements from platform"
                          className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isFetchingAchievements ? 'animate-spin text-indigo-400' : ''}`} />
                        </button>
                      </div>
                      <span className="text-indigo-400 font-semibold">
                        {unlockedCount} of {totalAchievements} Unlocked ({achievementPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[#0b0c12] rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${achievementPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Filter chips */}
                  <div className="flex items-center gap-1.5 bg-[#0b0c12] p-1 rounded-lg border border-white/5 flex-shrink-0">
                    <button
                      onClick={() => setAchievementFilter('all')}
                      className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                        achievementFilter === 'all'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      All ({totalAchievements})
                    </button>
                    <button
                      onClick={() => setAchievementFilter('unlocked')}
                      className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                        achievementFilter === 'unlocked'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Unlocked ({unlockedCount})
                    </button>
                    <button
                      onClick={() => setAchievementFilter('locked')}
                      className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                        achievementFilter === 'locked'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Locked ({totalAchievements - unlockedCount})
                    </button>
                  </div>
                </div>

                {/* Loading Skeleton */}
                {isFetchingAchievements && totalAchievements === 0 && (
                  <div className="space-y-3">
                    <div className="text-xs text-indigo-400 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching real-time achievements from Steam...</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-pulse">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-3 rounded-xl bg-[#141622] border border-white/5 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-white/5" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-1/3 bg-white/10 rounded" />
                            <div className="h-2.5 w-2/3 bg-white/5 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!isFetchingAchievements && totalAchievements === 0 && (
                  <div className="p-8 text-center rounded-xl bg-[#141622] border border-white/5 space-y-3">
                    <Trophy className="w-8 h-8 text-gray-500 mx-auto" />
                    <p className="text-sm font-semibold text-gray-300">No achievements recorded for this title</p>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      This game may not support platform achievements, or Steam profile statistics could be private.
                    </p>
                    <button
                      onClick={handleRefreshAchievements}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-medium hover:bg-indigo-600/30 transition-all"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Fetch Achievements
                    </button>
                  </div>
                )}

                {/* Achievements List Grid */}
                {totalAchievements > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredAchievements.map((ach) => (
                      <AchievementCard key={ach.id} achievement={ach} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FRIENDS TAB */}
            {activeTab === 'friends' && (
              <div>
                <FriendsPlayingList friends={game.friends} />
              </div>
            )}
          </div>
        </div>

        {/* Screenshot Lightbox Modal */}
        {selectedScreenshot && (
          <div
            onClick={() => setSelectedScreenshot(null)}
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          >
            <img
              src={selectedScreenshot}
              alt="Screenshot Preview"
              className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
};
