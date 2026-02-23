@echo off
echo.
echo ========================================
echo   MediaGuardX - Starting All Services
echo ========================================
echo.

REM Check if backend .env exists
echo [1/2] Checking configuration...
if not exist "backend\.env" (
    echo ERROR: backend\.env not found!
    echo Please create backend\.env from backend\.env.example
    pause
    exit /b 1
)
echo Configuration OK

REM Start Backend in new window
echo.
echo [1/2] Starting Backend Server...
start "MediaGuardX Backend" cmd /k "cd backend && python main.py"
timeout /t 5 /nobreak >nul

REM Start Frontend in new window
echo.
echo [2/2] Starting Frontend Server...
start "MediaGuardX Frontend" cmd /k "cd mediaguardx && npm run dev"

echo.
echo ========================================
echo   All services started!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to close this window...
pause >nul
