const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ADMIN_USER = 'dr_tijini_admin';
const ADMIN_PASS = 'Tijini@Secure#Db2026!';
const APP_USER = 'tijini_app';
const APP_PASS = 'Tijini@App#Dental2026!';
const DB_NAME = 'dr-tijini';

// URL encoded credentials for URI
const ENCODED_APP_PASS = encodeURIComponent(APP_PASS);
const SECURE_URI = `mongodb://${APP_USER}:${ENCODED_APP_PASS}@127.0.0.1:27017/${DB_NAME}?authSource=${DB_NAME}`;

async function main() {
  console.log('================================================================');
  console.log('   🔒 SÉCURISATION DE LA BASE DE DONNÉES MONGODB (DR. TIJINI)  ');
  console.log('================================================================\n');

  // Step 1: Connect anonymously or with existing credentials
  let client;
  let connectedSecure = false;

  try {
    console.log('1️⃣ Tentative de connexion anonyme à MongoDB...');
    client = new MongoClient('mongodb://127.0.0.1:27017', { directConnection: true, serverSelectionTimeoutMS: 3000 });
    await client.connect();
    console.log('✅ Connecté avec succès en mode initial (sans auth).');
  } catch (err) {
    console.log('ℹ️ Connexion sans auth impossible. Tentative avec les identifiants sécurisés...');
    try {
      client = new MongoClient(SECURE_URI, { directConnection: true, serverSelectionTimeoutMS: 3000 });
      await client.connect();
      console.log('✅ Déjà authentifié et connecté avec succès.');
      connectedSecure = true;
    } catch (authErr) {
      console.error('❌ Impossible de se connecter à MongoDB :', authErr.message);
      process.exit(1);
    }
  }

  if (!connectedSecure) {
    // Step 2: Create Admin user on 'admin' db
    console.log('\n2️⃣ Création de l\'utilisateur SuperAdmin dans [admin]...');
    const adminDb = client.db('admin');
    try {
      await adminDb.command({
        createUser: ADMIN_USER,
        pwd: ADMIN_PASS,
        roles: [
          { role: 'userAdminAnyDatabase', db: 'admin' },
          { role: 'dbAdminAnyDatabase', db: 'admin' },
          { role: 'readWriteAnyDatabase', db: 'admin' },
        ],
      });
      console.log(`✅ SuperAdmin [${ADMIN_USER}] créé avec succès.`);
    } catch (err) {
      if (err.codeName === 'UserAlreadyExists' || err.code === 51003) {
        console.log(`ℹ️ SuperAdmin [${ADMIN_USER}] existe déjà.`);
      } else {
        console.warn(`⚠️ Note création admin :`, err.message);
      }
    }

    // Step 3: Create App user on 'dr-tijini' db
    console.log('\n3️⃣ Création de l\'utilisateur Applicatif dans [' + DB_NAME + ']...');
    const appDb = client.db(DB_NAME);
    try {
      await appDb.command({
        createUser: APP_USER,
        pwd: APP_PASS,
        roles: [
          { role: 'readWrite', db: DB_NAME },
          { role: 'dbAdmin', db: DB_NAME },
        ],
      });
      console.log(`✅ Utilisateur Applicatif [${APP_USER}] créé avec succès.`);
    } catch (err) {
      if (err.codeName === 'UserAlreadyExists' || err.code === 51003) {
        console.log(`ℹ️ Utilisateur Applicatif [${APP_USER}] existe déjà.`);
      } else {
        console.warn(`⚠️ Note création app user :`, err.message);
      }
    }

    await client.close();
  }

  // Step 4: Update .env files
  console.log('\n4️⃣ Mise à jour des fichiers .env avec la chaîne de connexion sécurisée...');
  const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
  const releaseEnvPath = path.join(__dirname, '..', 'Cabinet_Dr_Salma_Tijini_Release', 'app', '.env');

  const envContent = `PORT=5000\nMONGODB_URI=${SECURE_URI}\nJWT_SECRET=super-secret-dental-jwt-key-2026-dr-tijini\n`;

  fs.writeFileSync(backendEnvPath, envContent, 'utf8');
  console.log(`✅ Mis à jour : ${backendEnvPath}`);

  if (fs.existsSync(path.dirname(releaseEnvPath))) {
    fs.writeFileSync(releaseEnvPath, envContent, 'utf8');
    console.log(`✅ Mis à jour : ${releaseEnvPath}`);
  }

  console.log('\n================================================================');
  console.log('🎉 CONFIGURATION DES UTILISATEURS MONGODB TERMINÉE !');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
