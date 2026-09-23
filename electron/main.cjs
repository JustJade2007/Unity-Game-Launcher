const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const binaryMetadataParser = require('./engine/binaryMetadataParser.cjs');

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
        version: '0.3.0',
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
        // If the library was saved when only Steam was supported, trigger a background multi-launcher sync
        const hasOtherLaunchers = games.some(
          (g) => g.launcher !== 'Steam' || g.ownershipSources?.some((s) => s.launcher !== 'Steam')
        );
        if (!hasOtherLaunchers) {
          console.log('[Main] Existing library contains only Steam titles; initiating background multi-launcher discovery...');
          getLibraryEngine()
            .syncAll()
            .then((res) => {
              if (mainWindow && res?.games) {
                mainWindow.webContents.send('library-updated', res.games);
              }
            })
            .catch((err) => {
              console.error('[Main] Background multi-launcher discovery error:', err);
            });
        }
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

// Custom Game & Local Tooling Handlers
ipcMain.handle('dialog-select-executable', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Game Executable',
    filters: [
      { name: 'Executables (*.exe, *.bat, *.cmd)', extensions: ['exe', 'bat', 'cmd'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
    return null;
  }
  return res.filePaths[0];
});

ipcMain.handle('dialog-select-directory', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Game Directory or Installation Folder',
    properties: ['openDirectory'],
  });
  if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
    return null;
  }
  return res.filePaths[0];
});

ipcMain.handle('custom-game-parse', async (_event, { filePath }) => {
  try {
    const metadata = await binaryMetadataParser.parseExecutable(filePath, app);
    return { success: true, metadata };
  } catch (err) {
    console.error('Failed to parse executable:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('custom-game-scan-directory', async (_event, { dirPath }) => {
  try {
    const games = await binaryMetadataParser.scanDirectoryForGames(dirPath, app);
    return { success: true, games };
  } catch (err) {
    console.error('Failed to scan directory for games:', err);
    return { success: false, games: [], error: err.message };
  }
});

ipcMain.handle('custom-game-rescan', async (_event, { game }) => {
  try {
    const execPath = game?.executablePath || game?.installPath;
    if (!execPath) {
      return { success: false, error: 'No executable path configured for this game.' };
    }
    if (!fs.existsSync(execPath)) {
      return {
        success: false,
        error: `Executable file was not found at "${execPath}". Please update the executable path in Edit Game.`,
      };
    }
    const metadata = await binaryMetadataParser.parseExecutable(execPath, app);
    const { gamesPath } = getConfigFilePaths();
    if (fs.existsSync(gamesPath)) {
      const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
      const idx = games.findIndex((g) => g.id === game.id);
      if (idx !== -1) {
        games[idx] = {
          ...games[idx],
          sizeGb: metadata.sizeGb || games[idx].sizeGb,
          installed: true,
          workingDirectory: metadata.workingDirectory || games[idx].workingDirectory,
          version: metadata.version || games[idx].version,
        };
        if (!games[idx].media?.coverUrl && metadata.media?.coverUrl) {
          games[idx].media.coverUrl = metadata.media.coverUrl;
        }
        fs.writeFileSync(gamesPath, JSON.stringify(games, null, 2), 'utf8');
        return { success: true, game: games[idx] };
      }
    }
    return { success: true, game: { ...game, sizeGb: metadata.sizeGb, installed: true } };
  } catch (err) {
    console.error('Failed to rescan custom game:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('library-delete-game', async (_event, { gameId }) => {
  try {
    const { gamesPath } = getConfigFilePaths();
    if (fs.existsSync(gamesPath)) {
      const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
      const updated = games.filter((g) => g.id !== gameId);
      fs.writeFileSync(gamesPath, JSON.stringify(updated, null, 2), 'utf8');
      return { success: true };
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to delete game from library:', err);
    return { success: false, error: err.message };
  }
});

app.whenReady().then(async () => {
  ensureConfigFiles();
  const { gamesPath } = getConfigFilePaths();
  try {
    if (fs.existsSync(gamesPath)) {
      const data = fs.readFileSync(gamesPath, 'utf-8');
      const games = JSON.parse(data);
      const hasOtherLaunchers = Array.isArray(games) && games.some(
        (g) => g.launcher !== 'Steam' || g.ownershipSources?.some((s) => s.launcher !== 'Steam')
      );
      if (!Array.isArray(games) || games.length === 0 || !hasOtherLaunchers) {
        console.log('[Main] Running multi-launcher discovery on app ready...');
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
