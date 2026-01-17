# Local Development Commands - Quick Reference

Quick access commands for starting/stopping local dev servers with automatic port management.

---

## 🚀 Start Services

### Start Backend (Port 3002)
```powershell
# Kill any process on port 3002 and start backend
$port = 3002
Get-Process -Id (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
cd "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\backend-vercel"
npm run dev
```

### Start Dashboard (Port 3003)
```powershell
# Kill any process on port 3003, remove lock, and start dashboard
$port = 3003
Get-Process -Id (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\.next\dev\lock" -ErrorAction SilentlyContinue
cd "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app"
$env:PORT=$port; npm run dev
```

### Start Both (Separate Terminals)
Run these in **two separate PowerShell windows**:

**Terminal 1 - Backend:**
```powershell
$port = 3002; Get-Process -Id (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force; cd "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\backend-vercel"; npm run dev
```

**Terminal 2 - Dashboard:**
```powershell
$port = 3003; Get-Process -Id (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force; Remove-Item "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\.next\dev\lock" -ErrorAction SilentlyContinue; cd "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app"; $env:PORT=3003; npm run dev
```

---

## 🛑 Stop Services

### Stop Backend (Port 3002)
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Stop Dashboard (Port 3003)
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3003 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\.next\dev\lock" -ErrorAction SilentlyContinue
```

### Stop All Node Processes (Nuclear Option)
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\.next\dev\lock" -ErrorAction SilentlyContinue
```

---

## 🔍 Check Status

### Check What's Running on Ports
```powershell
# Check backend port (3002)
Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue | Select-Object LocalPort, State, OwningProcess

# Check dashboard port (3003)
Get-NetTCPConnection -LocalPort 3003 -ErrorAction SilentlyContinue | Select-Object LocalPort, State, OwningProcess

# Check common dev ports
3000..3010 | ForEach-Object {
    $conn = Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue
    if ($conn) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        [PSCustomObject]@{
            Port = $_
            State = $conn.State
            Process = $proc.ProcessName
            PID = $conn.OwningProcess
        }
    }
}
```

### List All Node Processes
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime, @{Name="Port";Expression={
    (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | Where-Object {$_.LocalPort -ge 3000 -and $_.LocalPort -le 3010}).LocalPort
}} | Format-Table -AutoSize
```

---

## 🧹 Clean Up

### Remove Next.js Cache & Lock Files
```powershell
# Backend
Remove-Item "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\backend-vercel\.next" -Recurse -Force -ErrorAction SilentlyContinue

# Dashboard
Remove-Item "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\.next" -Recurse -Force -ErrorAction SilentlyContinue
```

### Full Clean Restart
```powershell
# Stop all
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Clean cache
Remove-Item "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\backend-vercel\.next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\.next" -Recurse -Force -ErrorAction SilentlyContinue

# Reinstall dependencies (if needed)
cd "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\backend-vercel"
npm install

cd "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app"
npm install
```

---

## 🌐 Access URLs

Once running, access your services at:

- **Backend API**: http://localhost:3002
- **Dashboard**: http://localhost:3003
- **Dashboard - Overview**: http://localhost:3003/dashboard/overview
- **Dashboard - Revenue**: http://localhost:3003/dashboard/revenue
- **Dashboard - Health**: http://localhost:3003/dashboard/health

---

## 📦 Port Assignments

| Service | Port | Why |
|---------|------|-----|
| Backend | 3002 | Avoids default 3000/3001, stable for API |
| Dashboard | 3003 | Unique, no conflicts with backend |

---

## 🐛 Troubleshooting

### "Port already in use"
```powershell
# Find what's using the port
Get-Process -Id (Get-NetTCPConnection -LocalPort 3002).OwningProcess

# Kill it
Get-Process -Id (Get-NetTCPConnection -LocalPort 3002).OwningProcess | Stop-Process -Force
```

### "Unable to acquire lock"
```powershell
# Remove the lock file
Remove-Item "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\.next\dev\lock" -Force
```

### "EADDRINUSE: address already in use"
This means another process is holding the port. Run the stop command for that port first.

### Stale Node Processes
```powershell
# List all node processes with their command lines
Get-WmiObject Win32_Process -Filter "name = 'node.exe'" | Select-Object ProcessId, CommandLine | Format-List

# Kill specific one by PID
Stop-Process -Id <PID> -Force
```

---

## 💡 Pro Tips

1. **Always use separate terminals** for backend and dashboard
2. **Check ports before starting** to avoid conflicts
3. **Remove lock files** if you get "unable to acquire lock" errors
4. **Use the nuclear option** (Stop All Node) if you're unsure what's running
5. **Bookmark this file** for quick access during development

---

## 🔧 Optional: Create PowerShell Aliases

Add to your PowerShell profile (`$PROFILE`):

```powershell
# EverReach Dev Commands
function Start-Backend {
    $port = 3002
    Get-Process -Id (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
    Set-Location "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\backend-vercel"
    npm run dev
}

function Start-Dashboard {
    $port = 3003
    Get-Process -Id (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
    Remove-Item "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\.next\dev\lock" -ErrorAction SilentlyContinue
    Set-Location "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app"
    $env:PORT = $port
    npm run dev
}

function Stop-DevServers {
    Get-Process -Id (Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Id (Get-NetTCPConnection -LocalPort 3003 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
    Remove-Item "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\.next\dev\lock" -ErrorAction SilentlyContinue
    Write-Host "✓ All dev servers stopped" -ForegroundColor Green
}

# Aliases
Set-Alias backend Start-Backend
Set-Alias dashboard Start-Dashboard
Set-Alias stopdev Stop-DevServers
```

Then just run:
```powershell
backend      # Start backend
dashboard    # Start dashboard
stopdev      # Stop all dev servers
```

---

**Last Updated:** 2025-01-06  
**Ports:** Backend=3002, Dashboard=3003
