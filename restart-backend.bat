@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo   Backend Restart Helper
echo ==========================================
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
  echo Stopping process on port 3001: %%a
  taskkill /PID %%a /F >nul 2>&1
)

echo.
echo Starting backend in development mode...
start "Admin Dashboard Backend (Dev)" cmd /k "cd /d \"%~dp0backend\" && npm.cmd run dev"

echo.
echo Backend restart command sent.
echo API: http://localhost:3001/api
echo Health: http://localhost:3001/api/health
echo.
pause
