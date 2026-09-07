# ==============================================================================
# 🔒 SCRIPT DE VERROUILLAGE ET SÉCURISATION MONGODB (DR. SALMA TIJINI)
# ==============================================================================

Write-Host "================================================================"
Write-Host " 🔒 ACTIVATION DU VERROUILLAGE DE SÉCURITÉ MONGODB"
Write-Host "================================================================"

$cfgPath = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg"

if (-not (Test-Path $cfgPath)) {
    $service = Get-WmiObject win32_service | Where-Object { $_.Name -eq 'MongoDB' }
    if ($service) {
        $rawPath = $service.PathName
        if ($rawPath -match '--config\s+"([^"]+)"') {
            $cfgPath = $Matches[1]
        }
    }
}

if (-not (Test-Path $cfgPath)) {
    Write-Host "Fichier mongod.cfg introuvable."
    exit 1
}

Write-Host "Fichier config: $cfgPath"

$content = [System.IO.File]::ReadAllText($cfgPath)

if ($content.Contains("authorization: enabled")) {
    Write-Host "Security authorization deja activee."
} else {
    Write-Host "Activation de authorization: enabled..."
    if ($content.Contains("#security:")) {
        $newContent = $content.Replace("#security:", "security:`r`n  authorization: enabled")
    } else {
        $newContent = $content + "`r`n`r`nsecurity:`r`n  authorization: enabled`r`n"
    }
    [System.IO.File]::WriteAllText($cfgPath, $newContent)
    Write-Host "mongod.cfg mis a jour."
}

Write-Host "Redemarrage du service MongoDB..."
Restart-Service -Name MongoDB -Force
Start-Sleep -Seconds 3

$svc = Get-Service -Name MongoDB
Write-Host "Statut du service MongoDB: $($svc.Status)"
Write-Host "Base de donnees securisee avec succes!"
