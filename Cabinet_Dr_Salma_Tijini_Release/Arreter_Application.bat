@echo off
title Arreter l'Application Cabinet Dr. Salma Tijini
color 0C
chcp 65001 >nul
cls

echo =======================================================================
echo       ARRET DU SERVEUR DU CABINET DENTAIRE DR. SALMA TIJINI
echo =======================================================================
echo.
echo Recherche et fermeture du processus sur le port 5000...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>nul
)

echo.
echo [OK] Le serveur du cabinet a ete arrete proprement.
echo.
timeout /t 2 >nul
exit
