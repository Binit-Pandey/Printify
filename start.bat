@echo off
setlocal
title Printify - PrintPress ERP Desktop App
color 0A

echo ============================================
echo        PRINTIFY - Desktop App Launcher
echo ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies (first run)...
    call npm install
)

echo.
echo Launching PrintPress ERP desktop app...
echo   Backend: http://localhost:3001
echo   Frontend (dev): http://localhost:5000
echo.
echo   Press Ctrl+C to stop everything.
echo.

call npm run electron:dev