import { Router } from 'express';
import { monitorService } from '../instances/sse';

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

export default router;
