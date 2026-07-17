#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo -e "${GREEN}============================================"
echo "        PRINTIFY - One Click Start"
echo -e "============================================${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed.${NC}"
    echo "Install from: https://nodejs.org"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm is not installed.${NC}"
    exit 1
fi

echo -e "${CYAN}[1/3] Installing dependencies (if needed)...${NC}"
echo ""

# Install frontend deps
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "  Frontend dependencies already installed."
fi

# Install backend deps
if [ ! -d "backend/node_modules" ]; then
    (cd backend && npm install)
else
    echo "  Backend dependencies already installed."
fi

echo ""
echo -e "${CYAN}[2/3] Starting Backend Server (port 3001)...${NC}"
echo -e "${CYAN}[3/3] Starting Frontend Server (port 5000)...${NC}"
echo ""
echo -e "${GREEN}============================================"
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:5000"
echo -e "============================================${NC}"
echo ""
echo "  Press Ctrl+C in either terminal to stop."
echo -e "${GREEN}============================================${NC}"
echo ""

# Cleanup function: kill both processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill "$BACKEND_PID" 2>/dev/null
    kill "$FRONTEND_PID" 2>/dev/null
    wait "$BACKEND_PID" 2>/dev/null
    wait "$FRONTEND_PID" 2>/dev/null
    echo -e "${GREEN}All servers stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
(cd backend && npm run dev) &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Start frontend
npm run dev &
FRONTEND_PID=$!

# Wait for both
wait
