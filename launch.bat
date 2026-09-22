@echo off
title Unity Game Launcher
cd /d "%~dp0"

echo ============================================================
echo   Starting Unity Game Launcher (Desktop Application)
echo ============================================================
echo.

if not exist "node_modules\" (
    echo [Setup] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [Error] Failed to install dependencies.
        pause
        exit /b %errorlevel%
    )
)

if not exist "dist\" (
    echo [Build] Compiling desktop application assets...
    call npm run build
    if %errorlevel% neq 0 (
        echo [Error] Build failed.
        pause
        exit /b %errorlevel%
    )
)

echo [Launch] Opening Unity Game Launcher...
REM Prefer launching compiled portable binary if available in release folder
for %%F in ("release\Unity-Game-Launcher-Portable-*.exe") do (
    if exist "%%F" (
        echo [Launch] Found compiled binary: %%F
        start "" "%%F"
        exit /b 0
    )
)

if exist "node_modules\.bin\electron.cmd" (
    start "" "node_modules\.bin\electron.cmd" .
) else (
    start "" npx electron .
)
exit /b 0
