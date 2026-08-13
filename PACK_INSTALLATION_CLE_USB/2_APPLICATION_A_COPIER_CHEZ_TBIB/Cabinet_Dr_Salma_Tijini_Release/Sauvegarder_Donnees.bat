@echo off
title Sauvegarde des Donnees du Cabinet
color 0E
chcp 65001 >nul
cls

echo =======================================================================
echo       SAUVEGARDE AUTOMATIQUE DES DOSSIERS ET RADIOS DU CABINET
echo =======================================================================
echo.

set TIMESTAMP=%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%h%TIME:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DEST=%~dp0Sauvegardes_Cabinet\Sauvegarde_%TIMESTAMP%

echo Destination : %BACKUP_DEST%
mkdir "%BACKUP_DEST%" 2>nul

echo.
echo [1/2] Copie des radios, photos et documents patients...
xcopy "%~dp0app\uploads" "%BACKUP_DEST%\uploads" /E /I /H /Y /Q >nul

echo [2/2] Copie des fichiers de configuration...
copy "%~dp0license.key" "%BACKUP_DEST%\" >nul 2>nul

echo.
echo =======================================================================
echo   ✅ SAUVEGARDE TERMINEE AVEC SUCCES DANS :
echo   %BACKUP_DEST%
echo =======================================================================
echo.
pause
