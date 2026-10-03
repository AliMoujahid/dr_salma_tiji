import { Router, Request, Response } from 'express';
import { liveSyncService } from '../services/liveSyncService';

const router = Router();

// SSE Live stream endpoint
router.get('/live', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  liveSyncService.addClient(res);
});

// Status endpoint
router.get('/status', (req: Request, res: Response) => {
  res.json({
    activeConnections: liveSyncService.getConnectedClientsCount(),
  });
});

export default router;
