#!/bin/bash
set -e

# ========================================
#   MediaGuardX - Start Frontend Server
# ========================================
#
# Starts the Vite/React frontend development server.

# --- Color definitions ---
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  MediaGuardX - Starting Frontend${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""

# --- Check for node_modules ---
if [ ! -d "$SCRIPT_DIR/mediaguardx/node_modules" ]; then
    echo -e "${RED}ERROR: node_modules not found!${NC}"
    echo "Run: cd mediaguardx && npm install"
    exit 1
fi

# --- Start the frontend ---
echo -e "${CYAN}Starting frontend dev server...${NC}"
echo ""
cd "$SCRIPT_DIR/mediaguardx"
npm run dev
