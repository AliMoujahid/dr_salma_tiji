@echo off
title Cabinet Dentaire Dr. Salma Tijini - Demarrage
color 0B
chcp 65001 >nul
cls

echo =======================================================================
echo           CABINET DENTAIRE DR. SALMA TIJINI - SYSTEME CLINIQUE
echo =======================================================================
echo.

:: 1. Verifier si Node.js est installe
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe sur cet ordinateur.
    echo Veuillez installer Node.js depuis https://nodejs.org/ (Version LTS).
    pause
    exit /b 1
)

:: 2. Verifier si le serveur MongoDB tourne
echo [1/3] Verification du service de base de donnees (MongoDB)...
sc query MongoDB | find "RUNNING" >nul 2>nul
if %errorlevel% neq 0 (
    net start MongoDB >nul 2>nul
    if %errorlevel% neq 0 (
        echo [INFO] Demarrage manuel de MongoDB ou MongoDB tourne deja en processus local.
    ) else (
        echo [OK] Service MongoDB demarre.
    )
) else (
    echo [OK] Base de donnees connectee.
)

:: 3. Verifier si l'application tourne deja sur le port 5000
netstat -ano | findstr :5000 | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo.
    echo [OK] L'application est deja en cours d'execution !
    echo [2/3] Ouverture automatique de votre navigateur...
    timeout /t 1 >nul
    start http://localhost:5000
    exit /b 0
)

:: 4. Lancer le serveur en arriere-plan
echo.
echo [2/3] Lancement du serveur du Cabinet...
cd /d "%~dp0app"
start "Serveur Cabinet Dr Salma Tijini" /min node server.js

:: 5. Attendre l'initialisation et ouvrir le navigateur
echo [3/3] Chargement de l'interface clinique...
timeout /t 3 >nul

echo.
echo =======================================================================
echo       APPLICATION PRETE ! OUVERTURE DU NAVIGATEUR EN COURS...
echo       Adresse locale : http://localhost:5000
echo =======================================================================
start http://localhost:5000

:: Fermer la fenetre noire apres 2 secondes
timeout /t 2 >nul
exit
