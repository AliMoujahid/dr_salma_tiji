@echo off
title Cabinet Dr. Salma Tijini - Lancement PM2
color 0B
cls

echo =======================================================================
echo    LANCEMENT EN ARRIERE-PLAN DU CABINET VIA PM2 (MODE SILENCIEUX)
echo =======================================================================
echo.

echo [1/3] Verification et demarrage de la base de donnees MongoDB...
sc config MongoDB start= auto >nul 2>nul
net start MongoDB >nul 2>nul

echo [2/3] Demarrage du serveur Node.js avec PM2...
call npm run pm2:start
call npx pm2 save >nul 2>nul

echo.
echo [3/3] Ouverture de l'application dans votre navigateur...
timeout /t 3 >nul
start http://localhost:5000

echo.
echo =======================================================================
echo   [OK] L'APPLICATION TOURNE EN ARRIERE-PLAN SANS FENETRE CONSOLE !
echo =======================================================================
echo.
timeout /t 2 >nul
exit
