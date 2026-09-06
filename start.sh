#!/usr/bin/env bash
# PrintPress ERP — one-click desktop start (Electron development mode).
# Starts the backend, the Vite dev server and the Electron window together.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}============================================"
echo "        PRINTIFY - Desktop App Launcher"
echo -e "============================================${NC}"
echo ""

if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed.${NC}"
    echo "Install from: https://nodejs.org"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies (first run)...${NC}"
    npm install
fi

echo -e "${GREEN}Launching PrintPress ERP desktop app...${NC}"
echo "  Backend: http://localhost:3001"
echo "  Frontend (dev): http://localhost:5000"
echo ""
echo "  Press Ctrl+C to stop everything."
echo ""

exec npm run electron:dev