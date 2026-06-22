import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

import { appLogger } from '@my-photo/shared'
import { startWorker } from './listeners/eventHandlers'

const log = appLogger

async function main(): Promise<void> {
  log.info('Processing Worker starting...')

  await startWorker()

  log.info('Processing Worker ready')
}

main().catch((error) => {
  log.exception('Worker startup failed', error instanceof Error ? error : undefined)
  process.exit(1)
})