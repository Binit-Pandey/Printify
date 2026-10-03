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

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v

if not exist "node_modules" (
    echo Installing dependencies (first run)...
    call npm install
)

echo   Node.js: %NODE_VERSION%
echo.

echo.
echo Launching PrintPress ERP desktop app...
echo   Backend: http://localhost:3001
echo   Frontend (dev): http://localhost:5000
echo.
echo --------------------------------------------
echo   Default login (fresh install)
echo --------------------------------------------
echo   User ID  : superadmin
echo   Password : admin123
echo.
echo   Change this password after the first login.
echo   Already registered? Use the account you signed up with.
echo.
echo   Press Ctrl+C to stop everything.
echo.

call npm run electron:dev