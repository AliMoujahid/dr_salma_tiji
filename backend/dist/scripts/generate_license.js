"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = __importDefault(require("readline"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const licenseService_1 = require("../services/licenseService");
const rl = readline_1.default.createInterface({
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
async function main() {
    console.log('\n======================================================');
    console.log('   🔑 GÉNÉRATEUR DE LICENCE - DR. SALMA TIJINI      ');
    console.log('   (Outil Développeur Confidentiel Anti-Piratage)    ');
    console.log('======================================================\n');
    const currentMachineId = licenseService_1.licenseService.getMachineId();
    console.log(`ℹ️ Machine ID de ce PC de développement : ${currentMachineId}\n`);
    const clientName = (await ask('1. Nom du Cabinet / Client (ex: Dr. Salma Tijini) : ')) || 'Dr. Salma Tijini';
    let targetMachineId = await ask(`2. Machine ID du PC client (Appuyez sur Entrée pour utiliser ce PC : ${currentMachineId}) : `);
    if (!targetMachineId) {
        targetMachineId = currentMachineId;
    }
    console.log('\n3. Type de licence :');
    console.log('   [1] Licence Perpétuelle / À Vie (LIFETIME)');
    console.log('   [2] 1 An (365 jours)');
    console.log('   [3] 6 Mois (180 jours)');
    console.log('   [4] 1 Mois / Période d\'essai (30 jours)');
    console.log('   [5] Date personnalisée (YYYY-MM-DD)');
    const choice = await ask('\nChoisissez une option [1-5] (défaut: 1) : ');
    let type = 'LIFETIME';
    let validUntil = 'LIFETIME';
    const now = new Date();
    if (choice === '2') {
        type = 'SUBSCRIPTION';
        const d = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        validUntil = d.toISOString().slice(0, 10);
    }
    else if (choice === '3') {
        type = 'SUBSCRIPTION';
        const d = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
        validUntil = d.toISOString().slice(0, 10);
    }
    else if (choice === '4') {
        type = 'TRIAL';
        const d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        validUntil = d.toISOString().slice(0, 10);
    }
    else if (choice === '5') {
        type = 'SUBSCRIPTION';
        validUntil = await ask('Entrez la date d\'expiration (YYYY-MM-DD) : ');
    }
    const payload = {
        machineId: targetMachineId,
        clientName,
        type,
        validUntil,
        maxChairs: 4,
        issuedAt: new Date().toISOString(),
    };
    const licenseKey = licenseService_1.licenseService.generateLicense(payload);
    console.log('\n======================================================');
    console.log('🎉 CLÉ DE LICENCE GÉNÉRÉE AVEC SUCCÈS !');
    console.log('======================================================\n');
    console.log(`📋 Client      : ${clientName}`);
    console.log(`💻 Machine ID  : ${targetMachineId}`);
    console.log(`⏳ Validité    : ${validUntil}`);
    console.log(`🏷️ Type        : ${type}`);
    console.log('\n--- CLÉ D\'ACTIVATION (À TRANSMETTRE AU CLIENT OU METTRE DANS license.key) ---');
    console.log(`\n${licenseKey}\n`);
    console.log('------------------------------------------------------');
    // Offer to save directly to a license.key file
    const save = await ask('\nVoulez-vous enregistrer cette clé dans un fichier license.key ? (o/n) : ');
    if (save.toLowerCase() === 'o' || save.toLowerCase() === 'y' || save === '') {
        const outputPath = path_1.default.join(process.cwd(), 'license.key');
        fs_1.default.writeFileSync(outputPath, licenseKey, 'utf8');
        console.log(`✅ Fichier créé : ${outputPath}`);
    }
    rl.close();
}
main().catch((err) => {
    console.error('Erreur lors de la génération :', err);
    rl.close();
});
