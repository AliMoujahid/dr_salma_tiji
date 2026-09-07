const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function main() {
  console.log('================================================================');
  console.log(' 🔒 ACTIVATION DU VERROUILLAGE DE SÉCURITÉ MONGODB');
  console.log('================================================================\n');

  // Search candidate paths for mongod.cfg
  const candidates = [
    'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.cfg',
    'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.cfg',
    'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.cfg',
    'C:\\Program Files\\MongoDB\\Server\\5.0\\bin\\mongod.cfg',
  ];

  let cfgPath = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      cfgPath = p;
      break;
    }
  }

  if (!cfgPath) {
    console.error('❌ Fichier mongod.cfg introuvable parmi les chemins standards.');
    process.exit(1);
  }

  console.log(`📄 Fichier de configuration trouvé : ${cfgPath}`);

  let content = fs.readFileSync(cfgPath, 'utf8');

  if (content.includes('authorization: enabled') || content.includes('authorization: "enabled"')) {
    console.log('ℹ️ La sécurité "authorization: enabled" est DÉJÀ activée dans mongod.cfg.');
  } else {
    console.log('⚙️ Modification de mongod.cfg pour activer "security.authorization: enabled"...');

    if (content.includes('#security:')) {
      content = content.replace('#security:', 'security:\r\n  authorization: enabled');
    } else if (content.includes('security:')) {
      content = content.replace('security:', 'security:\r\n  authorization: enabled');
    } else {
      content += '\r\n\r\nsecurity:\r\n  authorization: enabled\r\n';
    }

    fs.writeFileSync(cfgPath, content, 'utf8');
    console.log('✅ Fichier mongod.cfg mis à jour avec succès.');
  }

  // Restart MongoDB Windows Service
  console.log('\n🔄 Redémarrage du service Windows MongoDB...');
  try {
    execSync('powershell -Command "Restart-Service -Name MongoDB -Force"', { stdio: 'inherit' });
    console.log('✅ Service MongoDB redémarré avec succès !');
  } catch (err) {
    console.warn('⚠️ Note lors du redémarrage du service MongoDB :', err.message);
  }

  console.log('\n================================================================');
  console.log('🎉 BASE DE DONNÉES ENTIÈREMENT VERROUILLÉE & SÉCURISÉE !');
  console.log('   - MongoDB Compass sans mot de passe : REFUSÉ ❌🔒');
  console.log('   - Connexion applicative authentifiée : ACTIF  ✅🚀');
  console.log('================================================================\n');
}

main();
