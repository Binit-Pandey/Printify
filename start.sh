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

# Native modules (better-sqlite3) are compiled per Node.js ABI, so the launcher
# must use the same Node.js version the dependencies were installed with.
# Desktop launches often run without nvm on PATH, which silently falls back to
# an older system Node.js and breaks the backend. Prefer the pinned version.
PINNED_NODE_VERSION="$(tr -d '[:space:]' < .nvmrc 2>/dev/null || true)"
if [ -n "$PINNED_NODE_VERSION" ]; then
    CURRENT_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
    PINNED_MAJOR="${PINNED_NODE_VERSION%%.*}"
    if [ "$CURRENT_MAJOR" != "$PINNED_MAJOR" ]; then
        NVM_NODE_BIN="$(ls -d "$HOME"/.nvm/versions/node/v${PINNED_MAJOR}.* 2>/dev/null | sort -V | tail -n 1)/bin"
        if [ -x "$NVM_NODE_BIN/node" ]; then
            echo -e "${YELLOW}Switching to Node.js $(basename "$(dirname "$NVM_NODE_BIN")") (found v$CURRENT_MAJOR.x on PATH).${NC}"
            export PATH="$NVM_NODE_BIN:$PATH"
        else
            echo -e "${YELLOW}[WARNING] Node.js v$PINNED_MAJOR is pinned in .nvmrc but is not installed.${NC}"
            echo -e "${YELLOW}         Install it with: nvm install ${PINNED_MAJOR} && nvm use ${PINNED_MAJOR}${NC}"
        fi
    fi
fi

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies (first run)...${NC}"
    npm install
fi

echo "  Node.js: $(node -v) ($(command -v node))"
echo ""
echo -e "${GREEN}Launching PrintPress ERP desktop app...${NC}"
echo "  Backend: http://localhost:3001"
echo "  Frontend (dev): http://localhost:5000"
echo ""
echo -e "${GREEN}--------------------------------------------${NC}"
echo -e "${GREEN}  Default login (fresh install)${NC}"
echo -e "${GREEN}--------------------------------------------${NC}"
echo "  User ID  : superadmin"
echo "  Password : admin123"
echo ""
echo -e "${YELLOW}  Change this password after the first login.${NC}"
echo -e "${YELLOW}  Already registered? Use the account you signed up with.${NC}"
echo ""
echo "  Press Ctrl+C to stop everything."
echo ""

exec npm run electron:dev