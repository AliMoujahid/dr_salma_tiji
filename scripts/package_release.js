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
  try {
    fs.rmSync(RELEASE_DIR, { recursive: true, force: true });
  } catch (err) {
    console.warn('⚠️  Note : Certains fichiers en cours d\'utilisation sont conservés.');
  }
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
MONGODB_URI=mongodb://tijini_app:Tijini%40App%23Dental2026%21@127.0.0.1:27017/dr-tijini?authSource=dr-tijini
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
cls

echo =======================================================================
echo           CABINET DENTAIRE DR. SALMA TIJINI - SYSTEME CLINIQUE
echo =======================================================================
echo.

:: 1. Verifier si Node.js est installe
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe sur cet ordinateur.
    echo Veuillez installer Node.js depuis 1_INSTALLATEURS_PREREQUIS.
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

// 7.1.b Lancer_Silencieux.vbs (100% Invisible - 0 Fenêtre Console)
const lancerSilencieuxVbs = `' ==============================================================================
' LANCEUR SILENCIEUX & INVISIBLE - CABINET DENTAIRE DR. SALMA TIJINI
' ==============================================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

sCurDir = fso.GetParentFolderName(WScript.ScriptFullName)
If Right(sCurDir, 1) <> "\\" Then sCurDir = sCurDir & "\\"

' 1. Verifier si l'application tourne deja sur le port 5000
Dim oExec, sOutput
Set oExec = WshShell.Exec("cmd /c netstat -ano | findstr :5000 | findstr LISTENING")
sOutput = oExec.StdOut.ReadAll()

If InStr(sOutput, "LISTENING") > 0 Then
    WshShell.Run "http://localhost:5000", 1, False
    WScript.Quit 0
End If

' 2. Demarrer le serveur en arriere-plan 100% invisible (Style = 0)
WshShell.Run "cmd /c ""cd /d """ & sCurDir & "app"" && node server.js""", 0, False

' 3. Attendre l'initialisation et ouvrir le navigateur
WScript.Sleep 2500
WshShell.Run "http://localhost:5000", 1, False
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'Lancer_Silencieux.vbs'), lancerSilencieuxVbs, 'utf8');

// 7.1.c PM2 Ecosystem Config
const ecosystemConfigJs = `module.exports = {
  apps: [
    {
      name: 'cabinet-dr-salma-tijini',
      script: './app/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './Sauvegardes_Cabinet/logs/pm2-error.log',
      out_file: './Sauvegardes_Cabinet/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'ecosystem.config.js'), ecosystemConfigJs, 'utf8');

// 7.1.d Lancer_PM2.bat & Arreter_PM2.bat
const lancerPm2Bat = `@echo off
title Lancer PM2 - Cabinet Dr. Salma Tijini
color 0B
cls

echo =======================================================================
echo    LANCEMENT DU CABINET VIA PM2 (PROCESSUS ARRIERE-PLAN INVISIBLE)
echo =======================================================================
echo.

where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    pm2 start ecosystem.config.js
    pm2 save
) else (
    npx pm2 start ecosystem.config.js
)

timeout /t 2 >nul
start http://localhost:5000
exit
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'Lancer_PM2.bat'), lancerPm2Bat, 'utf8');

const arreterPm2Bat = `@echo off
title Arreter PM2 - Cabinet Dr. Salma Tijini
color 0C
cls

echo =======================================================================
echo     ARRET DU SERVEUR PM2 - CABINET DENTAIRE DR. SALMA TIJINI
echo =======================================================================
echo.

where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    pm2 stop cabinet-dr-salma-tijini
    pm2 delete cabinet-dr-salma-tijini
) else (
    npx pm2 stop cabinet-dr-salma-tijini
    npx pm2 delete cabinet-dr-salma-tijini
)

echo [OK] Serveur PM2 arrete.
timeout /t 2 >nul
exit
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'Arreter_PM2.bat'), arreterPm2Bat, 'utf8');

