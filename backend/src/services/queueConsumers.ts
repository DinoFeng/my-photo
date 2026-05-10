import { messageQueue } from './queueService'
import { startScan } from './scanService'
import { processImport } from './importService'
import { exportMedia } from './exportService'

/**
 * 队列消费者注册模块
 * 
 * 设计原则：
 * 1. 集中管理所有队列消费者
 * 2. 解耦队列服务与业务逻辑
 * 3. 便于维护和扩展
 */

// 注册扫描任务消费者
messageQueue.bindConsumer('scan', async (payload) => {
  await startScan(payload.sourceDirectoryId)
})

// 注册导入任务消费者
messageQueue.bindConsumer('import', async (payload) => {
  await processImport(payload.importPath, payload.sourceDirectoryId)
})

// 注册导出任务消费者
messageQueue.bindConsumer('export', async (payload) => {
  await exportMedia(payload.mediaIds, payload.exportPath, payload.organizePattern)
})