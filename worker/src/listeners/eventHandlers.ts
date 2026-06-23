import { startAllQueues } from '../instances/fanoutQueues'
import { startDirectoryWatchers, scanDirectories } from '../services/startupService'
import { registerQueueHandlers } from './queueHandlers'
import { appLogger } from '@my-photo/shared'
import type { WsHub } from '../utils/wsHub'

export async function startWorker(wsHub: WsHub): Promise<void> {
  const watchersReady = startDirectoryWatchers()

  registerQueueHandlers(wsHub)

  await new Promise<void>((resolve) => {
    wsHub.onReady(async () => {
      appLogger.info('Hub ready, 等待目录监听就绪...')
      await watchersReady
      appLogger.info('启动队列和扫描')
      startAllQueues()
      scanDirectories()
      resolve()
    })
  })

  appLogger.info('Worker startup complete')
}