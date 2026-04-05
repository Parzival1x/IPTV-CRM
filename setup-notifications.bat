@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo   Notification Setup Wizard
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not available in PATH.
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

pushd backend
call npm.cmd run notifications:setup
set EXIT_CODE=%ERRORLEVEL%
popd

echo.
if "%EXIT_CODE%"=="0" (
  echo [OK] Notification setup finished.
  echo Restart the backend before testing sends.
) else (
  echo [ERROR] Notification setup did not complete successfully.
)

pause
