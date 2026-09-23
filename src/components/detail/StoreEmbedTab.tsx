import React, { useState, useEffect } from 'react';
import { Game } from '../../types/game';
import { ExternalLink, Globe, RefreshCw, ShieldAlert } from 'lucide-react';

interface StoreEmbedTabProps {
  game: Game;
}

export const StoreEmbedTab: React.FC<StoreEmbedTabProps> = ({ game }) => {
  const [loadError, setLoadError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'store' | 'community'>('store');

  const appId = game.appId || (game.id.startsWith('steam_') ? game.id.replace('steam_', '') : null);

  // Determine official store & community URLs
  const { storeUrl, communityUrl, storeName } = React.useMemo(() => {
    if (appId) {
      return {
        storeUrl: `https://store.steampowered.com/app/${appId}/`,
        communityUrl: `https://steamcommunity.com/app/${appId}/`,
        storeName: 'Steam Store',
      };
    }

    if (game.launcher === 'GOG') {
      return {
        storeUrl: `https://www.gog.com/en/games?query=${encodeURIComponent(game.title)}`,
        communityUrl: `https://www.gog.com/forum`,
        storeName: 'GOG.com',
      };
    }

    if (game.launcher === 'Epic Games') {
      return {
        storeUrl: `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(game.title)}`,
        communityUrl: `https://store.epicgames.com/en-US/news`,
        storeName: 'Epic Games Store',
      };
    }

    return {
      storeUrl: `https://www.google.com/search?q=${encodeURIComponent(game.title + ' game')}`,
      communityUrl: `https://www.reddit.com/r/gaming/search/?q=${encodeURIComponent(game.title)}`,
      storeName: game.launcher || 'Web Store',
    };
  }, [appId, game.launcher, game.title]);

  const currentUrl = activeSubTab === 'store' ? storeUrl : communityUrl;

  // Timeout handler to catch hanging embeds or X-Frame-Options blocks
  useEffect(() => {
    setIsLoading(true);
    setLoadError(false);

    const timeout = setTimeout(() => {
      // If still loading after 4 seconds, offer graceful fallback
      setIsLoading(false);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [currentUrl]);

  const openInBrowser = (url: string) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex flex-col h-[650px] bg-[#0c0e15] rounded-xl border border-white/5 overflow-hidden">
      {/* Subtab Header & Controls */}
      <div className="px-4 py-2.5 bg-[#12141d] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('store')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'store'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5 inline mr-1.5" />
            {storeName}
          </button>

          <button
            onClick={() => setActiveSubTab('community')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'community'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5 inline mr-1.5" />
            Community Hub & Discussions
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsLoading(true);
              setLoadError(false);
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs transition-colors"
            title="Reload Frame"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => openInBrowser(currentUrl)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium transition-all"
            title="Open in System Browser"
          >
            <span>Open in Browser</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative flex-1 w-full h-full bg-[#0d0e14]">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#0d0e14]/90 z-10 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Loading {storeName}...</span>
          </div>
        )}

        {/* Fallback Display if frame load failed or blocked */}
        {loadError ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Direct Embedded Preview Restricted</h3>
            <p className="text-xs text-gray-400 max-w-md mb-5 leading-relaxed">
              This storefront ({storeName}) security policy restricts in-app iframe rendering. You can securely browse the live store page, purchase DLCs, or read community reviews directly in your default browser.
            </p>
            <button
              onClick={() => openInBrowser(currentUrl)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <span>Open Official {storeName} Page</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <iframe
            src={currentUrl}
            title={`${game.title} - ${storeName}`}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setLoadError(true);
            }}
          />
        )}
      </div>
    </div>
  );
};
