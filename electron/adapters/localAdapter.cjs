const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const BaseAdapter = require('./baseAdapter.cjs');

/**
 * Split command line arguments string into an array of strings, respecting quotes.
 * @param {string} [argsStr]
 * @returns {string[]}
 */
function parseArgsString(argsStr) {
  if (!argsStr || typeof argsStr !== 'string') return [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  const args = [];
  let match;
  while ((match = regex.exec(argsStr)) !== null) {
    if (match[1] !== undefined) {
      args.push(match[1]);
    } else if (match[2] !== undefined) {
      args.push(match[2]);
    } else {
      args.push(match[0]);
    }
  }
  return args;
}

class LocalAdapter extends BaseAdapter {
  constructor() {
    super('Local', 'Local Game');
  }

  async isInstalled() {
    return true;
  }

  async getClientPath() {
    return null;
  }

  async getActiveAccount() {
    return null;
  }

  async scanInstalledGames() {
    return [];
  }

  async scanOwnedGames() {
    return [];
  }

  /**
   * Launch a local custom game or executable.
   * @param {object} game
   * @returns {Promise<{ success: boolean, pid?: number, error?: string }>}
   */
  async launchGame(game) {
    const execPath = game.executablePath || game.installPath || game.executable;

    if (!execPath) {
      throw new Error(`Cannot launch "${game.title || 'Unknown Game'}": No executable path specified.`);
    }

    const resolvedPath = path.resolve(execPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Executable file not found: "${resolvedPath}". Please verify or update the path in game details.`);
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      throw new Error(`The specified path is a directory, not an executable file: "${resolvedPath}"`);
    }

    const workingDir = game.workingDirectory && fs.existsSync(game.workingDirectory)
      ? path.resolve(game.workingDirectory)
      : path.dirname(resolvedPath);

    const args = parseArgsString(game.launchArguments);

    console.log(`[LocalAdapter] Spawning executable: "${resolvedPath}" with args: [${args.join(', ')}] in cwd: "${workingDir}"`);

    return new Promise((resolve, reject) => {
      try {
        const child = spawn(resolvedPath, args, {
          cwd: workingDir,
          detached: true,
          stdio: 'ignore',
          windowsHide: false,
        });

        child.on('error', (err) => {
          console.error(`[LocalAdapter] Error spawning process for ${game.title}:`, err);
          reject(new Error(`Failed to launch process: ${err.message}`));
        });

        // Let the child process run independently of the launcher
        child.unref();

        resolve({
          success: true,
          pid: child.pid,
        });
      } catch (err) {
        console.error(`[LocalAdapter] Exception spawning ${game.title}:`, err);
        reject(new Error(`Failed to launch executable: ${err.message}`));
      }
    });
  }

  async installGame(game) {
    return {
      success: false,
      error: `Local title "${game.title}" is managed locally and does not support store installation protocols.`,
    };
  }
}

module.exports = LocalAdapter;
