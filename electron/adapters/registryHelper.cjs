const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Safe query of a single registry value.
 * @param {string} key
 * @param {string} valueName
 * @returns {string|null}
 */
function queryRegValue(key, valueName) {
  if (process.platform !== 'win32') return null;
  try {
    const cmd = `reg query "${key}" /v "${valueName}"`;
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 });
    const match = out.match(new RegExp(`${valueName}\\s+REG_[A-Z_]+\\s+(.*)`, 'i'));
    return match && match[1] ? match[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * Returns immediate subkeys of a registry key.
 * @param {string} key
 * @returns {string[]}
 */
function queryRegSubkeys(key) {
  if (process.platform !== 'win32') return [];
  try {
    const cmd = `reg query "${key}"`;
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 });
    return out
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.startsWith('HKEY_') && l.toLowerCase() !== key.toLowerCase());
  } catch {
    return [];
  }
}

/**
 * Returns all key-value pairs in a registry key.
 * @param {string} key
 * @returns {Record<string, string>}
 */
function queryRegKeyValues(key) {
  if (process.platform !== 'win32') return {};
  try {
    const cmd = `reg query "${key}"`;
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 });
    const result = {};
    const lines = out.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('HKEY_')) continue;
      const parts = trimmed.match(/^([^\s]+)\s+REG_[A-Z_]+\s*(.*)$/);
      if (parts) {
        result[parts[1]] = parts[2] ? parts[2].trim() : '';
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Queries Windows uninstall entries matching a predicate or keywords.
 * @param {string[]|((item: { key: string, displayName: string }) => boolean)} matcher
 * @returns {Array<{ key: string, displayName: string, installLocation?: string, displayIcon?: string, uninstallString?: string, publisher?: string, displayVersion?: string }>}
 */
function findUninstallEntries(matcher) {
  if (process.platform !== 'win32') return [];
  const roots = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];

  const matched = [];
  const isFunction = typeof matcher === 'function';
  const matchKeywords = Array.isArray(matcher) ? matcher.map(m => m.toLowerCase()) : null;

  for (const root of roots) {
    try {
      const out = execSync(`reg query "${root}" /s /v DisplayName`, {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const blocks = out.split(/\r?\n\r?\n/);
      for (const block of blocks) {
        const subkeyMatch = block.match(/^(HKEY_[^\r\n]+)/);
        const nameMatch = block.match(/DisplayName\s+REG_SZ\s+(.*)/i);
        if (subkeyMatch && nameMatch && nameMatch[1]) {
          const key = subkeyMatch[1].trim();
          const displayName = nameMatch[1].trim();
          let hit = false;
          if (isFunction) {
            hit = matcher({ key, displayName });
          } else if (matchKeywords) {
            const lowerName = displayName.toLowerCase();
            hit = matchKeywords.some(k => lowerName.includes(k));
          }
          if (hit) {
            matched.push({ key, displayName });
          }
        }
      }
    } catch {}
  }

  // Fetch full details for matched entries
  return matched.map(item => {
    const vals = queryRegKeyValues(item.key);
    return {
      key: item.key,
      displayName: item.displayName,
      installLocation: vals.InstallLocation ? path.normalize(vals.InstallLocation.replace(/"/g, '').trim()) : undefined,
      displayIcon: vals.DisplayIcon ? vals.DisplayIcon.replace(/"/g, '').split(',')[0].trim() : undefined,
      uninstallString: vals.UninstallString ? vals.UninstallString.trim() : undefined,
      publisher: vals.Publisher ? vals.Publisher.trim() : undefined,
      displayVersion: vals.DisplayVersion ? vals.DisplayVersion.trim() : undefined,
    };
  });
}

/**
 * Fast approximate directory size in Gigabytes (1 decimal place).
 * @param {string} dirPath
 * @param {number} maxDepth
 * @returns {number|undefined}
 */
function calculateDirSizeGb(dirPath, maxDepth = 4) {
  if (!dirPath || !fs.existsSync(dirPath)) return undefined;
  let totalBytes = 0;

  function walk(currentDir, currentDepth) {
    if (currentDepth > maxDepth) return;
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(currentDir, entry.name);
        if (entry.isFile()) {
          try {
            totalBytes += fs.statSync(full).size;
          } catch {}
        } else if (entry.isDirectory()) {
          walk(full, currentDepth + 1);
        }
      }
    } catch {}
  }

  try {
    walk(dirPath, 0);
    if (totalBytes <= 0) return undefined;
    return Math.round((totalBytes / (1024 * 1024 * 1024)) * 10) / 10;
  } catch {
    return undefined;
  }
}

/**
 * Find main executable file in a folder.
 * @param {string} dirPath
 * @param {string[]} preferredNames
 * @returns {string|null}
 */
function findGameExecutable(dirPath, preferredNames = []) {
  if (!dirPath || !fs.existsSync(dirPath)) return null;

  // Check preferred names first
  for (const name of preferredNames) {
    const direct = path.join(dirPath, name);
    if (fs.existsSync(direct)) return direct;
  }

  try {
    const files = fs.readdirSync(dirPath);
    const exes = files.filter(f => f.toLowerCase().endsWith('.exe'));

    // Filter out common installers, updaters, crash reporters, unins
    const filtered = exes.filter(f => {
      const lower = f.toLowerCase();
      return !lower.startsWith('unins') &&
             !lower.includes('crash') &&
             !lower.includes('report') &&
             !lower.includes('update') &&
             !lower.includes('setup') &&
             !lower.includes('install') &&
             !lower.includes('helper') &&
             !lower.includes('redist');
    });

    if (filtered.length > 0) {
      return path.join(dirPath, filtered[0]);
    }

    if (exes.length > 0) {
      return path.join(dirPath, exes[0]);
    }

    // Check one level deep (e.g. Binaries/Win64, bin, x64)
    const subdirs = files.filter(f => {
      try {
        return fs.statSync(path.join(dirPath, f)).isDirectory();
      } catch {
        return false;
      }
    });

    for (const sub of subdirs) {
      const subPath = path.join(dirPath, sub);
      try {
        const subFiles = fs.readdirSync(subPath);
        const subExes = subFiles.filter(f => {
          const lower = f.toLowerCase();
          return lower.endsWith('.exe') &&
                 !lower.startsWith('unins') &&
                 !lower.includes('crash') &&
                 !lower.includes('report') &&
                 !lower.includes('update');
        });
        if (subExes.length > 0) {
          return path.join(subPath, subExes[0]);
        }
      } catch {}
    }
  } catch {}

  return null;
}

module.exports = {
  queryRegValue,
  queryRegSubkeys,
  queryRegKeyValues,
  findUninstallEntries,
  calculateDirSizeGb,
  findGameExecutable,
};
