@echo off
echo Starting Admin Dashboard with MongoDB Atlas...
echo.
echo 🚀 Starting Backend Server...
cd backend
start "Backend Server" npm start
timeout /t 3 /nobreak > nul
cd ..
echo.
echo 🎯 Starting Frontend...
start "Frontend" npm run dev
echo.
echo ✅ Both servers are starting...
echo.
echo 📱 Frontend will be available at: http://localhost:5175/
echo 🔧 Backend API at: http://localhost:3001/
echo.
echo 🔑 Login with: admin@admin.com / admin (development mode)
echo 🔑 Or start the backend server for full functionality
echo.
pause
