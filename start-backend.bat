@echo off
echo 🚀 Starting Backend Server for Admin Dashboard...
echo.

echo 🔍 Checking if Node.js is installed...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js is installed

cd backend

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing backend dependencies...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
    echo.
)

REM Check if .env exists
if not exist "../.env" (
    echo ⚠️  Warning: .env file not found in parent directory
    echo Please ensure MongoDB connection string is configured
    echo Copy .env.example to .env and update with your MongoDB credentials
    echo.
)

echo 🔧 Starting backend server on port 3001...
echo.
echo ✅ Backend will be available at: http://localhost:3001/
echo 🔑 Once running, you can use real authentication
echo.

npm start

pause
