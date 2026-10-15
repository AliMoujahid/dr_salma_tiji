"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveSyncService = void 0;
class LiveSyncService {
    clients = new Set();
    keepAliveInterval = null;
    constructor() {
        // Send keepalive comment every 20 seconds to prevent network timeout on routers & proxies
        this.keepAliveInterval = setInterval(() => {
            this.sendKeepAlive();
        }, 20000);
    }
    addClient(res) {
        this.clients.add(res);
        try {
            res.write(`event: connected\ndata: ${JSON.stringify({ message: 'LiveSync connected', clientsCount: this.clients.size })}\n\n`);
        }
        catch {
            this.clients.delete(res);
        }
        res.on('close', () => {
            this.clients.delete(res);
        });
    }
    removeClient(res) {
        this.clients.delete(res);
    }
    getConnectedClientsCount() {
        return this.clients.size;
    }
    sendKeepAlive() {
        for (const client of this.clients) {
            try {
                client.write(': keepalive\n\n');
            }
            catch {
                this.clients.delete(client);
            }
        }
    }
    broadcast(type, action, details) {
        const payload = {
            type,
            action,
            timestamp: Date.now(),
            ...details,
        };
        const message = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
        for (const client of this.clients) {
            try {
                client.write(message);
            }
            catch {
                this.clients.delete(client);
            }
        }
    }
}
exports.liveSyncService = new LiveSyncService();
