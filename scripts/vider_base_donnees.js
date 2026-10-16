/**
 * SCRIPT DE REMISE À ZÉRO COMPLÈTE DE LA BASE DE DONNÉES (DR. SALMA TIJINI)
 * 
 * Ce script :
 * 1. Supprime TOUTES les données cliniques de test (Patients, Soins, Factures, Règlements, RDV, Documents).
 * 2. Nettoie les fichiers de test dans uploads/documents.
 * 3. Réinitialise le compte Administrateur unique :
 *      Identifiant : admin
 *      Mot de passe : Moujahid@97
 * 4. Préserve et initialise le catalogue officiel des actes dentaires (Extraction, Soins, etc.).
 * 5. Configure le cabinet du Dr. Salma Tijini (Entête, Téléphones, Adresse de Skhirat).
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Résolution de Mongoose quel que soit l'emplacement d'exécution
let mongoose;
const possibleMongoosePaths = [
  'mongoose',
  path.join(__dirname, '..', 'app', 'node_modules', 'mongoose'),
  path.join(__dirname, '..', 'backend', 'node_modules', 'mongoose'),
  path.join(__dirname, '..', 'node_modules', 'mongoose'),
  path.join(process.cwd(), 'app', 'node_modules', 'mongoose'),
  path.join(process.cwd(), 'backend', 'node_modules', 'mongoose'),
  path.join(process.cwd(), 'node_modules', 'mongoose'),
];

for (const p of possibleMongoosePaths) {
  try {
    mongoose = require(p);
    if (mongoose && mongoose.connect) break;
  } catch {}
}

if (!mongoose) {
  console.error('❌ Module mongoose introuvable. Veuillez exécuter ce script depuis le dossier de l\'application.');
  process.exit(1);
}

// Recherche de l'URI MongoDB dans les fichiers .env
function getMongoUri() {
  const envCandidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', 'backend', '.env'),
    path.join(__dirname, '..', 'app', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'backend', '.env'),
  ];

  for (const envFile of envCandidates) {
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, 'utf8');
        const match = content.match(/MONGODB_URI=(.+)/);
        if (match && match[1]) {
          return match[1].trim();
        }
      } catch {}
    }
  }

  // Fallbacks standard
  return 'mongodb://127.0.0.1:27017/dr-tijini';
}

const DEFAULT_DENTAL_ACTS = [
  { code: 'ACT-01', name: 'Consultation dentaire', category: 'Consultation & Bilan', defaultPrice: 100, isFavorite: true },
  { code: 'ACT-02', name: 'Radiographie panoramique', category: 'Imagerie & Radiologie', defaultPrice: 200, isFavorite: true },
  { code: 'ACT-03', name: 'Carie simple', category: 'Soins Conservateurs', defaultPrice: 300, isFavorite: true },
  { code: 'ACT-04', name: 'Reconstitution coronaire', category: 'Soins Conservateurs', defaultPrice: 600, isFavorite: true },
  { code: 'ACT-05', name: 'Endodontie (Endo)', category: 'Endodontie', defaultPrice: 600, isFavorite: true },
  { code: 'ACT-06', name: 'Détartrage', category: 'Hygiène & Parodontie', defaultPrice: 400, isFavorite: true },
  { code: 'ACT-07', name: 'Blanchiment dentaire', category: 'Esthétique Dentaire', defaultPrice: 2500, isFavorite: true },
  { code: 'ACT-08', name: 'Extraction (Exo)', category: 'Chirurgie & Extraction', defaultPrice: 500, isFavorite: true },
  { code: 'ACT-09', name: 'Extraction dent de sagesse', category: 'Chirurgie & Extraction', defaultPrice: 1000, isFavorite: true },
  { code: 'ACT-10', name: 'Suture', category: 'Chirurgie & Extraction', defaultPrice: 200, isFavorite: false },
  { code: 'ACT-11', name: 'Couronne zircone', category: 'Prothèses Fixes', defaultPrice: 2500, isFavorite: true },
  { code: 'ACT-12', name: 'Couronne céramique', category: 'Prothèses Fixes', defaultPrice: 1500, isFavorite: true },
  { code: 'ACT-13', name: 'Bridge / Pont dentaire', category: 'Prothèses Fixes', defaultPrice: 3500, isFavorite: true },
  { code: 'ACT-14', name: 'Prothèse totale', category: 'Prothèses Amovibles', defaultPrice: 5000, isFavorite: true },
  { code: 'ACT-15', name: 'Prothèse complète maxillaire', category: 'Prothèses Amovibles', defaultPrice: 3000, isFavorite: false },
  { code: 'ACT-16', name: 'Prothèse complète mandibulaire', category: 'Prothèses Amovibles', defaultPrice: 3000, isFavorite: false },
  { code: 'ACT-17', name: 'Prothèse complète maxillaire et mandibulaire', category: 'Prothèses Amovibles', defaultPrice: 6000, isFavorite: true },
  { code: 'ACT-18', name: 'Facette dentaire (Veneer)', category: 'Esthétique Dentaire', defaultPrice: 2500, isFavorite: false },
  { code: 'ACT-19', name: 'Gouttière occlusale (Bruxisme)', category: 'Orthodontie & Gouttières', defaultPrice: 1200, isFavorite: false },
  { code: 'ACT-20', name: 'Traitement Orthodontique (Semestriel)', category: 'Orthodontie & Gouttières', defaultPrice: 4500, isFavorite: false },
];

async function askConfirmation() {
  // If run with --yes or -y, bypass prompt
  if (process.argv.includes('--yes') || process.argv.includes('-y')) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('\n======================================================================');
    console.log('  ⚠️  ATTENTION : REMISE À ZÉRO DE LA BASE DE DONNÉES CHEZ LA DOCTEUR');
    console.log('======================================================================');
    console.log('Cette action va SUPPRIMER DÉFINITIVEMENT :');
    console.log('  ❌ Tous les Patients de test');
    console.log('  ❌ Tous les Carnets, Soins et Odontogrammes 3D');
    console.log('  ❌ Toutes les Factures et Devis');
    console.log('  ❌ Tous les Règlements et Acomptes');
    console.log('  ❌ Tous les Rendez-vous');
    console.log('  ❌ Tous les Fichiers / Radios patients téléversés');
    console.log('  ❌ L\'historique des notifications et audits');
    console.log('\nCe qui sera PRÉSERVÉ et PRÊT À L\'EMPLOI :');
    console.log('  ✅ Utilisateur Admin unique : admin / Moujahid@97');
    console.log('  ✅ Catalogue des 20 Actes dentaires standard (Extraction, Soins, etc.)');
    console.log('  ✅ En-tête officiel du Cabinet Dr. Salma Tijini (Skhirat)');
    console.log('======================================================================\n');

    rl.question('Êtes-vous certain de vouloir vider la base ? Tapez "OUI" pour valider : ', (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase() === 'OUI' || answer.trim().toUpperCase() === 'O');
    });
  });
}

function cleanUploadDirectories() {
  const uploadDirs = [
    path.join(__dirname, '..', 'uploads', 'documents'),
    path.join(__dirname, '..', 'backend', 'uploads', 'documents'),
    path.join(__dirname, '..', 'app', 'uploads', 'documents'),
    path.join(__dirname, '..', 'app', 'public', 'uploads', 'documents'),
    path.join(__dirname, '..', 'public', 'uploads', 'documents'),
    path.join(process.cwd(), 'uploads', 'documents'),
    path.join(process.cwd(), 'backend', 'uploads', 'documents'),
  ];

  let cleanedFilesCount = 0;
  for (const dir of uploadDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isFile()) {
            fs.unlinkSync(fullPath);
            cleanedFilesCount++;
          }
        }
      } catch (err) {
        // Ignorer les erreurs d'accès de répertoires déjà vidés
      }
    }
  }
  if (cleanedFilesCount > 0) {
    console.log(`🧹 ${cleanedFilesCount} fichier(s) de test supprimé(s) du répertoire uploads.`);
  }
}

async function runReset() {
  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log('\n[ANNULÉ] Opération annulée. Aucune donnée n\'a été modifiée.\n');
    process.exit(0);
  }

  const uri = getMongoUri();
  console.log('\n🔌 Connexion à MongoDB...');

  try {
    await mongoose.connect(uri);
    console.log('✅ Connecté à MongoDB avec succès.');
  } catch (err) {
    console.error('❌ Échec de la connexion avec l\'URI principale. Tentative fallback...');
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/dr-tijini');
      console.log('✅ Connecté via fallback local.');
    } catch (fallbackErr) {
      console.error('❌ Impossible de se connecter à MongoDB :', fallbackErr.message);
      process.exit(1);
    }
  }

  const db = mongoose.connection.db;

  console.log('\n🗑️  Suppression des collections cliniques...');

  // Liste des collections à vider
  const collectionsToClear = [
    'patients',
    'treatments',
    'toothhistories',
    'payments',
    'paymenttransactions',
    'invoices',
    'appointments',
    'documents',
    'notificationlogs',
    'auditlogs',
    'whatsappreceivedmedias',
    'followupreminders',
  ];

  for (const colName of collectionsToClear) {
    try {
      const col = db.collection(colName);
      const res = await col.deleteMany({});
      if (res.deletedCount > 0) {
        console.log(`   - ${colName} : ${res.deletedCount} enregistrement(s) supprimé(s)`);
      }
    } catch (err) {
      // Si la collection n'existe pas encore, ignorer
    }
  }

  // 1. Réinitialisation de l'utilisateur Admin
  console.log('\n👤 Initialisation du compte Administrateur...');
  const usersCollection = db.collection('users');
  await usersCollection.deleteMany({});

  const INITIAL_ADMIN_HASH = '$2a$10$EwiDVKY2TUHkC1NRF1bljeTd45nUUrPGfo8rpwnRRZV/Rz0qI/g72'; // Moujahid@97

  await usersCollection.insertOne({
    username: 'admin',
    email: 'admin@tijini.com',
    passwordHash: INITIAL_ADMIN_HASH,
    name: 'Moujahid Ali',
    role: 'ADMIN',
    active: true,
    failedLoginAttempts: 0,
    lockUntil: null,
    avatarUrl: '/uploads/avatars/avatar-1787945011413-961832010.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('   ✅ Compte admin créé : "admin" / "Moujahid@97"');

  // 2. Configuration officielle du Cabinet Dr. Salma Tijini
  console.log('\n🏥 Initialisation de la configuration du Cabinet...');
  const clinicCollection = db.collection('clinicconfigs');
  await clinicCollection.deleteMany({});

  await clinicCollection.insertOne({
    cabinetFr: 'Cabinet Dentaire Dr. Salma Tijini',
    cabinetAr: 'عيادة الدكتورة سلمى التيجيني لطب وجراحة الأسنان',
    drFr: 'Dr. Salma Tijini',
    drAr: 'الدكتورة سلمى التيجيني',
    specsFr: 'Implantologie - Esthétique dentaire - Chirurgie buccale\nOrthodontie - Soins & Prothèses - Radio Panoramique 3D',
    address: 'Av Hassan II, lot AIN AL HAYAT 1, N° 235 , APPT N° 3, 1er Étage - SKHIRAT TEMARA',
    phones: '+212 7 19 55 66 37 / +212 6 54 23 10 76',
    email: 'dr.salmatijini@gmail.com',
    logoUrl: '/uploads/logo-cabinet.png',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('   ✅ Cabinet Dr. Salma Tijini configuré (Skhirat).');

  // 3. Catalogue des Actes Dentaires
  console.log('\n🦷 Vérification du Catalogue des Actes Dentaires...');
  const actsCollection = db.collection('dentalacts');
  const actsCount = await actsCollection.countDocuments();
  if (actsCount === 0) {
    const actsToInsert = DEFAULT_DENTAL_ACTS.map((act) => ({
      ...act,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await actsCollection.insertMany(actsToInsert);
    console.log(`   ✅ ${actsToInsert.length} actes dentaires enregistrés avec leurs tarifs.`);
  } else {
    console.log(`   ℹ️ Catalogue existant conservé (${actsCount} actes disponibles).`);
  }

  // 4. Modèles de messages WhatsApp
  console.log('\n💬 Initialisation des modèles de messages...');
  const msgCollection = db.collection('messagetemplates');
  const msgCount = await msgCollection.countDocuments();
  if (msgCount === 0) {
    await msgCollection.insertMany([
      {
        name: 'Rappel WhatsApp 24h avec Confirmation',
        channel: 'WhatsApp',
        messageType: '24Hours',
        language: 'fr',
        body: 'Bonjour {{patient_name}},\n\nNous vous rappelons votre rendez-vous au Cabinet Dentaire Dr. Salma Tijini.\n\n📅 Date : {{appointment_date}}\n🕒 Heure : {{appointment_time}}\n🦷 Soin prévu : {{treatment_type}}\n📍 Adresse : Av. Hassan II, Skhirat\n\nMerci de confirmer votre présence.',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Conseils Post-Opératoires',
        channel: 'WhatsApp',
        messageType: 'FollowUp',
        language: 'fr',
        body: 'Bonjour {{patient_name}},\n\nSuite à votre intervention chez le Dr. Salma Tijini, voici vos consignes post-opératoires :\n\n• Maintenir la compresse 30 min.\n• Éviter de fumer et de cracher aujourd\'hui.\n• Privilégier les aliments tièdes/mous.\n• Prendre vos antalgiques prescrits.\n\nEn cas de question urgente : +212 6 13 11 71 31. Bon rétablissement ! 🦷✨',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    console.log('   ✅ Modèles WhatsApp créés.');
  }

  // 5. Nettoyage des fichiers physiques de test
  cleanUploadDirectories();

  await mongoose.disconnect();

  console.log('\n======================================================================');
  console.log('   🎉 SUCCÈS : BASE DE DONNÉES ENTIÈREMENT RÉINITIALISÉE À ZÉRO !');
  console.log('======================================================================');
  console.log('L\'application est désormais propre et prête pour l\'usage réel :');
  console.log('  • Utilisateur : admin');
  console.log('  • Mot de passe : Moujahid@97');
  console.log('======================================================================\n');

  process.exit(0);
}

runReset().catch((err) => {
  console.error('\n❌ Erreur inattendue lors de la réinitialisation :', err);
  process.exit(1);
});
