import { eventBus } from '../instances/eventBus'
import { DB_READY } from '../utils/eventBus'
import { startAllQueues } from '../instances/fanoutQueues'
import { startDirectoryWatchers, scanDirectories } from '../services/startupService'
import { registerQueueHandlers } from './queueHandlers'
import { appLogger } from '../utils/logging'

export function registerEventHandlers(): void {
  eventBus.on(DB_READY, async () => {
    await startDirectoryWatchers()
    registerQueueHandlers()
    startAllQueues()
    await scanDirectories()
    appLogger.info('Startup complete')
  })
}