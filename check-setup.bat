@echo off
echo.
echo ========================================
echo   MediaGuardX - Setup Verification
echo ========================================
echo.

set ERROR=0

REM Check Python
echo [1/5] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    set ERROR=1
) else (
    python --version
)

REM Check Node.js
echo.
echo [2/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    set ERROR=1
) else (
    node --version
)

REM Check Backend Dependencies
echo.
echo [3/5] Checking Backend Dependencies...
if exist "backend\venv\Scripts\activate.bat" (
    echo Virtual environment found
    call backend\venv\Scripts\activate.bat >nul 2>&1
    python -c "import fastapi; print('FastAPI:', fastapi.__version__)" 2>nul
    if errorlevel 1 (
        echo ERROR: Backend dependencies not installed!
        echo Run: cd backend && pip install -r requirements.txt
        set ERROR=1
    ) else (
        echo Backend dependencies OK
    )
) else (
    echo ERROR: Virtual environment not found!
    echo Run: cd backend && python -m venv venv
    set ERROR=1
)

REM Check Frontend Dependencies
echo.
echo [4/5] Checking Frontend Dependencies...
if exist "mediaguardx\node_modules" (
    echo Frontend dependencies OK
) else (
    echo ERROR: Frontend dependencies not installed!
    echo Run: cd mediaguardx && npm install
    set ERROR=1
)

REM Check .env files
echo.
echo [5/5] Checking Configuration...
if exist "backend\.env" (
    echo Backend .env file found
) else (
    echo WARNING: Backend .env file not found!
    echo Create backend\.env from backend\.env.example
    set ERROR=1
)
if exist "mediaguardx\.env" (
    echo Frontend .env file found
) else (
    echo WARNING: Frontend .env file not found!
    echo Create mediaguardx\.env from mediaguardx\.env.example
    set ERROR=1
)

echo.
echo ========================================
if %ERROR%==0 (
    echo   All checks passed! Ready to run.
    echo   Run: start-all.bat
) else (
    echo   Some checks failed. Fix issues above.
)
echo ========================================
echo.
pause
