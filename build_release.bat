@echo off
title Packaging Release - Cabinet Dr. Salma Tijini
cls
echo ================================================================
echo    CREATION DU DOSSIER D'INSTALLATION ET PACKAGING RELEASE
echo ================================================================
node "%~dp0scripts\package_release.js"
pause
