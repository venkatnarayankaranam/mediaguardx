@echo off
echo.
echo ========================================
echo   MediaGuardX - Starting All Services
echo ========================================
echo.

REM Check if MongoDB is running
echo [1/3] Checking MongoDB...
sc query MongoDB | find "RUNNING" >nul
if errorlevel 1 (
    echo ERROR: MongoDB is not running!
    echo Please start MongoDB service first.
    echo Run: net start MongoDB (as Administrator)
    pause
    exit /b 1
)
echo MongoDB is running OK

REM Start Backend in new window
echo.
echo [2/3] Starting Backend Server...
start "MediaGuardX Backend" cmd /k "cd backend && python main.py"
timeout /t 5 /nobreak >nul

REM Start Frontend in new window
echo.
echo [3/3] Starting Frontend Server...
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
