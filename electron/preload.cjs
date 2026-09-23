const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedState: (callback) => {
    const handler = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window-maximized-state', handler);
    return () => ipcRenderer.removeListener('window-maximized-state', handler);
  },
  getAppPaths: () => ipcRenderer.invoke('app-get-paths'),
  openConfigFolder: () => ipcRenderer.invoke('app-open-config-folder'),
  openExternal: (url) => ipcRenderer.invoke('app-open-external', { url }),
  loadConfig: () => ipcRenderer.invoke('config-load'),
  saveConfig: (config) => ipcRenderer.invoke('config-save', config),
  loadLibrary: () => ipcRenderer.invoke('library-load'),
  saveLibrary: (games) => ipcRenderer.invoke('library-save', games),
  getLauncherStatus: () => ipcRenderer.invoke('launcher-get-status'),
  syncLaunchers: (options) => ipcRenderer.invoke('launcher-sync-all', options),
  launchGame: (game, launcher) => ipcRenderer.invoke('launcher-launch-game', { game, launcher }),
  installGame: (game, launcher) => ipcRenderer.invoke('launcher-install-game', { game, launcher }),
  getAchievements: (gameId, launcher, appId) => ipcRenderer.invoke('launcher-get-achievements', { gameId, launcher, appId }),
  enrichGameMedia: (gameId) => ipcRenderer.invoke('launcher-enrich-media', { gameId }),
  enrichAllMedia: () => ipcRenderer.invoke('launcher-enrich-all-media'),
  stopGameSession: (gameId) => ipcRenderer.invoke('session-stop', { gameId }),
  getActiveSessions: () => ipcRenderer.invoke('session-get-active'),
  onSessionStarted: (callback) => {
    const handler = (_event, session) => callback(session);
    ipcRenderer.on('game-session-started', handler);
    return () => ipcRenderer.removeListener('game-session-started', handler);
  },
  onSessionEnded: (callback) => {
    const handler = (_event, session) => callback(session);
    ipcRenderer.on('game-session-ended', handler);
    return () => ipcRenderer.removeListener('game-session-ended', handler);
  },
  onLibraryUpdated: (callback) => {
    const handler = (_event, games) => callback(games);
    ipcRenderer.on('library-updated', handler);
    return () => ipcRenderer.removeListener('library-updated', handler);
  },
  selectExecutable: () => ipcRenderer.invoke('dialog-select-executable'),
  selectDirectory: () => ipcRenderer.invoke('dialog-select-directory'),
  parseCustomGame: (filePath) => ipcRenderer.invoke('custom-game-parse', { filePath }),
  scanDirectoryForGames: (dirPath) => ipcRenderer.invoke('custom-game-scan-directory', { dirPath }),
  rescanCustomGame: (game) => ipcRenderer.invoke('custom-game-rescan', { game }),
  deleteGame: (gameId) => ipcRenderer.invoke('library-delete-game', { gameId }),
  isElectron: true,
});
