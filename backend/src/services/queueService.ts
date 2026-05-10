import { startScan } from './scanService'
import { processImport } from './importService'
import { exportMedia } from './exportService'
import path from 'path'

let queue: any = null

async function initQueue() {
  const { QueueManager } = await import('queue-manager-pro')
  
  interface QueueHandlers {
    scan: (payload: { sourceDirectoryId: string }) => Promise<void>
    import: (payload: { importPath: string; sourceDirectoryId: string }) => Promise<void>
    export: (payload: { mediaIds: string[]; exportPath: string; organizePattern: string }) => Promise<void>
  }

  queue = QueueManager.getInstance({
    backend: { 
      type: 'file', 
      filePath: path.join(__dirname, '../../data/tasks.json') 
    },
    maxRetries: 3,
    delay: 1000
  })

  queue.register('scan', async (payload: { sourceDirectoryId: string }) => {
    await startScan(payload.sourceDirectoryId)
  })

  queue.register('import', async (payload: { importPath: string; sourceDirectoryId: string }) => {
    await processImport(payload.importPath, payload.sourceDirectoryId)
  })

  queue.register('export', async (payload: { mediaIds: string[]; exportPath: string; organizePattern: string }) => {
    await exportMedia(payload.mediaIds, payload.exportPath, payload.organizePattern)
  })

  await queue.startWorker(3)
}

export const queueService = {
  enqueue: async (type: 'scan' | 'import' | 'export', payload: Record<string, unknown>): Promise<string> => {
    if (!queue) await initQueue()
    const task = await queue.addTaskToQueue(type, payload)
    return task.id
  },
  getTask: async (id: string) => {
    if (!queue) await initQueue()
    return queue.getTaskById(id)
  },
  getAllTasks: async () => {
    if (!queue) await initQueue()
    return queue.getAllTasks()
  },
  removeTask: async (id: string): Promise<boolean> => {
    if (!queue) await initQueue()
    const numId = parseInt(id, 10)
    if (isNaN(numId)) {
      return false
    }
    const removed = await queue.removeTask(numId)
    return removed !== undefined
  }
}