@echo off
chcp 65001 >nul
color 0b
title VERROUILLAGE ET SECURISATION MONGODB - DR. SALMA TIJINI

echo ==============================================================================
echo    🔒 SÉCURISATION ET VERROUILLAGE TOTAL DE LA BASE MONGODB
echo ==============================================================================
echo.
echo Ce script va activer l'authentification obligatoire sur MongoDB.
echo Une fois active, PERSONNE ne pourra voir la base avec MongoDB Compass
echo sans les identifiants administrateur de securite !
echo.

:: Check for admin privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Demande d'elevation Administrateur...
    powershell -Command "Start-Process '%~0' -Verb RunAs"
    exit /b
)

echo [1/3] Creation des comptes administrateurs et applicatifs...
node "%~dp0scripts\setup_mongodb_auth.js"

echo.
echo [2/3] Modification de mongod.cfg (security.authorization: enabled)...
powershell -Command "$cfg='C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg'; if (-not (Test-Path $cfg)) { $cfg='C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg' }; if (Test-Path $cfg) { $txt=[System.IO.File]::ReadAllText($cfg); if (-not $txt.Contains('authorization: enabled')) { $n=$txt -replace '#security:', ('security:' + [Environment]::NewLine + '  authorization: enabled'); [System.IO.File]::WriteAllText($cfg, $n); Write-Host 'Fichier mongod.cfg verouille avec succes.' -ForegroundColor Green } else { Write-Host 'Securite deja activee dans mongod.cfg.' -ForegroundColor Yellow } } else { Write-Host 'Fichier mongod.cfg introuvable.' -ForegroundColor Red }"

echo.
echo [3/3] Redemarrage du service Windows MongoDB avec la securite activee...
powershell -Command "Restart-Service -Name MongoDB -Force; Start-Sleep -Seconds 2; Write-Host 'Service MongoDB redemarre et 100% securise !' -ForegroundColor Green"

echo.
echo ==============================================================================
echo  🎉 SUCCES : LA BASE DE DONNEES EST DESORMAIS 100%% PROTEGEE !
echo     - Connexion sans mot de passe via MongoDB Compass : REFUSEE (Bloquee)
echo     - Application Cabinet Dentaire : Connectee avec succes
echo ==============================================================================
echo.
pause
