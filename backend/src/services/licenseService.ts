import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Master secret key used to sign and verify licenses (Keep strictly confidential)
const MASTER_SECRET_KEY = process.env.LICENSE_MASTER_SECRET || 'DrSalmaTijini_SecuredDentalApp_MasterKey_2026_x87$kL!';

export interface LicensePayload {
  machineId: string;
  clientName: string;
  type: 'LIFETIME' | 'SUBSCRIPTION' | 'TRIAL';
  validUntil: string; // ISO date string or 'LIFETIME'
  maxChairs?: number;
  issuedAt: string;
}

export interface LicenseStatus {
  active: boolean;
  machineId: string;
  clientName?: string;
  type?: string;
  validUntil?: string;
  daysRemaining?: number;
  message?: string;
}

class LicenseService {
  private cachedMachineId: string | null = null;
  private licenseFilePath: string = path.join(process.cwd(), 'license.key');

  /**
   * Set custom license file path if needed
   */
  public setLicensePath(customPath: string) {
    this.licenseFilePath = customPath;
  }

  /**
   * Generates a unique, deterministic Machine ID based on Windows Hardware/OS parameters
   */
  public getMachineId(): string {
    if (this.cachedMachineId) {
      return this.cachedMachineId;
    }

    let rawIdentifier = '';

    try {
      if (process.platform === 'win32') {
        // 1. Try Windows Registry MachineGuid
        try {
          const regOutput = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
          });
          const match = regOutput.match(/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9-]+)/i);
          if (match && match[1]) {
            rawIdentifier += match[1].trim();
          }
        } catch {
          // Ignore registry error and fallback
        }

        // 2. Try Computer System Product UUID
        try {
          const wmicOutput = execSync('powershell -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
          });
          if (wmicOutput && wmicOutput.trim().length > 5) {
            rawIdentifier += '-' + wmicOutput.trim();
          }
        } catch {
          // Ignore powershell error and fallback
        }
      }
    } catch {
      // Fallback
    }

    // Ultimate fallback if WMI/Registry query failed (e.g. non-windows or restricted environment)
    if (!rawIdentifier || rawIdentifier.trim().length < 5) {
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      let macAddress = '';
      for (const key of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[key] || []) {
          if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
            macAddress = net.mac;
            break;
          }
        }
        if (macAddress) break;
      }
      rawIdentifier = `${os.hostname()}-${os.arch()}-${macAddress || 'DEFAULT-MACHINE'}`;
    }

    // Hash into a clean, formatted Machine Code (e.g. TIJINI-A1B2-C3D4-E5F6)
    const hash = crypto.createHash('sha256').update(rawIdentifier).digest('hex').toUpperCase();
    const formatted = `TIJINI-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;
    
    this.cachedMachineId = formatted;
    return formatted;
  }

  /**
   * Sign a license payload using the Master Secret Key (For Developer Tool)
   */
  public generateLicense(payload: LicensePayload): string {
    const payloadJson = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadJson).toString('base64');
    
    const signature = crypto
      .createHmac('sha256', MASTER_SECRET_KEY)
      .update(payloadBase64)
      .digest('hex');

    return `TIJINI-LIC-${payloadBase64}.${signature}`;
  }

  /**
   * Verify license string or license.key file
   */
  public verifyLicense(licenseString?: string): LicenseStatus {
    const machineId = this.getMachineId();

    // Bypass license checks in development environment or when BYPASS_LICENSE=true
    if (process.env.NODE_ENV !== 'production' || process.env.BYPASS_LICENSE === 'true') {
      return {
        active: true,
        machineId,
        clientName: 'Cabinet Dr. Salma Tijini (Mode Dev)',
        type: 'DEVELOPMENT',
        validUntil: 'LIFETIME',
        daysRemaining: 99999,
        message: 'Licence active (Mode Développement).',
      };
    }

    let rawKey = licenseString;

    // If not provided, try to read from license.key file in root, uploads, or current folder
    if (!rawKey) {
      const searchPaths = [
        this.licenseFilePath,
        path.join(__dirname, '..', '..', 'license.key'),
        path.join(__dirname, '..', 'license.key'),
        path.join(process.cwd(), '..', 'license.key'),
      ];

      for (const p of searchPaths) {
        if (fs.existsSync(p)) {
          try {
            rawKey = fs.readFileSync(p, 'utf8').trim();
            break;
          } catch {
            // Ignore file read error
          }
        }
      }
    }

    if (!rawKey || !rawKey.startsWith('TIJINI-LIC-')) {
      return {
        active: false,
        machineId,
        message: 'Aucune clé de licence valide trouvée sur cette machine.',
      };
    }

    try {
      const parts = rawKey.replace('TIJINI-LIC-', '').split('.');
      if (parts.length !== 2) {
        return {
          active: false,
          machineId,
          message: 'Format de licence corrompu ou invalide.',
        };
      }

      const [payloadBase64, providedSignature] = parts;

      // Verify HMAC Signature
      const expectedSignature = crypto
        .createHmac('sha256', MASTER_SECRET_KEY)
        .update(payloadBase64)
        .digest('hex');

      if (providedSignature !== expectedSignature) {
        return {
          active: false,
          machineId,
          message: 'Signature de licence invalide ou falsifiée.',
        };
      }

      // Decode Payload
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload: LicensePayload = JSON.parse(payloadJson);

      // Verify Machine ID Hardware Lock
      if (payload.machineId !== machineId) {
        return {
          active: false,
          machineId,
          message: 'Cette licence n\'est pas autorisée pour cet ordinateur (Hardware Mismatch).',
        };
      }

      // Verify Expiration Date
      if (payload.validUntil !== 'LIFETIME') {
        const expirationDate = new Date(payload.validUntil);
        const now = new Date();

        if (isNaN(expirationDate.getTime()) || now > expirationDate) {
          return {
            active: false,
            machineId,
            clientName: payload.clientName,
            type: payload.type,
            validUntil: payload.validUntil,
            daysRemaining: 0,
            message: 'La licence a expiré. Veuillez contacter votre administrateur pour renouveler votre abonnement.',
          };
        }

        const diffTime = expirationDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          active: true,
          machineId,
          clientName: payload.clientName,
          type: payload.type,
          validUntil: payload.validUntil,
          daysRemaining,
          message: 'Licence active et vérifiée.',
        };
      }

      return {
        active: true,
        machineId,
        clientName: payload.clientName,
        type: 'LIFETIME',
        validUntil: 'LIFETIME',
        daysRemaining: 99999,
        message: 'Licence perpétuelle active et vérifiée.',
      };
    } catch (err: any) {
      return {
        active: false,
        machineId,
        message: `Erreur lors de la vérification de la licence : ${err.message}`,
      };
    }
  }

  /**
   * Save a newly submitted license key to license.key file
   */
  public activate(licenseKey: string): { success: boolean; status: LicenseStatus } {
    const status = this.verifyLicense(licenseKey.trim());
    if (!status.active) {
      return { success: false, status };
    }

    try {
      fs.writeFileSync(this.licenseFilePath, licenseKey.trim(), 'utf8');
      return { success: true, status };
    } catch (err: any) {
      return {
        success: false,
        status: {
          ...status,
          active: false,
          message: `Impossible d'enregistrer le fichier de licence : ${err.message}`,
        },
      };
    }
  }
}

export const licenseService = new LicenseService();
