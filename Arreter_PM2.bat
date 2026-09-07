@echo off
title Arreter PM2 - Cabinet Dr. Salma Tijini
color 0C
cls

echo =======================================================================
echo     ARRET DU SERVEUR PM2 - CABINET DENTAIRE DR. SALMA TIJINI
echo =======================================================================
echo.

call npm run pm2:stop

echo.
echo [OK] Le serveur en arriere-plan a ete arrete proprement.
echo.
timeout /t 2 >nul
exit