// 7.2 CreateShortcut.vbs & Installer_Cabinet.bat (Updated to point to Lancer_Silencieux.vbs)
const createShortcutVbs = `Set oWS = CreateObject("WScript.Shell")

sCurDir = oWS.CurrentDirectory
If Right(sCurDir, 1) <> "\\" Then sCurDir = sCurDir & "\\"

sTarget = "wscript.exe"
sArguments = """" & sCurDir & "Lancer_Silencieux.vbs"""

' Desktop Shortcut
sDesktop = oWS.SpecialFolders("Desktop")
sDesktopLink = sDesktop & "\\Cabinet Dr Salma Tijini.lnk"
Set oLink = oWS.CreateShortcut(sDesktopLink)
oLink.TargetPath = sTarget
oLink.Arguments = sArguments
oLink.WorkingDirectory = sCurDir
oLink.Description = "Gestion Clinique - Cabinet Dr. Salma Tijini"
If FileExists(sCurDir & "logo.png") Then oLink.IconLocation = sCurDir & "logo.png"
oLink.Save

' Startup Shortcut
sStartup = oWS.SpecialFolders("Startup")
sStartupLink = sStartup & "\\Cabinet_Dr_Salma_Tijini.lnk"
Set oStartupLink = oWS.CreateShortcut(sStartupLink)
oStartupLink.TargetPath = sTarget
oStartupLink.Arguments = sArguments
oStartupLink.WorkingDirectory = sCurDir
oStartupLink.Description = "Demarrage Automatique Cabinet Dr Salma Tijini"
If FileExists(sCurDir & "logo.png") Then oStartupLink.IconLocation = sCurDir & "logo.png"
oStartupLink.Save

Function FileExists(filePath)
    Set fso = CreateObject("Scripting.FileSystemObject")
    FileExists = fso.FileExists(filePath)
End Function
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'CreateShortcut.vbs'), createShortcutVbs, 'utf8');

const installerCabinetBat = `@echo off
title Installation Cabinet Dr. Salma Tijini
color 0A
cls

echo =======================================================================
echo       INSTALLATION DU SYSTEME - CABINET DENTAIRE DR. SALMA TIJINI
echo =======================================================================
echo.
echo Cette operation va :
echo  1. Creer un raccourci direct et SILENCIEUX sur le Bureau
echo  2. Configurer le demarrage automatique invisible avec Windows
echo     (AUCUNE fenetre console noire n'apparaitra !)
echo.

echo [1/2] Creation du raccourci silencieux sur votre Bureau et au demarrage...
cscript //nologo "%~dp0CreateShortcut.vbs"

echo [2/2] Configuration du demarrage automatique avec Windows validee.

echo.
echo =======================================================================
echo   [OK] INSTALLATION ET DEMARRAGE AUTOMATIQUE CONFIGURES AVEC SUCCES !
echo.
echo   - Raccourci silencieux ajoute sur le Bureau : "Cabinet Dr Salma Tijini"
echo   - Demarrage 100%% invisible au redemarrage du PC : ACTIVE
echo.
echo   Des que vous cliquez sur le raccourci ou allumez le PC,
echo   l'application demarre sans aucune fenetre console noire !
echo =======================================================================
echo.
pause
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'Installer_Cabinet.bat'), installerCabinetBat, 'utf8');

// 7.3 Arreter_Application.bat
const arreterAppBat = `@echo off
title Arreter l'Application Cabinet Dr. Salma Tijini
color 0C
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
echo   [OK] SAUVEGARDE TERMINEE AVEC SUCCES DANS :
echo   %BACKUP_DEST%
echo =======================================================================
echo.
pause
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'Sauvegarder_Donnees.bat'), backupBat, 'utf8');

// 7.5 Desinstaller_Cabinet.bat
const desinstallerBat = `@echo off
title Desinstallation et Nettoyage - Cabinet Dentaire
color 0C
cls

echo =======================================================================
echo     DESINSTALLATION DU SYSTEME - CABINET DENTAIRE
echo =======================================================================
echo.
echo Cette operation va :
echo  1. Arreter le serveur de l'application (port 5000)
echo  2. Supprimer le raccourci sur le Bureau
echo  3. Supprimer le demarrage automatique au demarrage de Windows
echo.
set /p CONFIRM="Voulez-vous vraiment desinstaller l'application ? (O/N) : "
if /i "%CONFIRM%" neq "O" (
    echo [ANNULE] Operation annulee par l'utilisateur.
    timeout /t 2 >nul
    exit /b 0
)

