#!/usr/bin/env node
/**
 * Automatically syncs package.json version with the latest release version in CHANGELOG.md.
 * Ensures compiled executables always match the changelog version accurately.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');
const mainCjsPath = path.join(rootDir, 'electron', 'main.cjs');
const securityPath = path.join(rootDir, 'SECURITY.md');

function syncVersion() {
  if (!fs.existsSync(changelogPath) || !fs.existsSync(packageJsonPath)) {
    console.warn('[sync-version] CHANGELOG.md or package.json not found, skipping.');
    return;
  }

  const changelog = fs.readFileSync(changelogPath, 'utf8');

  // Find first release header matching: ## [0.x.y] - YYYY-MM-DD
  const match = changelog.match(/##\s+\[(0\.\d+\.\d+)\](?:\s+-\s+\d{4}-\d{2}-\d{2})?/);
  if (!match || !match[1]) {
    console.warn('[sync-version] No valid 0.#.# release version header found in CHANGELOG.md.');
    return;
  }

  const changelogVersion = match[1];
  console.log(`[sync-version] Latest version in CHANGELOG.md: ${changelogVersion}`);

  // 1. Update package.json
  const pkgRaw = fs.readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(pkgRaw);

  if (pkg.version !== changelogVersion) {
    const oldVersion = pkg.version;
    pkg.version = changelogVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`[sync-version] Updated package.json version: ${oldVersion} -> ${changelogVersion}`);
  } else {
    console.log(`[sync-version] package.json version is already in sync (${changelogVersion}).`);
  }

  // 2. Update package-lock.json if present
  if (fs.existsSync(packageLockPath)) {
    try {
      const lockRaw = fs.readFileSync(packageLockPath, 'utf8');
      const lock = JSON.parse(lockRaw);
      if (lock.version !== changelogVersion || lock.packages?.['']?.version !== changelogVersion) {
        lock.version = changelogVersion;
        if (lock.packages && lock.packages['']) {
          lock.packages[''].version = changelogVersion;
        }
        fs.writeFileSync(packageLockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
        console.log(`[sync-version] Updated package-lock.json version to ${changelogVersion}.`);
      }
    } catch (err) {
      console.warn('[sync-version] Could not update package-lock.json:', err.message);
    }
  }

  // 3. Update electron/main.cjs default config version & User-Agent if present
  if (fs.existsSync(mainCjsPath)) {
    try {
      let mainCjs = fs.readFileSync(mainCjsPath, 'utf8');
      const versionRegex = /version:\s*'0\.\d+\.\d+'/g;
      if (versionRegex.test(mainCjs)) {
        mainCjs = mainCjs.replace(versionRegex, `version: '${changelogVersion}'`);
        fs.writeFileSync(mainCjsPath, mainCjs, 'utf8');
      }
    } catch (err) {
      console.warn('[sync-version] Could not update electron/main.cjs:', err.message);
    }
  }

  // 4. Update SECURITY.md supported version table if present
  if (fs.existsSync(securityPath)) {
    try {
      let security = fs.readFileSync(securityPath, 'utf8');
      const majorMinor = changelogVersion.split('.').slice(0, 2).join('.') + '.x';
      if (!security.includes(majorMinor)) {
        security = security.replace(/\| (0\.\d+\.x)\s+\|/, `| ${majorMinor}   |\n| $1   |`);
        fs.writeFileSync(securityPath, security, 'utf8');
        console.log(`[sync-version] Added ${majorMinor} to SECURITY.md supported versions.`);
      }
    } catch (err) {
      console.warn('[sync-version] Could not update SECURITY.md:', err.message);
    }
  }
}

syncVersion();
