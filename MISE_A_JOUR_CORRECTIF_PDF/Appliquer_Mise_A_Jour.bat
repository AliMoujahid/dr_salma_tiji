@echo off
chcp 65001 >nul
title Mise à Jour Cabinet Dr. Salma Tijini (Carnet Financier, Facturation & PDF)
cls
echo ==============================================================================
echo       MISE À JOUR AUTOMATIQUE - CABINET DENTAIRE DR. SALMA TIJINI
echo   - Carnet Financier du Patient (Diftar : Soins, Règlements & Solde Global)
echo   - Facturation Propre & Sélective (Sans colonnes Reste par article)
echo   - Aperçu & Téléchargement Sécurisé des PDF et Radios
echo ==============================================================================
echo.

set "TARGET_DIR=C:\Cabinet_Dr_Salma_Tijini_Release\app"

if not exist "%TARGET_DIR%" (
    echo [ERREUR] Le dossier "%TARGET_DIR%" est introuvable sur ce PC !
    echo Veuillez vérifier que l'application est bien installée dans C:\Cabinet_Dr_Salma_Tijini_Release
    echo.
    pause
    exit /b 1
)

echo [1/3] Arrêt temporaire du service de l'application...
call pm2.cmd stop 0 >nul 2>&1
call pm2.cmd stop cabinet-dr-salma-tijini >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Copie des fichiers corrigés vers l'application...
xcopy /E /Y /I "%~dp0files\*" "%TARGET_DIR%\" >nul
if errorlevel 1 (
    echo [ERREUR] Impossible de copier certains fichiers. Exécutez ce script en tant qu'administrateur !
    pause
    exit /b 1
)

echo [3/3] Redémarrage du serveur Cabinet Dentaire...
call pm2.cmd restart 0 >nul 2>&1
if errorlevel 1 (
    call pm2.cmd restart cabinet-dr-salma-tijini >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo.
echo ==============================================================================
echo   ✅ MISE À JOUR APPLIQUÉE AVEC SUCCÈS !
echo.
echo   - L'aperçu des fichiers PDF (comme ccc.pdf) s'affiche maintenant directement.
echo   - Le bouton "Télécharger" télécharge le fichier réel instantanément.
echo   - Le bouton "Ouvrir" permet d'ouvrir le document en plein écran.
echo ==============================================================================
echo.
echo Vous pouvez maintenant actualiser votre navigateur (Ctrl + F5) sur :
echo http://localhost:5000
echo.
pause
