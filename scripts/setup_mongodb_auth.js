const fs = require('fs');
const path = require('path');

let MongoClient;
try {
  MongoClient = require('mongodb').MongoClient;
} catch {
  const possibleModulePaths = [
    path.join(__dirname, '..', 'app', 'node_modules', 'mongodb'),
    path.join(__dirname, '..', 'backend', 'node_modules', 'mongodb'),
    path.join(__dirname, '..', 'node_modules', 'mongodb'),
    path.join(process.cwd(), 'node_modules', 'mongodb'),
    path.join(process.cwd(), 'app', 'node_modules', 'mongodb'),
  ];
  for (const p of possibleModulePaths) {
    if (fs.existsSync(p)) {
      try {
        MongoClient = require(p).MongoClient;
        break;
      } catch {}
    }
  }
}

if (!MongoClient) {
  try {
    MongoClient = require('mongoose').mongo.MongoClient;
  } catch {}
}

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
  console.log('   🔒 SECURISATION DE LA BASE DE DONNEES MONGODB (DR. TIJINI)  ');
  console.log('================================================================\n');

  if (!MongoClient) {
    console.error('❌ Module MongoDB introuvable pour configurer l\'authentification.');
    return;
  }

  // Step 1: Connect anonymously or with existing credentials
  let client;
  let connectedSecure = false;

  try {
    console.log('1️⃣ Tentative de connexion initiale a MongoDB...');
    client = new MongoClient('mongodb://127.0.0.1:27017', { directConnection: true, serverSelectionTimeoutMS: 3000 });
    await client.connect();
    console.log('✅ Connecte avec succes en mode initial (sans auth).');
  } catch (err) {
    console.log('ℹ️ Connexion sans auth impossible. Tentative avec les identifiants securises...');
    try {
      client = new MongoClient(SECURE_URI, { directConnection: true, serverSelectionTimeoutMS: 3000 });
      await client.connect();
      console.log('✅ Deja authentifie et connecte avec succes.');
      connectedSecure = true;
    } catch (authErr) {
      console.error('❌ Impossible de se connecter a MongoDB :', authErr.message);
      process.exit(1);
    }
  }

  if (!connectedSecure) {
    // Step 2: Create Admin user on 'admin' db
    console.log('\n2️⃣ Creation de l\'utilisateur SuperAdmin dans [admin]...');
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
      console.log(`✅ SuperAdmin [${ADMIN_USER}] cree avec succes.`);
    } catch (err) {
      if (err.codeName === 'UserAlreadyExists' || err.code === 51003) {
        console.log(`ℹ️ SuperAdmin [${ADMIN_USER}] existe deja.`);
      } else {
        console.warn(`⚠️ Note creation admin :`, err.message);
      }
    }

    // Step 3: Create App user on 'dr-tijini' db
    console.log('\n3️⃣ Creation de l\'utilisateur Applicatif dans [' + DB_NAME + ']...');
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
      console.log(`✅ Utilisateur Applicatif [${APP_USER}] cree avec succes.`);
    } catch (err) {
      if (err.codeName === 'UserAlreadyExists' || err.code === 51003) {
        console.log(`ℹ️ Utilisateur Applicatif [${APP_USER}] existe deja.`);
      } else {
        console.warn(`⚠️ Note creation app user :`, err.message);
      }
    }

    await client.close();
  }

  // Step 4: Update .env files
  console.log('\n4️⃣ Mise a jour des fichiers .env avec la chaine de connexion securisee...');
  const possibleEnvPaths = [
    path.join(__dirname, '..', 'app', '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', 'backend', '.env'),
    path.join(__dirname, '..', 'Cabinet_Dr_Salma_Tijini_Release', 'app', '.env'),
  ];

  for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(path.dirname(envPath))) {
      try {
        let content = '';
        if (fs.existsSync(envPath)) {
          content = fs.readFileSync(envPath, 'utf8');
        }
        
        if (content.includes('MONGODB_URI=')) {
          content = content.replace(/MONGODB_URI=.*/g, `MONGODB_URI=${SECURE_URI}`);
        } else {
          content += `\nMONGODB_URI=${SECURE_URI}\nPORT=5000\nNODE_ENV=production\n`;
        }
        
        fs.writeFileSync(envPath, content, 'utf8');
        console.log(`✅ Mis a jour : ${envPath}`);
      } catch (err) {
        console.warn(`Note mise a jour env ${envPath}: ${err.message}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log('🎉 CONFIGURATION DES UTILISATEURS MONGODB TERMINEE !');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
