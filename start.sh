#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BACKEND_PORT=3001
FRONTEND_PORT=5000

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

# Find PIDs listening on a given port
pids_on_port() {
    local port="$1"
    if command -v lsof &> /dev/null; then
        lsof -ti tcp:"$port" 2>/dev/null || true
    elif command -v ss &> /dev/null; then
        ss -tlnp 2>/dev/null | grep -E ":$port " | grep -oP 'pid=\K[0-9]+' | sort -u || true
    fi
}

# Free the ports if stale processes are still holding them
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
    PIDS=$(pids_on_port "$port")
    if [ -n "$PIDS" ]; then
        echo -e "${YELLOW}[WARN] Port $port is already in use by stale process(es): $PIDS${NC}"
        for pid in $PIDS; do
            kill -TERM "$pid" 2>/dev/null || true
        done
        sleep 2
        PIDS=$(pids_on_port "$port")
        if [ -n "$PIDS" ]; then
            for pid in $PIDS; do
                kill -KILL "$pid" 2>/dev/null || true
            done
            sleep 1
        fi
        PIDS=$(pids_on_port "$port")
        if [ -n "$PIDS" ]; then
            echo -e "${RED}[ERROR] Could not free port $port. Please stop the process(es) manually: $PIDS${NC}"
            exit 1
        fi
        echo -e "${GREEN}[OK] Port $port freed.${NC}"
    fi
done

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
echo -e "${CYAN}[2/3] Starting Backend Server (port $BACKEND_PORT)...${NC}"
echo -e "${CYAN}[3/3] Starting Frontend Server (port $FRONTEND_PORT)...${NC}"
echo ""
echo -e "${GREEN}============================================"
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo -e "============================================${NC}"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo -e "${GREEN}============================================${NC}"
echo ""

# Cleanup function: kill both process trees on exit
CLEANUP_DONE=0
cleanup() {
    if [ "$CLEANUP_DONE" = "1" ]; then
        return 0
    fi
    CLEANUP_DONE=1
    local pid
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
        if [ -n "$pid" ]; then
            kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
        fi
    done
    sleep 2
    for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            kill -KILL -"$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
        fi
    done
    BACKEND_PID=""
    FRONTEND_PID=""
    echo -e "${GREEN}All servers stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start backend in its own process group so we can kill the whole tree later
if command -v setsid &> /dev/null; then
    setsid bash -c 'cd backend && exec npm run dev' &
else
    (cd backend && npm run dev) &
fi
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Start frontend in its own process group
if command -v setsid &> /dev/null; then
    setsid npm run dev &
else
    npm run dev &
fi
FRONTEND_PID=$!

# Monitor both servers. A plain `wait` would block the signal trap from
# running, so poll in short intervals instead.
while kill -0 "$BACKEND_PID" 2>/dev/null || kill -0 "$FRONTEND_PID" 2>/dev/null; do
    sleep 1
done
