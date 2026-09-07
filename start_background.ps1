$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Verifier si l'application tourne deja sur le port 5000
$portListening = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue

if ($portListening) {
    Write-Host "[OK] L'application tourne deja sur le port 5000." -ForegroundColor Green
    Start-Process "http://localhost:5000"
    exit 0
}

# 2. Reperer le dossier de travail (Release ou backend)
$WorkDir = ""
$TargetScript = ""

if (Test-Path "$ScriptDir\app\server.js") {
    $WorkDir = "$ScriptDir\app"
    $TargetScript = "server.js"
} elseif (Test-Path "$ScriptDir\backend\dist\server.js") {
    $WorkDir = "$ScriptDir\backend"
    $TargetScript = "dist/server.js"
} else {
    $WorkDir = "$ScriptDir\backend"
    $TargetScript = "src/server.ts"
}

Write-Host "Demarrage du serveur en arriere-plan..." -ForegroundColor Cyan

# 3. Lancer le processus Node.js en mode 100% invisible
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "node.exe"
$psi.Arguments = $TargetScript
$psi.WorkingDirectory = $WorkDir
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$psi.CreateNoWindow = $true
$psi.UseShellExecute = $true

[System.Diagnostics.Process]::Start($psi) | Out-Null

Write-Host "Attente de l'initialisation du serveur..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 4. Ouvrir l'application dans le navigateur
Start-Process "http://localhost:5000"
Write-Host "[OK] Application prete et ouverte dans le navigateur !" -ForegroundColor Green
