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
    const data = fs.readFileSync(gamesPath, 'utf-8');
    return JSON.parse(data);
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

app.whenReady().then(() => {
  ensureConfigFiles();
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
