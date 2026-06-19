import { Router } from 'express';
import { monitorService } from '../../instances/sse';
import { appLogger } from '../../utils/logging';

const router: Router = Router();

router.get('/connect', (req, res) => {
  const { clientId, client } = monitorService.setupConnection(res, {});

  monitorService.sendEvent(clientId, {
    event: 'connected',
    data: { clientId, timestamp: new Date().toISOString() }
  });

  appLogger.info('SSE client connected', { clientId });
});

export default router;