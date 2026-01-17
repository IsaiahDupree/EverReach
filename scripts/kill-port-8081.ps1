# Kill any process using port 8081
Write-Host "Checking for processes on port 8081..."
$connections = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $pids) {
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Killing process $processId ($($proc.ProcessName)) on port 8081"
            Stop-Process -Id $processId -Force
        }
    }
    Write-Host "Port 8081 cleared."
} else {
    Write-Host "No process found on port 8081."
}
