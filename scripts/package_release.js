const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const RELEASE_DIR = path.join(ROOT_DIR, 'Cabinet_Dr_Salma_Tijini_Release');
const APP_DIR = path.join(RELEASE_DIR, 'app');

console.log('================================================================');
console.log('   🚀 PACKAGING DU CABINET DENTAIRE DR. SALMA TIJINI           ');
console.log('   (Création du dossier d\'installation sécurisé & optimisé)    ');
console.log('================================================================\n');

// 1. Build Backend
console.log('1️⃣  Compilation du Backend TypeScript...');
execSync('npm run build', { cwd: BACKEND_DIR, stdio: 'inherit' });
console.log('✅ Backend compilé avec succès (backend/dist).\n');

// 2. Build Frontend
console.log('2️⃣  Compilation du Frontend React (Vite)...');
execSync('npm run build', { cwd: FRONTEND_DIR, stdio: 'inherit' });
console.log('✅ Frontend compilé avec succès (frontend/dist).\n');

// 3. Prepare Release Directory
console.log('3️⃣  Préparation du dossier de Release...');
if (fs.existsSync(RELEASE_DIR)) {
  console.log('Nettoyage de l\'ancien dossier Release...');
  fs.rmSync(RELEASE_DIR, { recursive: true, force: true });
}

fs.mkdirSync(RELEASE_DIR, { recursive: true });
fs.mkdirSync(APP_DIR, { recursive: true });
fs.mkdirSync(path.join(APP_DIR, 'public'), { recursive: true });
fs.mkdirSync(path.join(APP_DIR, 'uploads', 'temp'), { recursive: true });
fs.mkdirSync(path.join(APP_DIR, 'uploads', 'Patients'), { recursive: true });
fs.mkdirSync(path.join(APP_DIR, 'uploads', 'Clinic'), { recursive: true });
fs.mkdirSync(path.join(RELEASE_DIR, 'Sauvegardes_Cabinet'), { recursive: true });

// Copy Compiled Backend files
console.log('4️⃣  Copie des fichiers Backend compilés...');
copyDirSync(path.join(BACKEND_DIR, 'dist'), APP_DIR);

// Copy package.json and create production .env
fs.copyFileSync(path.join(BACKEND_DIR, 'package.json'), path.join(APP_DIR, 'package.json'));

const prodEnv = `# Configuration Cabinet Dentaire Dr. Salma Tijini (Production)
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://127.0.0.1:27017/dr-tijini
JWT_SECRET=DrSalmaTijini_Secured_Production_Key_2026_x99!
LICENSE_MASTER_SECRET=DrSalmaTijini_SecuredDentalApp_MasterKey_2026_x87$kL!
`;
fs.writeFileSync(path.join(APP_DIR, '.env'), prodEnv, 'utf8');

// Copy Compiled Frontend to app/public
console.log('5️⃣  Copie du Frontend compilé vers app/public...');
copyDirSync(path.join(FRONTEND_DIR, 'dist'), path.join(APP_DIR, 'public'));

// Copy Node Modules to app/node_modules
console.log('6️⃣  Copie des dépendances Node.js de production (node_modules)...');
const backendNodeModules = path.join(BACKEND_DIR, 'node_modules');
if (fs.existsSync(backendNodeModules)) {
  copyDirSync(backendNodeModules, path.join(APP_DIR, 'node_modules'));
}

// Copy Logo
const logoSrc = path.join(ROOT_DIR, 'logo.png');
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, path.join(APP_DIR, 'uploads', 'Clinic', 'logo.png'));
  fs.copyFileSync(logoSrc, path.join(RELEASE_DIR, 'logo.png'));
}

// ==========================================
// 7. GENERATE BATCH LAUNCHERS & SCRIPTS
// ==========================================
console.log('7️⃣  Génération des scripts de lancement et d\'installation Windows...');

