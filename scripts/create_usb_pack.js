const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const USB_PACK_DIR = path.join(ROOT_DIR, 'PACK_INSTALLATION_CLE_USB');

console.log('Création de l\'arborescence pour la clé USB...');

const dirInstallateurs = path.join(USB_PACK_DIR, '1_INSTALLATEURS_PREREQUIS');
const dirApp = path.join(USB_PACK_DIR, '2_APPLICATION_A_COPIER_CHEZ_TBIB');
const dirDev = path.join(USB_PACK_DIR, '3_DEVELOPPEUR_POUR_VOUS_SEULEMENT');

fs.mkdirSync(dirInstallateurs, { recursive: true });
fs.mkdirSync(dirApp, { recursive: true });
fs.mkdirSync(dirDev, { recursive: true });

// 1. Text file inside 1_INSTALLATEURS_PREREQUIS
const infoInstallateurs = `=======================================================================
   DOSSIER DES INSTALLATEURS (A METTRE ICI APRES TELECHARGEMENT)
=======================================================================

Placez dans ce dossier les 2 fichiers .msi téléchargés :

1. Node.js (Version LTS) :
   Lien direct : https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi
   Nom du fichier attendu : node-v20.18.0-x64.msi

2. MongoDB Community Server :
   Lien direct : https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.14-signed.msi
   Nom du fichier attendu : mongodb-windows-x86_64-7.0.14-signed.msi

=======================================================================
`;
fs.writeFileSync(path.join(dirInstallateurs, 'LISEZ_MOI_TELECHARGEMENTS.txt'), infoInstallateurs, 'utf8');

// 2. Copy Release into 2_APPLICATION_A_COPIER_CHEZ_TBIB
const releaseSrc = path.join(ROOT_DIR, 'Cabinet_Dr_Salma_Tijini_Release');
if (fs.existsSync(releaseSrc)) {
  console.log('Copie du dossier Cabinet_Dr_Salma_Tijini_Release...');
  copyDirSync(releaseSrc, path.join(dirApp, 'Cabinet_Dr_Salma_Tijini_Release'));
}

// 3. Copy Developer Tools into 3_DEVELOPPEUR_POUR_VOUS_SEULEMENT
const devSrc = path.join(ROOT_DIR, 'DEVELOPER_TOOLS');
if (fs.existsSync(devSrc)) {
  console.log('Copie des outils de génération de licence...');
  copyDirSync(devSrc, path.join(dirDev, 'DEVELOPER_TOOLS'));
}

// 4. Master Guide file at the root of the USB pack
const masterGuide = `=======================================================================
   CABINET DENTAIRE DR. SALMA TIJINI - GUIDE DE DEPLOIEMENT EN 5 MINUTES
=======================================================================

ORGANISATION DES DOSSIERS SUR CETTE CLE USB :
---------------------------------------------
📁 1_INSTALLATEURS_PREREQUIS/
   -> Contient Node.js et MongoDB (fichiers .msi à installer sur le PC du cabinet)

📁 2_APPLICATION_A_COPIER_CHEZ_TBIB/
   -> Le dossier "Cabinet_Dr_Salma_Tijini_Release" à copier dans "C:\\Cabinet_Dr_Salma_Tijini"

📁 3_DEVELOPPEUR_POUR_VOUS_SEULEMENT/
   -> Le générateur de licence (A GARDER SUR VOTRE PROPRE PC)


ETAPES D'INSTALLATION SUR PLACE CHEZ LE MEDECIN :
-------------------------------------------------
ETAPE 1 : Installez Node.js depuis le dossier "1_INSTALLATEURS_PREREQUIS"
          (Cliquez sur Suivant -> Suivant -> Terminer).

ETAPE 2 : Installez MongoDB depuis le dossier "1_INSTALLATEURS_PREREQUIS"
          (Cliquez sur Complete -> Laissez coché "Install as Service" -> Installer).

ETAPE 3 : Copiez le dossier "Cabinet_Dr_Salma_Tijini_Release" 
          sur le disque dur du cabinet (ex: C:\\Cabinet_Dr_Salma_Tijini).

ETAPE 4 : Dans le dossier copié, double-cliquez sur "Installer_Cabinet.bat".
          -> Cela crée l'icône sur le Bureau et configure le démarrage automatique 
             dès que le PC s'allume (même après coupure de courant).

ETAPE 4 BIS (SÉCURITÉ ANTI-COMPASS) :
          -> Faites un clic droit sur "🔒_VERROUILLER_ET_SECURISER_MONGODB.bat" 
             et choisissez "Exécuter en tant qu'administrateur".
          -> Cela active la sécurité stricte sur MongoDB et bloque tout accès non autorisé (Compass, export...).

ETAPE 5 : Double-cliquez sur l'icône du Bureau "Cabinet Dr Salma Tijini".
          -> L'écran d'activation affiche le Machine ID du PC de la docteure.
          -> Sur votre PC, lancez "3_DEVELOPPEUR.../generate_license.bat".
          -> Collez son Machine ID, générez la clé, et collez-la dans son application.
          -> Cliquez sur "Activer le Logiciel".

C'EST TOUT ! Le cabinet est prêt, ultra-sécurisé et sauvegardé chaque jour à 23h00.
=======================================================================
`;
fs.writeFileSync(path.join(USB_PACK_DIR, 'GUIDE_INSTALLATION_SUR_PLACE.txt'), masterGuide, 'utf8');

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

console.log('✅ Structure complète créée dans : ' + USB_PACK_DIR);
