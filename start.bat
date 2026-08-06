@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

set "BACKEND_URL=http://localhost:3001"
set "FRONTEND_URL=http://localhost:5173"
set "HEALTH_FILE=%TEMP%\streamops-health.json"
rem How long to wait for each service, in seconds, before giving up.
set "BACKEND_TIMEOUT=60"
set "FRONTEND_TIMEOUT=60"

echo ==========================================
echo   StreamOps IPTV CRM Launcher
echo ==========================================
echo.

rem ---------------------------------------------------------------------------
rem Prerequisites
rem ---------------------------------------------------------------------------

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not available in PATH.
  echo         Install it from https://nodejs.org/ and try again.
  goto :fail
)

rem curl ships with Windows 10 1803 and later. Without it the launcher cannot
rem tell when the services are actually up, so it falls back to a fixed wait.
set "HAVE_CURL=1"
where curl >nul 2>nul
if errorlevel 1 set "HAVE_CURL=0"

if not exist ".env" (
  echo [ERROR] .env file not found.
  echo         Copy .env.example to .env and fill in the Supabase values first:
  echo             Copy-Item .env.example .env
  goto :fail
)

findstr /R /C:"^SUPABASE_SERVICE_ROLE_KEY=." ".env" >nul
if errorlevel 1 (
  echo [ERROR] SUPABASE_SERVICE_ROLE_KEY is missing or empty in .env.
  goto :fail
)

findstr /R /C:"^SUPABASE_URL=." ".env" >nul
if not errorlevel 1 goto :url_ok
findstr /R /C:"^VITE_SUPABASE_URL=." ".env" >nul
if not errorlevel 1 goto :url_ok
echo [ERROR] Neither SUPABASE_URL nor VITE_SUPABASE_URL is set in .env.
goto :fail
:url_ok

findstr /R /C:"^JWT_SECRET=." ".env" >nul
if errorlevel 1 (
  echo [WARN]  JWT_SECRET is not set. Development will fall back to a shared
  echo         placeholder; production refuses to start without a real one.
  echo.
)

rem ---------------------------------------------------------------------------
rem Dependencies
rem ---------------------------------------------------------------------------

if not exist "node_modules" (
  echo [INFO] Installing frontend dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERROR] Frontend dependency installation failed.
    goto :fail
  )
)

if not exist "backend\node_modules" (
  echo [INFO] Installing backend dependencies...
  pushd backend
  call npm.cmd install
  if errorlevel 1 (
    popd
    echo [ERROR] Backend dependency installation failed.
    goto :fail
  )
  popd
)

rem ---------------------------------------------------------------------------
rem Free the ports
rem ---------------------------------------------------------------------------
rem A backend left running from a previous session holds 3001, and the new one
rem exits with EADDRINUSE in a window that closes before it can be read.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":3001 .*LISTENING"') do (
  echo [INFO] Stopping a process already listening on port 3001 ^(PID %%a^)...
  taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do (
  echo [INFO] Stopping a process already listening on port 5173 ^(PID %%a^)...
  taskkill /PID %%a /F >nul 2>&1
)

rem ---------------------------------------------------------------------------
rem Backend
rem ---------------------------------------------------------------------------

echo [INFO] Starting the backend API...
start "StreamOps Backend" cmd /k "cd /d "%~dp0backend" && npm.cmd run dev"

if "%HAVE_CURL%"=="0" (
  echo [WARN]  curl was not found, so readiness cannot be checked.
  echo         Waiting 15 seconds instead.
  timeout /t 15 /nobreak >nul
  goto :start_frontend
)

echo [INFO] Waiting for the API to become healthy...
set /a "waited=0"

:wait_backend
curl -s -m 3 "%BACKEND_URL%/api/health" > "%HEALTH_FILE%" 2>nul

findstr /C:"\"status\":\"OK\"" "%HEALTH_FILE%" >nul 2>nul
if not errorlevel 1 goto :backend_ready

rem The API is up and reached the database, but backend/supabase/install.sql
rem has not been run. Payments will fail, so say so plainly rather than opening
rem a browser onto a broken app.
findstr /C:"outdated" "%HEALTH_FILE%" >nul 2>nul
if not errorlevel 1 goto :schema_outdated

set /a "waited+=2"
if !waited! geq %BACKEND_TIMEOUT% goto :backend_timeout
timeout /t 2 /nobreak >nul
goto :wait_backend

:backend_ready
echo [OK]   API is healthy and the database schema is current.
goto :start_frontend

:schema_outdated
echo.
echo ==========================================
echo   [ERROR] Database schema is out of date
echo ==========================================
echo.
echo The API is running and can reach Supabase, but the schema has not been
echo applied. Recording a payment will fail until it is.
echo.
echo Open the Supabase SQL Editor and run this one file:
echo.
echo       backend\supabase\install.sql
echo.
echo It is safe to run more than once.
echo.
echo The backend window is still open. Run install.sql, then start this
echo launcher again.
echo.
goto :fail

:backend_timeout
echo.
echo [ERROR] The API did not become healthy within %BACKEND_TIMEOUT% seconds.
echo         Check the "StreamOps Backend" window for the reason. The usual
echo         causes are bad Supabase credentials or an unreachable DATABASE_URL.
echo.
if exist "%HEALTH_FILE%" (
  echo Last response from %BACKEND_URL%/api/health:
  type "%HEALTH_FILE%"
  echo.
)
goto :fail

rem ---------------------------------------------------------------------------
rem Frontend
rem ---------------------------------------------------------------------------

:start_frontend
echo [INFO] Starting the frontend dev server...
start "StreamOps Frontend" cmd /k "cd /d "%~dp0" && npm.cmd run dev"

if "%HAVE_CURL%"=="0" (
  timeout /t 8 /nobreak >nul
  goto :open_browser
)

echo [INFO] Waiting for Vite to start serving...
set /a "waited=0"

:wait_frontend
curl -s -m 3 -o nul "%FRONTEND_URL%" 2>nul
if not errorlevel 1 goto :frontend_ready

set /a "waited+=2"
if !waited! geq %FRONTEND_TIMEOUT% goto :frontend_timeout
timeout /t 2 /nobreak >nul
goto :wait_frontend

:frontend_ready
echo [OK]   Frontend is serving.
goto :open_browser

:frontend_timeout
echo [WARN]  Vite did not respond on port 5173 within %FRONTEND_TIMEOUT% seconds.
echo         If it picked a different port, check the "StreamOps Frontend"
echo         window and open the URL it printed.
goto :done

rem ---------------------------------------------------------------------------
rem Browser
rem ---------------------------------------------------------------------------

:open_browser
echo [INFO] Opening %FRONTEND_URL% ...
start "" "%FRONTEND_URL%"

:done
echo.
echo ==========================================
echo   Running
echo ==========================================
echo.
echo   Frontend      %FRONTEND_URL%/
echo   Admin sign-in %FRONTEND_URL%/signin
echo   Portal        %FRONTEND_URL%/portal/signin
echo   API           %BACKEND_URL%/api
echo   Health        %BACKEND_URL%/api/health
echo.
echo No admin yet?      cd backend ^&^& npm.cmd run seed:admin
echo Want demo data?    cd backend ^&^& npm.cmd run seed:demo-customers
echo.
echo Closing this window leaves both services running. Close the two
echo "StreamOps" windows to stop them.
echo.
if exist "%HEALTH_FILE%" del "%HEALTH_FILE%" >nul 2>&1
pause
exit /b 0

:fail
echo.
if exist "%HEALTH_FILE%" del "%HEALTH_FILE%" >nul 2>&1
pause
exit /b 1
