#!/bin/bash
set -e

# ========================================
#   MediaGuardX - Start All Services
# ========================================
#
# Starts the backend (FastAPI) and frontend (Vite/React) servers.
# The backend is started in the background, health-checked, then the
# frontend is started in the foreground. SIGINT (Ctrl+C) kills both.

# --- Color definitions ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

# --- Cleanup handler: kill child processes on exit ---
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null
        echo -e "${CYAN}Frontend stopped.${NC}"
    fi
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null
        echo -e "${CYAN}Backend stopped.${NC}"
    fi
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  MediaGuardX - Starting All Services${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""

# --- Step 1: Check configuration files ---
echo -e "${CYAN}[1/4] Checking configuration...${NC}"

if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    echo -e "${RED}ERROR: backend/.env not found!${NC}"
    echo "Please create backend/.env from backend/.env.example"
    exit 1
fi
echo -e "${GREEN}  Backend .env found.${NC}"

if [ ! -f "$SCRIPT_DIR/mediaguardx/.env" ]; then
    echo -e "${YELLOW}WARNING: mediaguardx/.env not found.${NC}"
    echo "  Frontend may not work correctly without it."
else
    echo -e "${GREEN}  Frontend .env found.${NC}"
fi

echo -e "${GREEN}Configuration OK.${NC}"

# --- Step 2: Activate Python virtual environment ---
echo ""
echo -e "${CYAN}[2/4] Activating Python virtual environment...${NC}"

if [ ! -f "$SCRIPT_DIR/backend/venv/bin/activate" ]; then
    echo -e "${RED}ERROR: Virtual environment not found at backend/venv/${NC}"
    echo "Run: cd backend && python3 -m venv venv && pip install -r requirements.txt"
    exit 1
fi

source "$SCRIPT_DIR/backend/venv/bin/activate"
echo -e "${GREEN}Virtual environment activated.${NC}"

# --- Step 3: Start backend server in background ---
echo ""
echo -e "${CYAN}[3/4] Starting Backend Server...${NC}"

cd "$SCRIPT_DIR/backend"
python main.py &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# Wait for backend health check with retries
MAX_RETRIES=30
RETRY_INTERVAL=2
echo -e "${YELLOW}  Waiting for backend to be ready (up to $((MAX_RETRIES * RETRY_INTERVAL))s)...${NC}"

for i in $(seq 1 $MAX_RETRIES); do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}  Backend is ready! (took ~$((i * RETRY_INTERVAL))s)${NC}"
        break
    fi

    # Check if the backend process is still alive
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${RED}ERROR: Backend process exited unexpectedly.${NC}"
        exit 1
    fi

    if [ "$i" -eq "$MAX_RETRIES" ]; then
        echo -e "${RED}ERROR: Backend did not become healthy after $((MAX_RETRIES * RETRY_INTERVAL))s.${NC}"
        echo "Check backend logs for errors."
        exit 1
    fi

    sleep $RETRY_INTERVAL
done

# --- Step 4: Start frontend server ---
echo ""
echo -e "${CYAN}[4/4] Starting Frontend Server...${NC}"

cd "$SCRIPT_DIR/mediaguardx"
npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  All services started!${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""
echo -e "  Backend:  ${GREEN}http://localhost:8000${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "  API Docs: ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

# Wait for both processes; if either exits, trigger cleanup
wait
