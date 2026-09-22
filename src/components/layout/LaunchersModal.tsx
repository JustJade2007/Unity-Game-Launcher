import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cloud,
  CloudUpload,
  Layers,
  Key,
  User,
  ShieldCheck,
} from 'lucide-react';
import { LauncherType, LauncherStatus } from '../../types/game';

interface LaunchersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LAUNCHER_BRAND_STYLES: Record<string, { bg: string; border: string; text: string; iconLabel: string }> = {
  Steam: { bg: 'bg-[#171d25]', border: 'border-[#1b2838]', text: 'text-[#66c0f4]', iconLabel: 'STM' },
  'Epic Games': { bg: 'bg-[#121212]', border: 'border-white/10', text: 'text-white', iconLabel: 'EPIC' },
  GOG: { bg: 'bg-[#1d152b]', border: 'border-[#3f2b63]', text: 'text-[#a855f7]', iconLabel: 'GOG' },
  EA: { bg: 'bg-[#1e1319]', border: 'border-[#4a1c2f]', text: 'text-[#f43f5e]', iconLabel: 'EA' },
  Ubisoft: { bg: 'bg-[#0f172a]', border: 'border-[#1e3a8a]', text: 'text-[#38bdf8]', iconLabel: 'UBI' },
  Xbox: { bg: 'bg-[#0d2216]', border: 'border-[#14532d]', text: 'text-[#22c55e]', iconLabel: 'XBOX' },
  'Battle.net': { bg: 'bg-[#0b192c]', border: 'border-[#1e40af]', text: 'text-[#60a5fa]', iconLabel: 'BNET' },
};

export const LaunchersModal: React.FC<LaunchersModalProps> = ({ isOpen, onClose }) => {
  const {
    launcherStatuses,
    isSyncing,
    syncError,
    syncLaunchers,
    refreshLauncherStatuses,
    hasPendingCloudUploads,
    markCloudUploaded,
  } = useLibrary();

  const [steamIdOverride, setSteamIdOverride] = useState('');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    setSyncFeedback(null);
    const res = await syncLaunchers({
      steamId: steamIdOverride.trim() || undefined,
    });
    if (res.success) {
      setSyncFeedback(`Sync completed: ${res.totalGames ?? 0} games indexed.`);
    }
  };

  const allSupportedLaunchers: LauncherType[] = [
    'Steam',
    'Epic Games',
    'GOG',
    'EA',
    'Ubisoft',
    'Xbox',
    'Battle.net',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0c0e15] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0f111a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Platform Launchers & Library Sync</h2>
              <p className="text-xs text-gray-400">Core foundation integration for all supported gaming platforms</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cloud Upload Notification Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-transparent border border-blue-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  Cloud Synchronization Status
                  {hasPendingCloudUploads ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                      Pending Upload
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                      Up to date
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {hasPendingCloudUploads
                    ? 'Local library changes or new titles require synchronization to cloud storage.'
                    : 'All game entries and metadata are currently stored safely.'}
                </p>
              </div>
            </div>

            {hasPendingCloudUploads && (
              <button
                onClick={markCloudUploaded}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                Mark Synced
              </button>
            )}
          </div>

          {/* Launcher Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-200">Integrated Platform Adapters</h3>
              <button
                onClick={() => refreshLauncherStatuses()}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Statuses
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allSupportedLaunchers.map((launcherId) => {
                const status = launcherStatuses.find((s: LauncherStatus) => s.id === launcherId);
                const isInstalled = Boolean(status?.installed);
                const styling = LAUNCHER_BRAND_STYLES[launcherId] || {
                  bg: 'bg-white/5',
                  border: 'border-white/10',
                  text: 'text-white',
                  iconLabel: launcherId.slice(0, 3).toUpperCase(),
                };

                return (
                  <div
                    key={launcherId}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isInstalled
                        ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
                        : 'bg-white/[0.01] border-white/5 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg ${styling.bg} ${styling.border} border flex items-center justify-center font-bold text-[10px] ${styling.text}`}
                        >
                          {styling.iconLabel}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{launcherId}</div>
                          <div className="text-[11px] text-gray-400">
                            {isInstalled ? (
                              status?.accountName ? (
                                <span className="flex items-center gap-1 text-gray-300">
                                  <User className="w-2.5 h-2.5 text-gray-500" />
                                  {status.accountName}
                                </span>
                              ) : (
                                'Client detected'
                              )
                            ) : (
                              'Not detected on PC'
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isInstalled ? (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            {status?.gameCount ?? 0} games
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-white/5 font-medium">
                            Offline
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Steam Account & Web API Config */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-semibold text-white">Steam Web API & Account Configuration</h4>
              </div>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> API Key Active
              </span>
            </div>

            <p className="text-xs text-gray-400">
              Steam Web API is configured to synchronize both installed games and uninstalled owned titles, complete
              with high-resolution box art, playtimes, and native installation links.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={steamIdOverride}
                onChange={(e) => setSteamIdOverride(e.target.value)}
                placeholder="SteamID64 (leave empty to auto-detect active client account)"
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Sync Error / Feedback Alert */}
          {syncError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{syncError}</span>
            </div>
          )}

          {syncFeedback && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{syncFeedback}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#0f111a] flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Scanning preserves all custom user tags, playtime statistics, and favorites.
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Scanning Launchers...' : 'Sync Entire Library'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
