@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo   Admin Dashboard Launcher
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not available in PATH.
  echo Install Node.js from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [ERROR] .env file not found.
  echo Copy .env.example to .env and fill in the Supabase values first.
  pause
  exit /b 1
)

findstr /R /C:"^SUPABASE_SERVICE_ROLE_KEY=" ".env" >nul
if errorlevel 1 (
  echo [ERROR] SUPABASE_SERVICE_ROLE_KEY is missing from .env.
  pause
  exit /b 1
)

findstr /R /C:"^VITE_SUPABASE_URL=" ".env" >nul
if errorlevel 1 (
  echo [ERROR] VITE_SUPABASE_URL is missing from .env.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Installing frontend dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERROR] Frontend dependency installation failed.
    pause
    exit /b 1
  )
)

if not exist "backend\node_modules" (
  echo [INFO] Installing backend dependencies...
  pushd backend
  call npm.cmd install
  if errorlevel 1 (
    popd
    echo [ERROR] Backend dependency installation failed.
    pause
    exit /b 1
  )
  popd
)

echo [INFO] Starting backend in a new window...
start "Admin Dashboard Backend" cmd /k "cd /d \"%~dp0backend\" && npm.cmd start"

timeout /t 3 /nobreak >nul

echo [INFO] Starting frontend in a new window...
start "Admin Dashboard Frontend" cmd /k "cd /d \"%~dp0\" && npm.cmd run dev"

echo.
echo [OK] Launch commands sent.
echo.
echo Frontend: http://localhost:5173/
echo Backend : http://localhost:3001/api
echo Health  : http://localhost:3001/api/health
echo.
echo If no admin exists yet, run:
echo   cd backend ^&^& npm.cmd run seed:admin
echo.
echo Data provider: Supabase
echo.
pause
