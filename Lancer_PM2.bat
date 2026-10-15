@echo off
title Lancer PM2 - Cabinet Dr. Salma Tijini
color 0B
cls

echo =======================================================================
echo    LANCEMENT DU CABINET VIA PM2 (PROCESSUS ARRIERE-PLAN INVISIBLE)
echo =======================================================================
echo.

call npm run pm2:start

echo.
echo [OK] Le serveur en arriere-plan a ete lance avec succes.
echo.
timeout /t 2 >nul
start http://localhost:5000
exit