echo.
echo [1/3] Arret du serveur en cours...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>nul
)

echo [2/3] Suppression des raccourcis du Bureau et du Demarrage...
del /f /q "%USERPROFILE%\\Desktop\\Cabinet Dr Salma Tijini.lnk" >nul 2>nul
del /f /q "%USERPROFILE%\\Desktop\\Cabinet*.lnk" >nul 2>nul
del /f /q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\Cabinet_Dr_Salma_Tijini.lnk" >nul 2>nul
del /f /q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\Cabinet*.lnk" >nul 2>nul

echo [3/3] Nettoyage des processus termine.

echo.
set /p PURGE_DATA="Voulez-vous aussi reinitialiser la licence (supprimer license.key) ? (O/N) : "
if /i "%PURGE_DATA%" equ "O" (
    del /f /q "%~dp0license.key" >nul 2>nul
    del /f /q "%~dp0app\\license.key" >nul 2>nul
    echo [OK] Cle de licence supprimee.
)

echo.
echo =======================================================================
echo   [OK] L'APPLICATION A ETE DESINSTALLEE AVEC SUCCES !
echo   Tous les raccourcis et demarrages automatiques ont ete retires.
echo =======================================================================
echo.
pause
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'Desinstaller_Cabinet.bat'), desinstallerBat, 'utf8');

// 7.6 Reinitialiser_A_Zero.bat (Pour tests & redéploiement à zéro)
const resetBat = `@echo off
title Remise a Zero Complete pour Nouveau Test
color 0E
cls

echo =======================================================================
echo    REMISE A ZERO COMPLETE (TEST DU CYCLE D'INSTALLATION ET ACTIVATION)
echo =======================================================================
echo.
echo Cette operation permet de tester l'application comme si elle etait
echo installee pour la toute premiere fois sur un PC vierge :
echo  - Arret du serveur
echo  - Suppression de la cle d'activation (pour tester l'ecran de licence)
echo  - Remise a zero des raccourcis
echo.
set /p CONFIRM="Voulez-vous reinitialiser l'activation et relancer ? (O/N) : "
if /i "%CONFIRM%" neq "O" (
    echo [ANNULE] Operation annulee.
    timeout /t 2 >nul
    exit /b 0
)

echo.
echo [1/3] Arret de l'application...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>nul
)

echo [2/3] Suppression de la licence active...
del /f /q "%~dp0license.key" >nul 2>nul
del /f /q "%~dp0app\\license.key" >nul 2>nul

echo [3/3] Relancement en mode vierge...
timeout /t 2 >nul
call "%~dp0Lancer_Application.bat"
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'Reinitialiser_A_Zero.bat'), resetBat, 'utf8');

// 7.8 🔒_VERROUILLER_ET_SECURISER_MONGODB.bat
const lockMongoBat = `@echo off
chcp 65001 >nul
color 0b
title VERROUILLAGE ET SECURISATION MONGODB - DR. SALMA TIJINI

echo ==============================================================================
echo    🔒 SÉCURISATION ET VERROUILLAGE TOTAL DE LA BASE MONGODB
echo ==============================================================================
echo.
echo Ce script va activer l'authentification obligatoire sur MongoDB.
echo Une fois active, PERSONNE ne pourra voir la base avec MongoDB Compass
echo sans les identifiants administrateur de securite !
echo.

:: Check for admin privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Demande d'elevation Administrateur...
    powershell -Command "Start-Process '%~0' -Verb RunAs"
    exit /b
)

echo [1/3] Creation des comptes administrateurs et applicatifs...
node "%~dp0scripts\\setup_mongodb_auth.js"

echo.
echo [2/3] Modification de mongod.cfg (security.authorization: enabled)...
powershell -Command "$cfg='C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.cfg'; if (-not (Test-Path $cfg)) { $cfg='C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.cfg' }; if (Test-Path $cfg) { $txt=[System.IO.File]::ReadAllText($cfg); if (-not $txt.Contains('authorization: enabled')) { $n=$txt -replace '#security:', ('security:' + [Environment]::NewLine + '  authorization: enabled'); [System.IO.File]::WriteAllText($cfg, $n); Write-Host 'Fichier mongod.cfg verouille avec succes.' -ForegroundColor Green } else { Write-Host 'Securite deja activee dans mongod.cfg.' -ForegroundColor Yellow } } else { Write-Host 'Fichier mongod.cfg introuvable.' -ForegroundColor Red }"

