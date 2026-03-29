#!/bin/bash
set -e

# ========================================
#   MediaGuardX - Start Backend Server
# ========================================
#
# Activates the Python virtual environment and starts the FastAPI backend.

# --- Color definitions ---
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  MediaGuardX - Starting Backend${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""

# --- Check for virtual environment ---
if [ ! -f "$SCRIPT_DIR/backend/venv/bin/activate" ]; then
    echo -e "${RED}ERROR: Virtual environment not found at backend/venv/${NC}"
    echo "Run: cd backend && python3 -m venv venv && pip install -r requirements.txt"
    exit 1
fi

# --- Activate virtual environment ---
echo -e "${CYAN}Activating virtual environment...${NC}"
source "$SCRIPT_DIR/backend/venv/bin/activate"
echo -e "${GREEN}Virtual environment activated.${NC}"

# --- Start the backend ---
echo -e "${CYAN}Starting backend server...${NC}"
echo ""
cd "$SCRIPT_DIR/backend"
python main.py
