import { Router, Request, Response } from 'express'
import { monitorService } from '../../instances/sse'

const router: Router = Router()

router.post('/internal/notify', (req: Request, res: Response) => {
  const { event, type, payload, error } = req.body
  monitorService.broadcast({
    event,
    data: { type, payload, error },
  })
  res.status(200).json({ ok: true })
})

export default router