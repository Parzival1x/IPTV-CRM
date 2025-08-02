@echo off
echo Closing all active ports for Admin Dashboard...
echo.

echo 🔍 Checking for active processes on common ports...
echo.

REM Check and kill processes on port 3000 (alternative frontend)
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Found process on port 3000: %%a
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 echo ✅ Killed process %%a on port 3000
)

REM Check and kill processes on port 3001 (backend)
echo Checking port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Found process on port 3001: %%a
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 echo ✅ Killed process %%a on port 3001
)

REM Check and kill processes on port 5173 (Vite default)
echo Checking port 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo Found process on port 5173: %%a
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 echo ✅ Killed process %%a on port 5173
)

REM Check and kill processes on port 5174 (Vite alternative)
echo Checking port 5174...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174') do (
    echo Found process on port 5174: %%a
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 echo ✅ Killed process %%a on port 5174
)

REM Check and kill processes on port 5175 (Vite alternative)
echo Checking port 5175...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5175') do (
    echo Found process on port 5175: %%a
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 echo ✅ Killed process %%a on port 5175
)

REM Kill any Node.js processes
echo.
echo 🔄 Stopping Node.js processes...
taskkill /IM node.exe /F >nul 2>&1
if not errorlevel 1 echo ✅ Stopped Node.js processes

REM Kill any npm processes
echo 🔄 Stopping npm processes...
taskkill /IM npm.cmd /F >nul 2>&1
if not errorlevel 1 echo ✅ Stopped npm processes

echo.
echo 🏁 Port cleanup completed!
echo.
echo 📊 Current port status:
netstat -ano | findstr ":300[0-1]\|:517[3-5]"
if errorlevel 1 echo ✅ No processes found on common development ports

echo.
pause
