@echo off
setlocal enabledelayedexpansion
title Printify - Starting Application
color 0A

set BACKEND_PORT=3001
set FRONTEND_PORT=5000

echo ============================================
echo        PRINTIFY - One Click Start
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

:: Free the ports if stale processes are still holding them
for %%P in (%BACKEND_PORT% %FRONTEND_PORT%) do (
    set "STILL=0"
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr /C:":%%P " ^| findstr /C:"LISTENING"') do (
        echo   [WARN] Port %%P is in use by PID %%A. Stopping stale process...
        taskkill /PID %%A >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr /C:":%%P " ^| findstr /C:"LISTENING"') do (
        echo   [ERROR] Port %%P still in use by PID %%A.
        set STILL=1
    )
    if "!STILL!"=="1" (
        color 0C
        echo   Please stop the process manually and re-run.
        pause
        exit /b 1
    )
)

echo [1/3] Installing dependencies (if needed)...
echo.

:: Install frontend dependencies
if not exist "node_modules" (
    call npm install
) else (
    echo   Frontend dependencies already installed.
)

:: Install backend dependencies
if not exist "backend\node_modules" (
    cd backend
    call npm install
    cd ..
) else (
    echo   Backend dependencies already installed.
)

echo.
echo [2/3] Starting Backend Server (port %BACKEND_PORT%)...
echo [3/3] Starting Frontend Server (port %FRONTEND_PORT%)...
echo.
echo ============================================
echo  Backend:  http://localhost:%BACKEND_PORT%
echo  Frontend: http://localhost:%FRONTEND_PORT%
echo ============================================
echo.
echo  Press Ctrl+C in either window to stop.
echo ============================================
echo.

:: Start backend in a new window
start "Printify Backend" cmd /k "cd backend && npm run dev"

:: Wait a moment for backend to initialize
timeout /t 2 /nobreak >nul

:: Start frontend in a new window
start "Printify Frontend" cmd /k "npm run dev"

echo Both servers are starting in separate windows.
echo.
pause