// 7.1 Lancer_Application.bat
const lancerAppBat = `@echo off
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
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'Lancer_Application.bat'), lancerAppBat, 'utf8');

// 7.2 Installer_Cabinet.bat (Desktop Shortcut + Windows Startup on Boot)
const installerCabinetBat = `@echo off
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
set SHORTCUT_PATH=%USERPROFILE%\\Desktop\\Cabinet Dr Salma Tijini.lnk
set STARTUP_SHORTCUT=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\Cabinet_Dr_Salma_Tijini.lnk
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
) > "%TEMP%\\CreateShortcut.vbs"

cscript //nologo "%TEMP%\\CreateShortcut.vbs"
del "%TEMP%\\CreateShortcut.vbs"

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
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'Installer_Cabinet.bat'), installerCabinetBat, 'utf8');

// 7.3 Arreter_Application.bat
const arreterAppBat = `@echo off
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
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'Arreter_Application.bat'), arreterAppBat, 'utf8');

// 7.4 Sauvegarder_Donnees.bat
const backupBat = `@echo off
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
set BACKUP_DEST=%~dp0Sauvegardes_Cabinet\\Sauvegarde_%TIMESTAMP%

echo Destination : %BACKUP_DEST%
mkdir "%BACKUP_DEST%" 2>nul

echo.
echo [1/2] Copie des radios, photos et documents patients...
xcopy "%~dp0app\\uploads" "%BACKUP_DEST%\\uploads" /E /I /H /Y /Q >nul

echo [2/2] Copie des fichiers de configuration...
copy "%~dp0license.key" "%BACKUP_DEST%\\" >nul 2>nul

echo.
echo =======================================================================
echo   ✅ SAUVEGARDE TERMINEE AVEC SUCCES DANS :
echo   %BACKUP_DEST%
echo =======================================================================
echo.
pause
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'Sauvegarder_Donnees.bat'), backupBat, 'utf8');

// 7.5 LISEZ-MOI / GUIDE D'INSTALLATION
const guideText = `=======================================================================
   CABINET DENTAIRE DR. SALMA TIJINI - GUIDE D'INSTALLATION ET GESTION
=======================================================================

1. PREMIERE UTILISATION / INSTALLATION SUR LE PC DU CABINET :
-------------------------------------------------------------
- Double-cliquez sur "Installer_Cabinet.bat".
- Cela crée immédiatement une icône "Cabinet Dr Salma Tijini" sur le Bureau.

2. LANCEMENT DU LOGICIEL :
---------------------------
- Double-cliquez sur l'icône sur le Bureau (ou sur "Lancer_Application.bat").
- Le logiciel démarre et votre navigateur Internet s'ouvre automatiquement sur :
  http://localhost:5000

3. PROTECTION ET ACTIVATION DE LA LICENCE :
-------------------------------------------
- Lors de la première ouverture sur un nouvel ordinateur, un écran d'activation
  sécurisé apparaît avec le Code Machine Unique (Hardware ID) de l'ordinateur.
- Copiez ce code et transmettez-le à votre développeur/fournisseur.
- Collez la clé de licence reçue dans l'application et cliquez sur "Activer".
- Dès activation, le logiciel est déverrouillé et prêt pour toutes vos consultations.

4. COMPTES PAR DEFAUT (SEEDED STAFF) :
--------------------------------------
- Docteur (Admin) : doctor@tijini.com  /  Mot de passe : password123
- Assistante      : assistant@tijini.com  /  Mot de passe : password123
- Réceptionniste  : receptionist@tijini.com  /  Mot de passe : password123
(Vous pouvez modifier ces mots de passe dans l'onglet Paramètres).

5. SAUVEGARDES AUTOMATIQUES :
-----------------------------
- Double-cliquez sur "Sauvegarder_Donnees.bat" pour faire une copie horodatée
  de toutes vos radios, photos et dossiers dans le dossier "Sauvegardes_Cabinet".

=======================================================================
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'LISEZ-MOI.txt'), guideText, 'utf8');

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('\n================================================================');
console.log('🎉 DOSSIER RELEASE CRÉÉ AVEC SUCCÈS !');
console.log(`📁 Emplacement : ${RELEASE_DIR}`);
console.log('================================================================\n');
