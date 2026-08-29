@echo off
echo ============================================
echo    SKH SuperPS System Startup
echo ============================================
echo.

echo [1/3] Checking if backend is already running...
netstat -ano | findstr :5000 > nul
if %errorlevel% equ 0 (
    echo WARNING: Port 5000 is already in use!
    echo Please stop the existing backend server first.
    echo.
    echo To kill existing process:
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
        echo   taskkill /PID %%a /F
    )
    echo.
    pause
    exit /b 1
)

echo [2/3] Starting Backend Server...
cd backend
start "SKH Backend" cmd /k "npm run dev"
cd ..
timeout /t 5 /nobreak > nul

echo [3/3] Starting Frontend Development Server...
cd frontend
start "SKH Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ============================================
echo    System Started!
echo ============================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173 (usually)
echo.
echo Check the opened terminal windows for logs.
echo Press any key to exit this window...
pause > nul
