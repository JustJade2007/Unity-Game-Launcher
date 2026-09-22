import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Gamepad2, FolderOpen } from 'lucide-react';
import { AppPathsInfo } from '../../types/electron';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [appPaths, setAppPaths] = useState<AppPathsInfo | null>(null);
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);

  useEffect(() => {
    if (window.electronAPI?.onMaximizedState) {
      const cleanup = window.electronAPI.onMaximizedState((maximized) => {
        setIsMaximized(maximized);
      });
      return cleanup;
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.getAppPaths) {
      window.electronAPI.getAppPaths().then((paths) => {
        setAppPaths(paths);
      }).catch(console.error);
    }
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  const handleOpenConfigFolder = () => {
    window.electronAPI?.openConfigFolder();
  };

  return (
    <div
      className="h-8 bg-[#06070a] border-b border-white/5 flex items-center justify-between select-none z-50 flex-shrink-0 text-xs text-gray-400"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App Branding & Mode in Titlebar */}
      <div className="flex items-center gap-2.5 px-3">
        <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-semibold text-[11px] tracking-wide text-gray-300">
          Unity Game Launcher
        </span>
        {appPaths?.isPortable && (
          <span className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
            Portable
          </span>
        )}
      </div>

      {/* Center / Right Quick Action: Config Folder & Controls (no drag) */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {isElectron ? (
          <>
            <button
              onClick={handleOpenConfigFolder}
              className="flex items-center gap-1.5 px-2.5 h-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-[11px]"
              title={appPaths?.userDataDir ? `Open Config Folder (${appPaths.userDataDir})` : 'Open Config Folder'}
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline text-[10px] text-gray-400">Config</span>
            </button>

            <button
              onClick={handleMinimize}
              className="h-full px-3.5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleMaximize}
              className="h-full px-3.5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? (
                <Copy className="w-3 h-3 rotate-180" />
              ) : (
                <Square className="w-3 h-3" />
              )}
            </button>

            <button
              onClick={handleClose}
              className="h-full px-3.5 hover:bg-[#e81123] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="px-3 text-[10px] text-gray-500 font-mono">
            Desktop Mode
          </div>
        )}
      </div>
    </div>
  );
};
