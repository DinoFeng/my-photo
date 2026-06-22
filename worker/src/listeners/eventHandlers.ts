import { startAllQueues } from '../instances/fanoutQueues'
import { startDirectoryWatchers, scanDirectories } from '../services/startupService'
import { registerQueueHandlers } from './queueHandlers'
import { appLogger } from '@my-photo/shared'

export async function startWorker(): Promise<void> {
  await startDirectoryWatchers()
  registerQueueHandlers()
  startAllQueues()
  await scanDirectories()
  appLogger.info('Worker startup complete')
}