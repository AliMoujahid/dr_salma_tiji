import { Response } from 'express';

export type LiveEventType =
  | 'PATIENTS_CHANGED'
  | 'APPOINTMENTS_CHANGED'
  | 'WAITING_ROOM_CHANGED'
  | 'FINANCIALS_CHANGED'
  | 'DOCUMENTS_CHANGED'
  | 'SETTINGS_CHANGED'
  | 'NOTIFICATIONS_CHANGED';

export interface LiveSyncPayload {
  type: LiveEventType;
  action: 'create' | 'update' | 'delete' | 'archive' | 'favorite' | 'status_change' | 'refresh';
  entityId?: string;
  entityName?: string;
  sourceUser?: string;
  timestamp: number;
  data?: any;
}

class LiveSyncService {
  private clients: Set<Response> = new Set();
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Send keepalive comment every 20 seconds to prevent network timeout on routers & proxies
    this.keepAliveInterval = setInterval(() => {
      this.sendKeepAlive();
    }, 20000);
  }

  public addClient(res: Response): void {
    this.clients.add(res);

    try {
      res.write(`event: connected\ndata: ${JSON.stringify({ message: 'LiveSync connected', clientsCount: this.clients.size })}\n\n`);
    } catch {
      this.clients.delete(res);
    }

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  public removeClient(res: Response): void {
    this.clients.delete(res);
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  private sendKeepAlive(): void {
    for (const client of this.clients) {
      try {
        client.write(': keepalive\n\n');
      } catch {
        this.clients.delete(client);
      }
    }
  }

  public broadcast(type: LiveEventType, action: LiveSyncPayload['action'], details?: Partial<LiveSyncPayload>): void {
    const payload: LiveSyncPayload = {
      type,
      action,
      timestamp: Date.now(),
      ...details,
    };

    const message = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(message);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}

export const liveSyncService = new LiveSyncService();
