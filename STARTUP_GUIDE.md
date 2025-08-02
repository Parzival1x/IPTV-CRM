# Quick Start Guide - Admin Dashboard

## 🚀 Starting the Application

### Option 1: Use the Start Script (Recommended)
```bash
# Double-click start.bat or run:
./start.bat
```

### Option 2: Manual Start
```bash
# Terminal 1: Start Backend
cd backend
npm start

# Terminal 2: Start Frontend
cd ..
npm run dev
```

## 🔑 Login Credentials

### Development Mode (No Backend)
- **Email**: `admin@admin.com`
- **Password**: `admin`

### Full Backend Mode
- First run the seed command to create admin user
- Check the backend logs for generated credentials

## 🔧 Troubleshooting

### "Failed to fetch - login" Error
1. **Check if backend is running**:
   ```bash
   cd backend
   npm start
   ```

2. **Verify backend is accessible**:
   - Open browser to `http://localhost:3001`
   - Should see a response (even if error)

3. **Check MongoDB connection**:
   - Ensure `.env` file has correct `MONGODB_URI`
   - Check MongoDB Atlas connection

4. **Use development mode**:
   - Use `admin@admin.com` / `admin` credentials
   - This bypasses backend authentication

### Port Management

#### Close All Active Ports
```bash
# Option 1: Run batch script
./close-ports.bat

# Option 2: Run PowerShell script
./close-ports.ps1
```

#### Manual Port Cleanup
```bash
# Check what's running on ports
netstat -ano | findstr ":3001\|:5173"

# Kill specific process by PID
taskkill /PID <process_id> /F

# Kill all Node.js processes
taskkill /IM node.exe /F
```

### Common Issues
- **Port 3001 already in use**: Run `close-ports.bat` first
- **Port 5173 already in use**: Kill existing Vite processes
- **MongoDB connection failed**: Check `.env` file
- **CORS errors**: Backend should allow `localhost:5173`

## 📁 Project Structure
```
/
├── backend/          # Node.js API server
├── src/             # React frontend
├── start.bat        # Quick start script
└── .env            # Environment variables
```

## 🆘 Need Help?
1. Check console errors in browser (F12)
2. Check backend logs in terminal
3. Use development mode credentials if backend is down
