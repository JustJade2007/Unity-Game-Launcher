@echo off
title Unity Game Launcher - Executable Builder
cd /d "%~dp0"

echo ============================================================
echo   Unity Game Launcher — Executable Packaging Tool
echo ============================================================
echo.
echo Select the package build target:
echo [1] Build Both: NSIS Setup Installer + Standalone Portable EXE (Recommended)
echo [2] Build NSIS Setup Installer EXE only
echo [3] Build Standalone Portable EXE only
echo [4] Exit
echo.

set /p choice="Enter option (1-4) [default 1]: "
if "%choice%"=="" set choice=1
if "%choice%"=="4" exit /b 0

if not exist "node_modules\" (
    echo.
    echo [Setup] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [Error] Failed to install dependencies.
        pause
        exit /b %errorlevel%
    )
)

echo.
echo [Build] Compiling production web bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [Error] Frontend build failed.
    pause
    exit /b %errorlevel%
)

if "%choice%"=="1" (
    echo.
    echo [Package] Building NSIS Setup Installer and Portable Standalone Executables...
    call npx electron-builder --win nsis portable
) else if "%choice%"=="2" (
    echo.
    echo [Package] Building NSIS Setup Installer Executable...
    call npx electron-builder --win nsis
) else if "%choice%"=="3" (
    echo.
    echo [Package] Building Standalone Portable Executable...
    call npx electron-builder --win portable
) else (
    echo [Error] Invalid choice selected.
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo.
    echo [Error] Executable packaging failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================================
echo   Packaging Complete! Output files located in 'release\':
echo ============================================================
dir /b release\*.exe
echo.
echo You can run the portable executable directly without installing,
echo or run the setup installer to install Unity Game Launcher onto Windows.
echo.
pause
exit /b 0
