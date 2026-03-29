#!/bin/bash
set -e

# ========================================
#   MediaGuardX - Setup Verification
# ========================================
#
# Checks that all prerequisites are installed and configured:
#   - Python 3.10+
#   - Node.js 18+
#   - Backend virtual environment and key dependencies
#   - Frontend npm packages
#   - Environment configuration files

# --- Color definitions ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERRORS=0

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  MediaGuardX - Setup Verification${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""

# --- [1/5] Check Python version (3.10+) ---
echo -e "${CYAN}[1/5] Checking Python...${NC}"
if command -v python3 &>/dev/null; then
    PY_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
    echo -e "  Python version: ${GREEN}$PY_VERSION${NC}"
    if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 10 ]; }; then
        echo -e "  ${RED}ERROR: Python 3.10+ is required (found $PY_VERSION)${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "  ${GREEN}Python version OK${NC}"
    fi
elif command -v python &>/dev/null; then
    PY_VERSION=$(python --version 2>&1 | awk '{print $2}')
    PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
    echo -e "  Python version: ${GREEN}$PY_VERSION${NC}"
    if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 10 ]; }; then
        echo -e "  ${RED}ERROR: Python 3.10+ is required (found $PY_VERSION)${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "  ${GREEN}Python version OK${NC}"
    fi
else
    echo -e "  ${RED}ERROR: Python not found!${NC}"
    echo "  Install Python 3.10+ from https://www.python.org/"
    ERRORS=$((ERRORS + 1))
fi

# --- [2/5] Check Node.js version (18+) ---
echo ""
echo -e "${CYAN}[2/5] Checking Node.js...${NC}"
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version 2>&1 | sed 's/^v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    echo -e "  Node.js version: ${GREEN}v$NODE_VERSION${NC}"
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo -e "  ${RED}ERROR: Node.js 18+ is required (found v$NODE_VERSION)${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "  ${GREEN}Node.js version OK${NC}"
    fi
else
    echo -e "  ${RED}ERROR: Node.js not found!${NC}"
    echo "  Install Node.js 18+ from https://nodejs.org/"
    ERRORS=$((ERRORS + 1))
fi

# --- [3/5] Check Backend Dependencies ---
echo ""
echo -e "${CYAN}[3/5] Checking Backend Dependencies...${NC}"
if [ -f "$SCRIPT_DIR/backend/venv/bin/activate" ]; then
    echo -e "  ${GREEN}Virtual environment found${NC}"

    # Activate venv to check installed packages
    source "$SCRIPT_DIR/backend/venv/bin/activate"

    # Check for FastAPI
    if python -c "import fastapi; print('  FastAPI:', fastapi.__version__)" 2>/dev/null; then
        echo -e "  ${GREEN}FastAPI OK${NC}"
    else
        echo -e "  ${RED}ERROR: FastAPI not installed!${NC}"
        echo "  Run: cd backend && source venv/bin/activate && pip install -r requirements.txt"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for PyTorch
    if python -c "import torch; print('  PyTorch:', torch.__version__)" 2>/dev/null; then
        echo -e "  ${GREEN}PyTorch OK${NC}"
    else
        echo -e "  ${YELLOW}WARNING: PyTorch not installed (ML features may not work)${NC}"
        echo "  Run: cd backend && source venv/bin/activate && pip install -r requirements.txt"
        ERRORS=$((ERRORS + 1))
    fi

    deactivate 2>/dev/null || true
else
    echo -e "  ${RED}ERROR: Virtual environment not found!${NC}"
    echo "  Run: cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    ERRORS=$((ERRORS + 1))
fi

# --- [4/5] Check Frontend Dependencies ---
echo ""
echo -e "${CYAN}[4/5] Checking Frontend Dependencies...${NC}"
if [ -d "$SCRIPT_DIR/mediaguardx/node_modules" ]; then
    echo -e "  ${GREEN}node_modules found${NC}"

    # Check for key npm packages by looking for their directories
    if [ -d "$SCRIPT_DIR/mediaguardx/node_modules/react" ]; then
        echo -e "  ${GREEN}React OK${NC}"
    else
        echo -e "  ${YELLOW}WARNING: React not found in node_modules${NC}"
    fi

    if [ -d "$SCRIPT_DIR/mediaguardx/node_modules/vite" ]; then
        echo -e "  ${GREEN}Vite OK${NC}"
    else
        echo -e "  ${YELLOW}WARNING: Vite not found in node_modules${NC}"
    fi

    echo -e "  ${GREEN}Frontend dependencies OK${NC}"
else
    echo -e "  ${RED}ERROR: Frontend dependencies not installed!${NC}"
    echo "  Run: cd mediaguardx && npm install"
    ERRORS=$((ERRORS + 1))
fi

# --- [5/5] Check .env files ---
echo ""
echo -e "${CYAN}[5/5] Checking Configuration...${NC}"
if [ -f "$SCRIPT_DIR/backend/.env" ]; then
    echo -e "  ${GREEN}Backend .env file found${NC}"
else
    echo -e "  ${YELLOW}WARNING: Backend .env file not found!${NC}"
    echo "  Create backend/.env from backend/.env.example"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "$SCRIPT_DIR/mediaguardx/.env" ]; then
    echo -e "  ${GREEN}Frontend .env file found${NC}"
else
    echo -e "  ${YELLOW}WARNING: Frontend .env file not found!${NC}"
    echo "  Create mediaguardx/.env from mediaguardx/.env.example"
    ERRORS=$((ERRORS + 1))
fi

# --- Summary ---
echo ""
echo -e "${BOLD}========================================${NC}"
if [ "$ERRORS" -eq 0 ]; then
    echo -e "  ${GREEN}All checks passed! Ready to run.${NC}"
    echo -e "  Run: ${CYAN}./start-all.sh${NC}"
else
    echo -e "  ${RED}$ERRORS check(s) failed. Fix the issues above.${NC}"
fi
echo -e "${BOLD}========================================${NC}"
echo ""

exit $ERRORS
