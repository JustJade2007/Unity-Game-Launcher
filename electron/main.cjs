const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Check for electron-builder portable environment
const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
if (isPortable) {
  const portableDataDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
  try {
    if (!fs.existsSync(portableDataDir)) {
      fs.mkdirSync(portableDataDir, { recursive: true });
    }
    app.setPath('userData', portableDataDir);
  } catch (err) {
    console.error('Failed to initialize portable data directory:', err);
  }
}

// Config file management
function getConfigFilePaths() {
  const userDataDir = app.getPath('userData');
  return {
    userDataDir,
    configPath: path.join(userDataDir, 'config.json'),
    gamesPath: path.join(userDataDir, 'games.json'),
  };
}

function ensureConfigFiles() {
  const { userDataDir, configPath, gamesPath } = getConfigFilePaths();
  try {
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    // Default configuration file
    if (!fs.existsSync(configPath)) {
      const defaultConfig = {
        version: '0.2.0',
        theme: 'dark',
        autoLaunchOnStartup: false,
        minimizeToTray: false,
        defaultViewMode: 'grid',
        defaultSortField: 'lastPlayed',
        defaultSortDirection: 'desc'
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    }

    // External game library store (clean, no mock/template data)
    if (!fs.existsSync(gamesPath)) {
      fs.writeFileSync(gamesPath, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error ensuring config files:', err);
  }
}

// Disable default menu
Menu.setApplicationMenu(null);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#08090c',
    frame: false, // Frameless window for custom dark gaming titlebar
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-state', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-state', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// App & Configuration IPC Handlers
ipcMain.handle('app-get-paths', () => {
  const paths = getConfigFilePaths();
  return {
    ...paths,
    isPortable,
    appPath: app.getAppPath(),
  };
});

ipcMain.handle('app-open-config-folder', async () => {
  const { userDataDir } = getConfigFilePaths();
  try {
    ensureConfigFiles();
    await shell.openPath(userDataDir);
    return { success: true, path: userDataDir };
  } catch (err) {
    console.error('Failed to open config folder:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('config-load', async () => {
  const { configPath } = getConfigFilePaths();
  try {
    ensureConfigFiles();
    const data = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load config.json:', err);
    return null;
  }
});

ipcMain.handle('config-save', async (_event, config) => {
  const { configPath } = getConfigFilePaths();
  try {
    ensureConfigFiles();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Failed to save config.json:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('library-load', async () => {
  const { gamesPath } = getConfigFilePaths();
  try {
    ensureConfigFiles();
    if (fs.existsSync(gamesPath)) {
      const data = fs.readFileSync(gamesPath, 'utf-8');
      const games = JSON.parse(data);
      if (Array.isArray(games) && games.length > 0) {
        return games;
      }
    }

    // Automatically detect and ingest installed/owned games if empty
    console.log('[Main] Library is empty, executing automatic launcher discovery & ingestion...');
    const result = await getLibraryEngine().syncAll();
    return result.games || [];
  } catch (err) {
    console.error('Failed to load games.json:', err);
    return [];
  }
});

ipcMain.handle('library-save', async (_event, games) => {
  const { gamesPath } = getConfigFilePaths();
  try {
    ensureConfigFiles();
    fs.writeFileSync(gamesPath, JSON.stringify(games, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Failed to save games.json:', err);
    return { success: false, error: err.message };
  }
});

// Launcher Platform & Sync Engine Handlers
const LibraryEngine = require('./engine/libraryEngine.cjs');
const processTracker = require('./engine/processTracker.cjs');

let libraryEngine = null;
function getLibraryEngine() {
  if (!libraryEngine) {
    const { gamesPath } = getConfigFilePaths();
    libraryEngine = new LibraryEngine(gamesPath);
  }
  return libraryEngine;
}

ipcMain.handle('launcher-get-status', async () => {
  try {
    return await getLibraryEngine().getLauncherStatuses();
  } catch (err) {
    console.error('Failed to get launcher statuses:', err);
    return [];
  }
});

ipcMain.handle('launcher-sync-all', async (_event, options) => {
  try {
    const result = await getLibraryEngine().syncAll(options || {});
    return result;
  } catch (err) {
    console.error('Failed to sync launcher libraries:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('launcher-launch-game', async (_event, { game, launcher }) => {
  try {
    const result = await getLibraryEngine().launchGame(game, launcher);
    processTracker.startSession(game.id, game.title);
    if (mainWindow) {
      mainWindow.webContents.send('game-session-started', { gameId: game.id, gameTitle: game.title });
    }
    return result;
  } catch (err) {
    console.error(`Failed to launch ${game?.title}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('launcher-install-game', async (_event, { game, launcher }) => {
  try {
    return await getLibraryEngine().installGame(game, launcher);
  } catch (err) {
    console.error(`Failed to install ${game?.title}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('launcher-get-achievements', async (_event, { gameId, launcher, appId }) => {
  try {
    return await getLibraryEngine().getAchievements(gameId, launcher, appId);
  } catch (err) {
    console.error(`Failed to get achievements for ${gameId || appId}:`, err);
    return { success: false, achievements: [], error: err.message };
  }
});

ipcMain.handle('launcher-enrich-media', async (_event, { gameId }) => {
  try {
    return await getLibraryEngine().enrichGameMedia(gameId);
  } catch (err) {
    console.error(`Failed to enrich media for ${gameId}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('launcher-enrich-all-media', async () => {
  try {
    return await getLibraryEngine().enrichLibraryMedia();
  } catch (err) {
    console.error('Failed to bulk enrich library media:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('session-stop', async (_event, { gameId }) => {
  try {
    const session = processTracker.endSession(gameId);
    if (session) {
      // Update games.json with new playtime
      const { gamesPath } = getConfigFilePaths();
      if (fs.existsSync(gamesPath)) {
        const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
        const idx = games.findIndex((g) => g.id === gameId);
        if (idx !== -1) {
          games[idx].playtime = games[idx].playtime || { totalMinutes: 0 };
          games[idx].playtime.totalMinutes = (games[idx].playtime.totalMinutes || 0) + session.durationMinutes;
          games[idx].playtime.lastPlayed = session.endedAt;
          fs.writeFileSync(gamesPath, JSON.stringify(games, null, 2), 'utf8');
        }
      }
      if (mainWindow) {
        mainWindow.webContents.send('game-session-ended', session);
      }
    }
    return { success: true, session };
  } catch (err) {
    console.error(`Failed to stop session for ${gameId}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('session-get-active', () => {
  return processTracker.getActiveSessions();
});

app.whenReady().then(async () => {
  ensureConfigFiles();
  const { gamesPath } = getConfigFilePaths();
  try {
    if (fs.existsSync(gamesPath)) {
      const data = fs.readFileSync(gamesPath, 'utf-8');
      const games = JSON.parse(data);
      if (!Array.isArray(games) || games.length === 0) {
        console.log('[Main] Running initial library discovery on app ready...');
        await getLibraryEngine().syncAll();
      }
    }
  } catch (err) {
    console.error('[Main] Initial sync on app ready error:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
