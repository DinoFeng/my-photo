import { Router, Request, Response } from 'express';
import { appLogger } from '@my-photo/shared';

const log = appLogger

const router: Router = Router();

router.get('/status', async (_req: Request, res: Response) => {
  res.json({
    message: 'Queue status now managed by Processing Worker. Check worker logs for details.',
    status: 'moved_to_worker'
  });
});

export default router;