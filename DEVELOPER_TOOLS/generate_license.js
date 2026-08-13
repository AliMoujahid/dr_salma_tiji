const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const MASTER_SECRET_KEY = process.env.LICENSE_MASTER_SECRET || 'DrSalmaTijini_SecuredDentalApp_MasterKey_2026_x87$kL!';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function getLocalMachineId() {
  let rawIdentifier = '';
  try {
    if (process.platform === 'win32') {
      try {
        const regOutput = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        const match = regOutput.match(/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9-]+)/i);
        if (match && match[1]) rawIdentifier += match[1].trim();
      } catch (e) {}

      try {
        const wmicOutput = execSync('powershell -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        if (wmicOutput && wmicOutput.trim().length > 5) rawIdentifier += '-' + wmicOutput.trim();
      } catch (e) {}
    }
  } catch (e) {}

  if (!rawIdentifier || rawIdentifier.trim().length < 5) {
    const os = require('os');
    rawIdentifier = `${os.hostname()}-${os.arch()}-DEFAULT`;
  }

  const hash = crypto.createHash('sha256').update(rawIdentifier).digest('hex').toUpperCase();
  return `TIJINI-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;
}

function generateLicenseKey(payload) {
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson).toString('base64');
  
  const signature = crypto
    .createHmac('sha256', MASTER_SECRET_KEY)
    .update(payloadBase64)
    .digest('hex');

  return `TIJINI-LIC-${payloadBase64}.${signature}`;
}

async function main() {
  console.log('\n================================================================');
  console.log('   🔑 GÉNÉRATEUR DE LICENCE CABINET DENTAIRE DR. SALMA TIJINI ');
  console.log('   (Outil Propriétaire Développeur - Protection Anti-Piratage) ');
  console.log('================================================================\n');

  const localId = getLocalMachineId();
  console.log(`ℹ️  Machine ID détecté sur votre PC : ${localId}\n`);

  const clientName = (await ask('1. Nom du Cabinet / Médecin (ex: Dr. Salma Tijini) : ')) || 'Dr. Salma Tijini';
  
  let targetMachineId = await ask(`2. Machine ID fourni par la cliente (ex: TIJINI-XXXX-XXXX-XXXX-XXXX)\n   [Appuyez sur Entrée pour utiliser votre PC : ${localId}] : `);
  if (!targetMachineId) {
    targetMachineId = localId;
  }

  console.log('\n3. Choisissez la durée de validité de la licence :');
  console.log('   [1] Licence Perpétuelle / À Vie (Recommandé si achat complet)');
  console.log('   [2] 1 An (365 jours - Abonnement Annuel)');
  console.log('   [3] 6 Mois (180 jours)');
  console.log('   [4] 1 Mois (30 jours - Essai ou Mensuel)');
  console.log('   [5] Date Personnalisée (Format: AAAA-MM-JJ)');
  
  const choice = await ask('\nVotre choix [1-5] (défaut: 1) : ');

  let type = 'LIFETIME';
  let validUntil = 'LIFETIME';
  const now = new Date();

  if (choice === '2') {
    type = 'SUBSCRIPTION';
    const d = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    validUntil = d.toISOString().slice(0, 10);
  } else if (choice === '3') {
    type = 'SUBSCRIPTION';
    const d = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    validUntil = d.toISOString().slice(0, 10);
  } else if (choice === '4') {
    type = 'TRIAL';
    const d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    validUntil = d.toISOString().slice(0, 10);
  } else if (choice === '5') {
    type = 'SUBSCRIPTION';
    validUntil = await ask('Entrez la date d\'expiration (ex: 2027-12-31) : ');
  }

  const payload = {
    machineId: targetMachineId,
    clientName,
    type,
    validUntil,
    maxChairs: 4,
    issuedAt: new Date().toISOString(),
  };

  const licenseKey = generateLicenseKey(payload);

  console.log('\n================================================================');
  console.log('🎉 CLÉ DE LICENCE CRYPTÉE GÉNÉRÉE AVEC SUCCÈS !');
  console.log('================================================================\n');
  console.log(`📋 Médecin / Cabinet : ${clientName}`);
  console.log(`💻 Machine ID Verrou : ${targetMachineId}`);
  console.log(`⏳ Validité Licence  : ${validUntil}`);
  console.log(`🏷️ Type de Contrat   : ${type}`);
  console.log('\n--- CLÉ D\'ACTIVATION (À COPIER/COLLER DANS L\'APPLICATION) ---');
  console.log(`\n${licenseKey}\n`);
  console.log('----------------------------------------------------------------');

  const saveOption = await ask('\nVoulez-vous enregistrer le fichier license.key ? [1=Ici, 2=Dossier Release, 3=Non] (défaut: 1) : ');
  
  if (saveOption === '1' || saveOption === '') {
    fs.writeFileSync(path.join(__dirname, 'license.key'), licenseKey, 'utf8');
    console.log(`✅ Fichier généré : ${path.join(__dirname, 'license.key')}`);
  } else if (saveOption === '2') {
    const relPath = path.join(__dirname, '..', 'Cabinet_Dr_Salma_Tijini_Release', 'license.key');
    fs.writeFileSync(relPath, licenseKey, 'utf8');
    console.log(`✅ Fichier généré dans le dossier Release : ${relPath}`);
  }

  console.log('\nAppuyez sur une touche pour quitter...');
  rl.close();
}

main().catch((err) => {
  console.error('Erreur :', err);
  rl.close();
});
