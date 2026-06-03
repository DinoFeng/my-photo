import { Router } from 'express';
import { monitorService, mediaUpdateService } from '../instances/sse';
import { getAllMediaForSSE } from '../services/mediaService';

const router: Router = Router();

router.get('/connect', (req, res) => {
  const { clientId, client } = monitorService.setupConnection(res, {});

  // 发送初始连接成功消息
  monitorService.sendEvent(clientId, {
    event: 'connected',
    data: { clientId, timestamp: new Date().toISOString() }
  });

  console.log(`[SSE] Client connected: ${clientId}`);
});

router.get('/media-updates', async (req, res) => {
  const { clientId } = mediaUpdateService.setupConnection(res);

  const sendInitialData = async () => {
    try {
      const allMedia = await getAllMediaForSSE();
      if (allMedia.length > 0) {
        mediaUpdateService.sendEvent(clientId, { event: 'media-list', data: allMedia });
      }
    } catch (error) {
      console.error('Error sending initial media list:', error);
    }
  };

  sendInitialData();

  req.on('close', () => {
    mediaUpdateService.removeClient(clientId);
  });
});

export default router;