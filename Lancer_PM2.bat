@echo off
title Cabinet Dr. Salma Tijini - Lancement PM2
color 0B
cls

echo =======================================================================
echo    LANCEMENT EN ARRIERE-PLAN DU CABINET VIA PM2 (MODE SILENCIEUX)
echo =======================================================================
echo.

echo [1/2] Demarrage du serveur Node.js avec PM2...
call npm run pm2:start

echo.
echo [2/2] Ouverture de l'application dans votre navigateur...
timeout /t 2 >nul
start http://localhost:5000

echo.
echo =======================================================================
echo   [OK] L'APPLICATION TOURNE EN ARRIERE-PLAN SANS FENETRE CONSOLE !
echo =======================================================================
echo.
timeout /t 3 >nul
exit
