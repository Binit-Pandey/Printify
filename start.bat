@echo off
title Printify - Starting Application
color 0A

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
echo [2/3] Starting Backend Server (port 3001)...
echo [3/3] Starting Frontend Server (port 5000)...
echo.
echo ============================================
echo  Backend:  http://localhost:3001
echo  Frontend: http://localhost:5000
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
