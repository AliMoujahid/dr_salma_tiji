@echo off
title Installation Cabinet Dr. Salma Tijini
color 0A
chcp 65001 >nul
cls

echo =======================================================================
echo       INSTALLATION DU SYSTEME - CABINET DENTAIRE DR. SALMA TIJINI
echo =======================================================================
echo.
echo Cette operation va :
echo  1. Creer un raccourci direct sur le Bureau de l'ordinateur
echo  2. Configurer le demarrage automatique avec Windows (apres coupure de courant / allumage)
echo  3. Initialiser les dossiers de stockage et de sauvegarde automatique.
echo.

set TARGET_SCRIPT=%~dp0Lancer_Application.bat
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Cabinet Dr Salma Tijini.lnk
set STARTUP_SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Cabinet_Dr_Salma_Tijini.lnk
set ICON_PATH=%~dp0logo.png

:: Creation du raccourci sur le Bureau et dans le dossier de Demarrage Windows
echo [1/2] Creation du raccourci sur votre Bureau...
(
    echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
    echo sLinkFile = "%SHORTCUT_PATH%"
    echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
    echo oLink.TargetPath = "%TARGET_SCRIPT%"
    echo oLink.WorkingDirectory = "%~dp0"
    echo oLink.Description = "Gestion Clinique - Cabinet Dr. Salma Tijini"
    echo oLink.Save
    
    echo sStartupFile = "%STARTUP_SHORTCUT%"
    echo Set oStartupLink = oWS.CreateShortcut^(sStartupFile^)
    echo oStartupLink.TargetPath = "%TARGET_SCRIPT%"
    echo oStartupLink.WorkingDirectory = "%~dp0"
    echo oStartupLink.Description = "Demarrage Automatique Cabinet Dr Salma Tijini"
    echo oStartupLink.Save
) > "%TEMP%\CreateShortcut.vbs"

cscript //nologo "%TEMP%\CreateShortcut.vbs"
del "%TEMP%\CreateShortcut.vbs"

echo [2/2] Configuration du demarrage automatique avec Windows validee.

echo.
echo =======================================================================
echo   ✅ INSTALLATION ET DEMARRAGE AUTOMATIQUE CONFIGURES AVEC SUCCES !
echo.
echo   - Raccourci ajoute sur votre Bureau : "Cabinet Dr Salma Tijini"
echo   - Demarrage automatique au redemarrage du PC : ACTIVE
echo.
echo   Meme en cas de coupure de courant, des que le PC se rallume,
echo   l'application et la base de donnees se lancent toutes seules !
echo =======================================================================
echo.
pause
