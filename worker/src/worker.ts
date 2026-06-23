import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

import { appLogger } from '@my-photo/shared'
import { WsHub } from './utils/wsHub'
import { recoverQueueTasks } from './services/startupService'
import { startWorker } from './listeners/eventHandlers'

const log = appLogger

const WS_HUB_PORT = parseInt(process.env.WS_HUB_PORT || '3001', 10)

async function main(): Promise<void> {
  log.info('Processing Worker starting...')

  await recoverQueueTasks()

  const wsHub = new WsHub(WS_HUB_PORT)
  wsHub.start()

  await startWorker(wsHub)

  log.info('Processing Worker ready')
}

main().catch((error) => {
  log.exception('Worker startup failed', error instanceof Error ? error : undefined)
  process.exit(1)
})