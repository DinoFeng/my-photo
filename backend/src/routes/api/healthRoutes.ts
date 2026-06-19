import { Router } from 'express'

const router: Router = Router()

router.get('/health', (req, res) => {
  if (req.app.locals.isReady) {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  } else {
    res.status(503).json({ status: 'starting', timestamp: new Date().toISOString() })
  }
})

export default router