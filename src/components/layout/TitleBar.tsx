import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Gamepad2 } from 'lucide-react';

declare global {
  interface Window {
    electronAPI?: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      isMaximized: () => Promise<boolean>;
      onMaximizedState: (callback: (isMax: boolean) => void) => () => void;
      isElectron?: boolean;
    };
  }
}

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);

  useEffect(() => {
    if (window.electronAPI?.onMaximizedState) {
      const cleanup = window.electronAPI.onMaximizedState((maximized) => {
        setIsMaximized(maximized);
      });
      return cleanup;
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

  return (
    <div
      className="h-8 bg-[#06070a] border-b border-white/5 flex items-center justify-between select-none z-50 flex-shrink-0 text-xs text-gray-400"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App Branding in Titlebar */}
      <div className="flex items-center gap-2 px-3">
        <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-semibold text-[11px] tracking-wide text-gray-300">
          Unity Game Launcher
        </span>
      </div>

      {/* Window Controls (no drag) */}
      {isElectron ? (
        <div
          className="flex items-center h-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
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
        </div>
      ) : (
        <div className="px-3 text-[10px] text-gray-500 font-mono">
          Desktop Mode
        </div>
      )}
    </div>
  );
};