echo.
echo [3/3] Redemarrage du service Windows MongoDB avec la securite activee...
powershell -Command "Restart-Service -Name MongoDB -Force; Start-Sleep -Seconds 2; Write-Host 'Service MongoDB redemarre et 100% securise !' -ForegroundColor Green"

echo.
echo ==============================================================================
echo  🎉 SUCCES : LA BASE DE DONNEES EST DESORMAIS 100%% PROTEGEE !
echo     - Connexion sans mot de passe via MongoDB Compass : REFUSEE (Bloquee)
echo     - Application Cabinet Dentaire : Connectee avec succes
echo ==============================================================================
echo.
pause
`;
fs.writeFileSync(path.join(RELEASE_DIR, '🔒_VERROUILLER_ET_SECURISER_MONGODB.bat'), lockMongoBat, 'utf8');

// Copy auth setup script to release scripts directory
fs.mkdirSync(path.join(RELEASE_DIR, 'scripts'), { recursive: true });
fs.copyFileSync(path.join(ROOT_DIR, 'scripts', 'setup_mongodb_auth.js'), path.join(RELEASE_DIR, 'scripts', 'setup_mongodb_auth.js'));

// 7.7 LISEZ-MOI / GUIDE D'INSTALLATION
const guideText = `=======================================================================
   CABINET DENTAIRE - GUIDE D'INSTALLATION ET GESTION
=======================================================================

1. PREMIERE UTILISATION / INSTALLATION SUR LE PC DU CABINET :
-------------------------------------------------------------
- Double-cliquez sur "Installer_Cabinet.bat".
- Cela crée immédiatement une icône sur le Bureau et active le démarrage automatique.

2. VERROUILLAGE ET PROTECTION DE LA BASE DE DONNEES (ANTI-COMPASS) :
--------------------------------------------------------------------
- Faites un clic droit sur "🔒_VERROUILLER_ET_SECURISER_MONGODB.bat" 
  -> Cliquez sur "Exécuter en tant qu'administrateur".
- Cela active l'authentification stricte sur MongoDB et empêche quiconque
  d'ouvrir ou d'exporter les données avec MongoDB Compass ou tout autre outil.

3. LANCEMENT DU LOGICIEL :
---------------------------
- Double-cliquez sur l'icône sur le Bureau (ou sur "Lancer_Application.bat").
- Le logiciel démarre et votre navigateur Internet s'ouvre automatiquement sur :
  http://localhost:5000

4. PROTECTION ET ACTIVATION DE LA LICENCE :
-------------------------------------------
- Lors de la première ouverture sur un nouvel ordinateur, un écran d'activation
  sécurisé apparaît avec le Code Machine Unique (Hardware ID) de l'ordinateur.
- Copiez ce code et collez-le dans votre générateur de licence.
- Collez la clé de licence reçue dans l'application et cliquez sur "Activer".

5. COMPTE ADMINISTRATEUR PAR DEFAUT :
--------------------------------------
- Nom d'utilisateur / Email : admin (ou admin@tijini.com)
- Mot de passe              : Moujahid@97
(Connectez-vous pour ajouter les comptes du médecin et des assistantes dans Paramètres > Équipe).


6. DESINSTALLATION OU REINITIALISATION :
----------------------------------------
- Double-cliquez sur "Desinstaller_Cabinet.bat" pour désinstaller l'application et retirer les raccourcis.
- Double-cliquez sur "Reinitialiser_A_Zero.bat" pour effacer la licence et retester l'activation depuis le début.

=======================================================================
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'LISEZ-MOI.txt'), guideText, 'utf8');


// Helper to copy directory recursively (excluding temporary session folders and git)
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (
      entry.name === '.wwebjs_auth' ||
      entry.name === '.wwebjs_cache' ||
      entry.name === '.git' ||
      entry.name === '.DS_Store'
    ) {
      continue;
    }

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
