const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const steamdbImageService = require('./steamdbImageService.cjs');

// Executables that should be ignored during directory scanning
const IGNORED_EXE_PATTERNS = [
  /unins.*\.exe$/i,
  /uninstall.*\.exe$/i,
  /setup.*\.exe$/i,
  /install.*\.exe$/i,
  /patch.*\.exe$/i,
  /update.*\.exe$/i,
  /crashhandler.*\.exe$/i,
  /crashreport.*\.exe$/i,
  /unitycrashhandler.*\.exe$/i,
  /vcredist.*\.exe$/i,
  /dxsetup.*\.exe$/i,
  /oalinst.*\.exe$/i,
  /dotnet.*\.exe$/i,
  /easyanticheat.*\.exe$/i,
  /battleye.*\.exe$/i,
  /redist.*\.exe$/i,
  /helper.*\.exe$/i,
  /dependencies.*\.exe$/i,
];

const GENERIC_PRODUCT_NAMES = [
  'unity',
  'unityplayer',
  'unity player',
  'unreal',
  'unrealengine',
  'unreal engine',
  'godot',
  'application',
  'game',
  'launcher',
  'bootstrapper',
  'stub',
];

/**
 * Clean and format an inferred title.
 * @param {string} raw
 * @returns {string}
 */
function cleanTitle(raw) {
  if (!raw) return '';
  let cleaned = raw
    .replace(/\.exe$/i, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize words if all lowercase or all uppercase
  if (cleaned === cleaned.toLowerCase() || cleaned === cleaned.toUpperCase()) {
    cleaned = cleaned
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return cleaned;
}

/**
 * Check if a product name or description is too generic to be a game title.
 * @param {string} name
 * @returns {boolean}
 */
function isGenericTitle(name) {
  if (!name) return true;
  const lower = name.toLowerCase().trim();
  if (lower.length < 2) return true;
  return GENERIC_PRODUCT_NAMES.some((g) => lower === g || lower.startsWith(g + ' '));
}

class BinaryMetadataParser {
  /**
   * Parse a Windows binary (.exe), extract metadata headers, icons, and query SteamDB.
   * @param {string} filePath
   * @param {Electron.App} [electronApp]
   * @returns {Promise<object>}
   */
  async parseExecutable(filePath, electronApp) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided.');
    }

    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File does not exist: "${resolvedPath}"`);
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      throw new Error(`Path is not a regular file: "${resolvedPath}"`);
    }

    const sizeGb = Math.round((stat.size / (1024 * 1024 * 1024)) * 100) / 100;
    const workingDirectory = path.dirname(resolvedPath);
    const fileName = path.basename(resolvedPath);
    const fallbackTitle = cleanTitle(fileName);

    let versionInfo = null;
    try {
      // Escape single quotes for PowerShell literal string
      const escaped = resolvedPath.replace(/'/g, "''");
      const psCmd = `powershell -NoProfile -NonInteractive -Command "(Get-Item -LiteralPath '${escaped}').VersionInfo | Select-Object -Property ProductName, FileDescription, ProductVersion, FileVersion, CompanyName | ConvertTo-Json"`;
      const stdout = execSync(psCmd, { timeout: 4000, windowsHide: true }).toString();
      if (stdout && stdout.trim()) {
        versionInfo = JSON.parse(stdout.trim());
      }
    } catch (err) {
      console.warn(`[BinaryMetadataParser] Could not retrieve VersionInfo for ${resolvedPath}:`, err.message);
    }

    // Determine the best inferred title
    let inferredTitle = '';
    if (versionInfo?.FileDescription && !isGenericTitle(versionInfo.FileDescription)) {
      inferredTitle = cleanTitle(versionInfo.FileDescription);
    } else if (versionInfo?.ProductName && !isGenericTitle(versionInfo.ProductName)) {
      inferredTitle = cleanTitle(versionInfo.ProductName);
    }

    if (!inferredTitle || inferredTitle.length < 2) {
      // Fallback: check parent directory if the filename is generic (e.g. "game.exe")
      const baseLower = fileName.toLowerCase();
      if (baseLower === 'game.exe' || baseLower === 'main.exe' || baseLower === 'launch.exe' || baseLower === 'play.exe') {
        const parentDir = path.basename(workingDirectory);
        inferredTitle = cleanTitle(parentDir);
      } else {
        inferredTitle = fallbackTitle;
      }
    }

    // Extract native application icon via Electron
    let iconDataUrl = '';
    if (electronApp && typeof electronApp.getFileIcon === 'function') {
      try {
        const nativeIcon = await electronApp.getFileIcon(resolvedPath, { size: 'large' });
        if (nativeIcon && !nativeIcon.isEmpty()) {
          iconDataUrl = nativeIcon.toDataURL();
        }
      } catch (iconErr) {
        console.warn(`[BinaryMetadataParser] Failed to extract native icon for ${resolvedPath}:`, iconErr.message);
      }
    }

    const company = versionInfo?.CompanyName && versionInfo.CompanyName !== 'Microsoft Corporation'
      ? versionInfo.CompanyName
      : 'Local Developer';

    const result = {
      title: inferredTitle,
      developer: company,
      publisher: company,
      executablePath: resolvedPath,
      workingDirectory,
      launchArguments: '',
      sizeGb,
      version: versionInfo?.ProductVersion || versionInfo?.FileVersion || undefined,
      description: versionInfo?.FileDescription || `Custom local title installed at ${workingDirectory}.`,
      media: {
        coverUrl: iconDataUrl,
        heroUrl: '',
        iconUrl: iconDataUrl,
        screenshots: [],
      },
      categories: ['Custom', 'Action'],
    };

    // Query SteamDB fallback lookup for enriched artwork and description
    try {
      if (inferredTitle) {
        const appId = await steamdbImageService.findAppIdByTitle(inferredTitle);
        if (appId) {
          result.appId = String(appId);
          const storeDetails = await steamdbImageService.fetchStoreDetails(appId);
          const { media } = await steamdbImageService.enrichGameMedia({
            title: inferredTitle,
            appId,
            media: result.media,
          });

          if (media?.coverUrl) result.media.coverUrl = media.coverUrl;
          if (media?.heroUrl) result.media.heroUrl = media.heroUrl;
          if (media?.logoUrl) result.media.logoUrl = media.logoUrl;
          if (Array.isArray(media?.screenshots) && media.screenshots.length > 0) {
            result.media.screenshots = media.screenshots;
          }
          if (storeDetails?.background && !result.media.heroUrl) {
            result.media.heroUrl = storeDetails.background;
          }
        }
      }
    } catch (enrichErr) {
      console.warn(`[BinaryMetadataParser] SteamDB enrichment error for "${inferredTitle}":`, enrichErr.message);
    }

    return result;
  }

  /**
   * Recursively scan a directory for candidate game executables (up to 2 levels deep).
   * @param {string} dirPath
   * @param {Electron.App} [electronApp]
   * @returns {Promise<Array<object>>}
   */
  async scanDirectoryForGames(dirPath, electronApp) {
    if (!dirPath || typeof dirPath !== 'string') {
      throw new Error('Invalid directory path provided.');
    }

    const resolvedDir = path.resolve(dirPath);
    if (!fs.existsSync(resolvedDir)) {
      throw new Error(`Directory does not exist: "${resolvedDir}"`);
    }

    const candidateFiles = [];

    const walk = (currentDir, depth) => {
      if (depth > 2) return;
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            // Ignore hidden and system folders
            if (!entry.name.startsWith('.') && !entry.name.startsWith('$')) {
              walk(fullPath, depth + 1);
            }
          } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
            const isIgnored = IGNORED_EXE_PATTERNS.some((pattern) => pattern.test(entry.name));
            if (!isIgnored) {
              candidateFiles.push(fullPath);
            }
          }
        }
      } catch (err) {
        console.warn(`[BinaryMetadataParser] Could not read directory ${currentDir}:`, err.message);
      }
    };

    walk(resolvedDir, 0);

    const candidates = [];
    for (const exePath of candidateFiles) {
      try {
        const stat = fs.statSync(exePath);
        const fileName = path.basename(exePath);
        const sizeGb = Math.round((stat.size / (1024 * 1024 * 1024)) * 100) / 100;
        const workingDirectory = path.dirname(exePath);

        let iconDataUrl = '';
        if (electronApp && typeof electronApp.getFileIcon === 'function') {
          try {
            const icon = await electronApp.getFileIcon(exePath, { size: 'large' });
            if (icon && !icon.isEmpty()) {
              iconDataUrl = icon.toDataURL();
            }
          } catch {}
        }

        candidates.push({
          title: cleanTitle(fileName),
          fileName,
          executablePath: exePath,
          workingDirectory,
          sizeGb,
          iconDataUrl,
          sourceDirectory: resolvedDir,
        });
      } catch {}
    }

    return candidates;
  }
}

module.exports = new BinaryMetadataParser();
