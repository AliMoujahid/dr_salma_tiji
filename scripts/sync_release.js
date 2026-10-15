const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const BACKEND_DIST = path.join(ROOT_DIR, 'backend', 'dist');
const FRONTEND_DIST = path.join(ROOT_DIR, 'frontend', 'dist');

const TARGETS = [
  path.join(ROOT_DIR, 'Cabinet_Dr_Salma_Tijini_Release'),
  path.join(ROOT_DIR, 'PACK_INSTALLATION_CLE_USB', '2_APPLICATION_A_COPIER_CHEZ_TBIB', 'Cabinet_Dr_Salma_Tijini_Release'),
];

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('🚀 Synchronisation des fichiers de Release...');

for (const targetRelease of TARGETS) {
  if (!fs.existsSync(targetRelease)) {
    console.log(`⚠️ Dossier cible inexistant : ${targetRelease}`);
    continue;
  }
  const appDir = path.join(targetRelease, 'app');
  const appPublic = path.join(appDir, 'public');
  const releasePublic = path.join(targetRelease, 'public');

  console.log(`\n📦 Mise à jour de : ${path.relative(ROOT_DIR, targetRelease)}`);

  // 1. Copy backend dist files (server.js, routes, middleware, models, services)
  const distEntries = fs.readdirSync(BACKEND_DIST, { withFileTypes: true });
  for (const entry of distEntries) {
    const src = path.join(BACKEND_DIST, entry.name);
    const dest = path.join(appDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  console.log('  ✅ Backend mis à jour.');

  // 2. Clean old public assets before copying new build
  for (const pub of [appPublic, releasePublic]) {
    fs.mkdirSync(pub, { recursive: true });
    // Clean old assets folder if exists
    const assetsDir = path.join(pub, 'assets');
    if (fs.existsSync(assetsDir)) {
      try {
        fs.rmSync(assetsDir, { recursive: true, force: true });
      } catch {}
    }
    copyDirRecursive(FRONTEND_DIST, pub);
  }
  console.log('  ✅ Frontend mis à jour (app/public et public).');
}

console.log('\n✨ Synchronisation terminée avec succès !');
