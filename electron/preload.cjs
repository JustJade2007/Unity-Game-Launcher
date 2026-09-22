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
  loadConfig: () => ipcRenderer.invoke('config-load'),
  saveConfig: (config) => ipcRenderer.invoke('config-save', config),
  loadLibrary: () => ipcRenderer.invoke('library-load'),
  saveLibrary: (games) => ipcRenderer.invoke('library-save', games),
  isElectron: true,
});
