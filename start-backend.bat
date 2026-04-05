@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo   Backend Launcher
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not available in PATH.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [ERROR] .env file not found in project root.
  echo Copy .env.example to .env and configure Supabase first.
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

echo [INFO] Starting backend server on port 3001...
echo [INFO] API URL   : http://localhost:3001/api
echo [INFO] Health URL: http://localhost:3001/api/health
echo [INFO] Provider  : Supabase
echo [INFO] First admin: cd backend ^&^& npm.cmd run seed:admin
echo.

pushd backend
call npm.cmd start
popd

pause
