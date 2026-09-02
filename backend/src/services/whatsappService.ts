import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
// @ts-ignore
import qrcodeTerminal from 'qrcode-terminal';
import path from 'path';
import QRCode from 'qrcode';
import fs from 'fs';

export interface WhatsAppStatus {
  connected: boolean;
  status: 'INITIALIZING' | 'QR_READY' | 'AUTHENTICATED' | 'CONNECTED' | 'DISCONNECTED';
  qrCode?: string | null;
  qrCodeUrl?: string | null;
  phoneNumber?: string | null;
  error?: string | null;
}

const getBrowserExecutablePath = (): string | undefined => {
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

  const possiblePaths = [
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    // Google Chrome
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    // Microsoft Edge (Pre-installed on all Windows 10 & 11 PCs)
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    // Brave
    path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    path.join(programFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {
      // ignore
    }
  }
  return undefined;
};

class WhatsAppService {
  private client: Client | null = null;
  private qrCode: string | null = null;
  private qrCodeDataUrl: string | null = null;
  private status: 'INITIALIZING' | 'QR_READY' | 'AUTHENTICATED' | 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
  private connectedNumber: string | null = null;
  private lastError: string | null = null;
  private isInitializing = false;

  constructor() {
    // Session persistent storage path
  }

  /**
   * Helper to safely remove session folder on Windows despite file locks
   */
  private async cleanSessionFolder(): Promise<void> {
    const authPath = path.join(process.cwd(), '.wwebjs_auth');
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true, force: true });
          console.log('[WhatsApp] Dossier session .wwebjs_auth nettoyé avec succès.');
        }
        break;
      } catch (err: any) {
        console.warn(`[WhatsApp] Nettoyage session tentative ${attempt + 1} (${err.message}). Attente...`);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  }

  /**
   * Initialize WhatsApp Web client headless session
   */
  public async initClient(forceReset = false) {
    if (forceReset) {
      await this.logout();
    }

    if (this.isInitializing) {
      console.log('WhatsApp Web initialisation déjà en cours...');
      return;
    }

    if (this.client && this.status === 'CONNECTED') {
      console.log('WhatsApp Web est déjà connecté.');
      return;
    }

    this.isInitializing = true;
    this.status = 'INITIALIZING';
    this.lastError = null;
    this.qrCode = null;
    this.qrCodeDataUrl = null;

    try {
      console.log('Démarrage de WhatsApp Web (LocalAuth)...');
      const browserPath = getBrowserExecutablePath();
      if (browserPath) {
        console.log(`Navigateur détecté pour WhatsApp : ${browserPath}`);
      }

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: path.join(process.cwd(), '.wwebjs_auth'),
        }),
        puppeteer: {
          headless: true,
          executablePath: browserPath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        },
      });

      // Event: QR Code generated
      this.client.on('qr', async (qr) => {
        this.qrCode = qr;
        this.status = 'QR_READY';
        this.isInitializing = false;
        try {
          this.qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
        } catch (err: any) {
          console.error('Failed to generate local QR code URL:', err.message);
          this.qrCodeDataUrl = null;
        }
        console.log('\n===============================================================');
        console.log(' 📱 SCANNEZ CE QR CODE AVEC WHATSAPP (CABINET DENTAIRE)');
        console.log('===============================================================\n');
        qrcodeTerminal.generate(qr, { small: true });
      });

      // Event: Authenticated successfully
      this.client.on('authenticated', () => {
        this.status = 'AUTHENTICATED';
        this.qrCode = null;
        this.qrCodeDataUrl = null;
        console.log('✅ WhatsApp Web Authentifié avec succès !');
      });

      // Event: Ready to send messages
      this.client.on('ready', async () => {
        this.status = 'CONNECTED';
        this.qrCode = null;
        this.qrCodeDataUrl = null;
        this.isInitializing = false;
        try {
          const info = this.client?.info;
          this.connectedNumber = info?.wid?.user || 'Cabinet';
        } catch {
          this.connectedNumber = 'Cabinet';
        }
        console.log(`🚀 WhatsApp Web prêt ! Connecté sous le numéro : ${this.connectedNumber}`);
      });

      // Event: Disconnected / Logged out
      this.client.on('disconnected', (reason) => {
        console.log('❌ WhatsApp Web déconnecté :', reason);
        this.status = 'DISCONNECTED';
        this.connectedNumber = null;
        this.qrCode = null;
        this.qrCodeDataUrl = null;
        this.isInitializing = false;
        this.client = null;
      });

      // Event: Auth failure
      this.client.on('auth_failure', (msg) => {
        console.error('❌ Échec de l\'authentification WhatsApp Web :', msg);
        this.lastError = msg;
        this.status = 'DISCONNECTED';
        this.qrCodeDataUrl = null;
        this.isInitializing = false;
      });

      this.client.initialize().catch((err) => {
        console.error('Erreur lors de l\'initialisation de WhatsApp Web :', err.message);
        this.lastError = err.message;
        this.status = 'DISCONNECTED';
        this.isInitializing = false;
      });
    } catch (err: any) {
      console.error('Erreur WhatsApp Service :', err.message);
      this.lastError = err.message;
      this.status = 'DISCONNECTED';
      this.isInitializing = false;
    }
  }

  /**
   * Format phone numbers (e.g. +212 6 89 77 32 55 or 0689773255 -> 212654231076@c.us)
   */
  public formatChatId(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '212' + clean.slice(1);
    }
    if (!clean.endsWith('@c.us')) {
      clean = `${clean}@c.us`;
    }
    return clean;
  }

  /**
   * Send WhatsApp message to recipient phone number
   */
  public async sendMessage(phone: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (this.status !== 'CONNECTED' || !this.client) {
      return {
        success: false,
        error: `WhatsApp Web n'est pas encore connecté. Statut actuel : ${this.status}`,
      };
    }

    try {
      const chatId = this.formatChatId(phone);
      const message = await this.client.sendMessage(chatId, text);
      return {
        success: true,
        messageId: message.id.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Échec de l\'envoi du message WhatsApp',
      };
    }
  }

  /**
   * Send WhatsApp Media / Document attachment (PDFs, Images, Radios, Invoices)
   */
  public async sendMedia(
    phone: string,
    mediaInput: string | { mimetype: string; data: string; filename?: string },
    caption?: string,
    customFilename?: string,
    customMimetype?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (this.status !== 'CONNECTED' || !this.client) {
      return {
        success: false,
        error: `WhatsApp Web n'est pas encore connecté. Statut actuel : ${this.status}`,
      };
    }

    try {
      const chatId = this.formatChatId(phone);
      let media: MessageMedia;

      if (typeof mediaInput === 'string') {
        if (!fs.existsSync(mediaInput)) {
          return {
            success: false,
            error: `Fichier introuvable sur le serveur : ${mediaInput}`,
          };
        }

        const resolvedFilename = customFilename || path.basename(mediaInput);
        let resolvedMime = customMimetype;
        if (!resolvedMime) {
          const ext = path.extname(resolvedFilename).toLowerCase();
          if (ext === '.pdf') resolvedMime = 'application/pdf';
          else if (ext === '.png') resolvedMime = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') resolvedMime = 'image/jpeg';
          else if (ext === '.webp') resolvedMime = 'image/webp';
          else if (ext === '.docx') resolvedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (ext === '.xlsx') resolvedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          else resolvedMime = 'application/octet-stream';
        }

        const fileBuffer = fs.readFileSync(mediaInput);
        const base64Data = fileBuffer.toString('base64');
        media = new MessageMedia(resolvedMime, base64Data, resolvedFilename);
      } else {
        media = new MessageMedia(mediaInput.mimetype, mediaInput.data, mediaInput.filename || customFilename || 'document.pdf');
      }

      const message = await this.client.sendMessage(chatId, media, {
        caption: caption || undefined,
        sendMediaAsDocument: true,
      });

      return {
        success: true,
        messageId: message.id.id,
      };
    } catch (err: any) {
      console.error('[WhatsApp] sendMedia error:', err);
      return {
        success: false,
        error: err.message || 'Échec de l\'envoi du document WhatsApp',
      };
    }
  }

  /**
   * Log out from WhatsApp Web session and clear credentials
   */
  public async logout(): Promise<void> {
    this.status = 'DISCONNECTED';
    this.connectedNumber = null;
    this.qrCode = null;
    this.qrCodeDataUrl = null;
    this.isInitializing = false;

    if (this.client) {
      try {
        await Promise.race([
          this.client.logout().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 2500)),
        ]);
      } catch (e) {
        // ignore
      }

      try {
        await Promise.race([
          this.client.destroy().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 2500)),
        ]);
      } catch (e) {
        // ignore
      }
      this.client = null;
    }

    // Wait a brief moment for Windows file locks to release
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Force delete session folder with retry
    await this.cleanSessionFolder();
  }

  /**
   * Force reset session and restart client immediately for new QR Code
   */
  public async forceResetSession(): Promise<WhatsAppStatus> {
    console.log('[WhatsApp] Réinitialisation forcée de la session demandée...');
    await this.logout();
    
    // Asynchronously launch new client
    setTimeout(() => {
      this.initClient(false).catch((err) => {
        console.error('[WhatsApp] Erreur après reset session:', err);
      });
    }, 400);

    return this.getStatus();
  }

  public getStatus(): WhatsAppStatus {
    return {
      connected: this.status === 'CONNECTED',
      status: this.status,
      qrCode: this.qrCode,
      qrCodeUrl: this.qrCodeDataUrl,
      phoneNumber: this.connectedNumber,
      error: this.lastError,
    };
  }
}

export const whatsappService = new WhatsAppService();

