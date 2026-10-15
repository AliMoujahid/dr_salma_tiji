const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PATCH_DIR = path.join(ROOT_DIR, 'PACK_INSTALLATION_CLE_USB', '4_MISE_A_JOUR_RAPIDE_CORRECTIF_PDF');
const FILES_DIR = path.join(PATCH_DIR, 'files');

const BACKEND_DIST = path.join(ROOT_DIR, 'backend', 'dist');
const FRONTEND_DIST = path.join(ROOT_DIR, 'frontend', 'dist');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

if (fs.existsSync(PATCH_DIR)) {
  fs.rmSync(PATCH_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FILES_DIR, { recursive: true });

// Copy backend compiled files
console.log('📦 Copie des fichiers backend corrigés...');
for (const sub of ['server.js', 'routes', 'middleware', 'models', 'services']) {
  const src = path.join(BACKEND_DIST, sub);
  const dest = path.join(FILES_DIR, sub);
  if (fs.existsSync(src)) {
    if (fs.statSync(src).isDirectory()) {
      copyRecursive(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

// Copy frontend build to files/public
console.log('📦 Copie du frontend corrigé...');
copyRecursive(FRONTEND_DIST, path.join(FILES_DIR, 'public'));

// Create 1-click installer batch script
const batScript = `@echo off
chcp 65001 >nul
title Mise à Jour Cabinet Dr. Salma Tijini (Carnet Financier, Facturation & PDF)
cls
echo ==============================================================================
echo       MISE À JOUR AUTOMATIQUE - CABINET DENTAIRE DR. SALMA TIJINI
echo   - Carnet Financier du Patient (Diftar : Soins, Règlements & Solde Global)
echo   - Facturation Propre & Sélective (Sans colonnes Reste par article)
echo   - Aperçu & Téléchargement Sécurisé des PDF et Radios
echo ==============================================================================
echo.

set "TARGET_DIR=C:\\Cabinet_Dr_Salma_Tijini_Release\\app"

if not exist "%TARGET_DIR%" (
    echo [ERREUR] Le dossier "%TARGET_DIR%" est introuvable sur ce PC !
    echo Veuillez vérifier que l'application est bien installée dans C:\\Cabinet_Dr_Salma_Tijini_Release
    echo.
    pause
    exit /b 1
)

echo [1/3] Arrêt temporaire du service de l'application...
call pm2.cmd stop 0 >nul 2>&1
call pm2.cmd stop cabinet-dr-salma-tijini >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Copie des fichiers corrigés vers l'application...
xcopy /E /Y /I "%~dp0files\\*" "%TARGET_DIR%\\" >nul
if errorlevel 1 (
    echo [ERREUR] Impossible de copier certains fichiers. Exécutez ce script en tant qu'administrateur !
    pause
    exit /b 1
)

echo [3/3] Redémarrage du serveur Cabinet Dentaire...
call pm2.cmd restart 0 >nul 2>&1
if errorlevel 1 (
    call pm2.cmd restart cabinet-dr-salma-tijini >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo.
echo ==============================================================================
echo   ✅ MISE À JOUR APPLIQUÉE AVEC SUCCÈS !
echo.
echo   - L'aperçu des fichiers PDF (comme ccc.pdf) s'affiche maintenant directement.
echo   - Le bouton "Télécharger" télécharge le fichier réel instantanément.
echo   - Le bouton "Ouvrir" permet d'ouvrir le document en plein écran.
echo ==============================================================================
echo.
echo Vous pouvez maintenant actualiser votre navigateur (Ctrl + F5) sur :
echo http://localhost:5000
echo.
pause
`;

fs.writeFileSync(path.join(PATCH_DIR, 'Appliquer_Mise_A_Jour.bat'), batScript, 'utf8');

console.log('✅ Patch créé avec succès dans : ' + PATCH_DIR);
