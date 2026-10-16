@echo off
title NETTOYAGE ET REMISE A ZERO BASE DE DONNEES - DR. SALMA TIJINI
color 0C
cd /d "%~dp0"
cls

echo ==============================================================================
echo    ATTENTION : REMISE A ZERO TOTALE DE LA BASE DE DONNEES CLINIQUE
echo ==============================================================================
echo.
echo Ce script va supprimer TOUTES les donnees de test du cabinet :
echo   [X] Tous les Patients de test
echo   [X] Tous les Carnets, Soins et Odontogrammes 3D
echo   [X] Toutes les Factures et Devis
echo   [X] Tous les Reglements et Acomptes
echo   [X] Tous les Rendez-vous
echo   [X] Tous les Fichiers / Radios patients
echo.
echo Ce qui sera CONSERVE et REINITIALISE proprement :
echo   [OK] Administrateur unique : admin / Moujahid@97
echo   [OK] Catalogue complet des 20 actes dentaires (Extraction, Soins, etc.)
echo   [OK] Coordonnees officielles du Cabinet Dr. Salma Tijini (Skhirat)
echo ==============================================================================
echo.

set /p CONFIRM="Tapez OUI pour confirmer la remise a zero de la base : "
if /i "%CONFIRM%" neq "OUI" (
    echo.
    echo [ANNULE] Operation annulee. Aucune donnee n'a ete modifiee.
    echo.
    pause
    exit /b 0
)

echo.
echo Execution de la remise a zero en cours...
echo.

if exist "scripts\vider_base_donnees.js" (
    node "scripts\vider_base_donnees.js" --yes
) else if exist "app\scripts\vider_base_donnees.js" (
    node "app\scripts\vider_base_donnees.js" --yes
) else if exist "%~dp0scripts\vider_base_donnees.js" (
    node "%~dp0scripts\vider_base_donnees.js" --yes
) else (
    echo [ERREUR] Le script scripts\vider_base_donnees.js est introuvable.
)

echo.
pause
