# PowerShell script to close all active ports for Admin Dashboard
Write-Host "🔧 Closing all active ports for Admin Dashboard..." -ForegroundColor Cyan
Write-Host ""

# Function to kill processes on a specific port
function Stop-ProcessOnPort {
    param([int]$Port)
    
    Write-Host "🔍 Checking port $Port..." -ForegroundColor Yellow
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        
        if ($processes) {
            foreach ($pid in $processes) {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  ⚡ Killing process: $($process.Name) (PID: $pid)" -ForegroundColor Red
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Host "  ✅ Successfully killed process $pid" -ForegroundColor Green
                    }
                }
                catch {
                    Write-Host "  ⚠️ Could not kill process $pid" -ForegroundColor Orange
                }
            }
        }
        else {
            Write-Host "  ✅ No processes found on port $Port" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  ✅ Port $Port is not in use" -ForegroundColor Green
    }
}

# Common development ports
$ports = @(3000, 3001, 5173, 5174, 5175, 8080, 8000, 4200)

foreach ($port in $ports) {
    Stop-ProcessOnPort -Port $port
}

Write-Host ""
Write-Host "🔄 Stopping Node.js processes..." -ForegroundColor Yellow
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ Node.js processes stopped" -ForegroundColor Green
}
catch {
    Write-Host "✅ No Node.js processes to stop" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔄 Stopping npm processes..." -ForegroundColor Yellow
try {
    Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ npm processes stopped" -ForegroundColor Green
}
catch {
    Write-Host "✅ No npm processes to stop" -ForegroundColor Green
}

Write-Host ""
Write-Host "🏁 Port cleanup completed!" -ForegroundColor Green
Write-Host ""

# Show current port status
Write-Host "📊 Current port status for development ports:" -ForegroundColor Cyan
foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            Write-Host "  Port $port`: ACTIVE" -ForegroundColor Red
        }
        else {
            Write-Host "  Port $port`: FREE" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  Port $port`: FREE" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
