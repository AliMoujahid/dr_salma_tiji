"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const liveSyncService_1 = require("../services/liveSyncService");
const router = (0, express_1.Router)();
// SSE Live stream endpoint
router.get('/live', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    liveSyncService_1.liveSyncService.addClient(res);
});
// Status endpoint
router.get('/status', (req, res) => {
    res.json({
        activeConnections: liveSyncService_1.liveSyncService.getConnectedClientsCount(),
    });
});
exports.default = router;
