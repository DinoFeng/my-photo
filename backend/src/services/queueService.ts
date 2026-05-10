import path from 'path'

let queueManager: any = null

/**
 * 通用消息队列服务（完全解耦业务逻辑）
 * 
 * 设计原则：
 * 1. 不直接依赖任何业务服务
 * 2. 通过依赖注入模式注册消费者
 * 3. 提供通用的队列操作接口
 */
class MessageQueue {
  private handlers: Map<string, (payload: any) => Promise<void>> = new Map()

  /**
   * 绑定消费者到指定队列
   * @param queueName 队列名称
   * @param handler 消息处理函数
   */
  bindConsumer(queueName: string, handler: (payload: any) => Promise<void>) {
    this.handlers.set(queueName, handler)
  }

  /**
   * 发布消息到指定队列（生产者调用）
   * @param queueName 队列名称
   * @param payload 消息内容
   * @returns 任务ID
   */
  async publish(queueName: string, payload: any): Promise<string> {
    if (!queueManager) await this.initQueueManager()

    const handler = this.handlers.get(queueName)
    if (!handler) {
      throw new Error(`No consumer bound to queue: ${queueName}`)
    }

    const task = await queueManager.addTaskToQueue(queueName, payload)
    return task.id
  }

  /**
   * 初始化队列管理器（延迟加载）
   */
  private async initQueueManager() {
    const { QueueManager } = await import('queue-manager-pro')

    queueManager = QueueManager.getInstance({
      backend: {
        type: 'file',
        filePath: path.join(__dirname, '../../data/tasks.json')
      },
      maxRetries: 3,
      delay: 1000
    })

    this.handlers.forEach((handler, queueName) => {
      queueManager.register(queueName, handler)
    })

    await queueManager.startWorker(3)
  }

  /**
   * 获取任务状态
   */
  async getJob(id: string) {
    if (!queueManager) await this.initQueueManager()
    return queueManager.getTaskById(id)
  }

  /**
   * 获取所有任务
   */
  async getAllJobs() {
    if (!queueManager) await this.initQueueManager()
    return queueManager.getAllTasks()
  }

  /**
   * 删除任务
   */
  async removeJob(id: string): Promise<boolean> {
    if (!queueManager) await this.initQueueManager()
    const numId = parseInt(id, 10)
    if (isNaN(numId)) {
      return false
    }
    const removed = await queueManager.removeTask(numId)
    return removed !== undefined
  }
}

// 创建单例实例并导出
export const messageQueue = new MessageQueue()

// 对外暴露的服务接口
export const queueService = {
  /**
   * 发送消息到指定队列
   */
  enqueue: async (type: string, payload: Record<string, unknown>): Promise<string> => {
    return messageQueue.publish(type, payload)
  },

  /**
   * 查询单个任务状态
   */
  getTask: async (id: string) => {
    return messageQueue.getJob(id)
  },

  /**
   * 查询所有任务列表
   */
  getAllTasks: async () => {
    return messageQueue.getAllJobs()
  },

  /**
   * 删除指定任务
   */
  removeTask: async (id: string): Promise<boolean> => {
    return messageQueue.removeJob(id)
  },

  /**
   * 绑定消费者（供外部模块注册）
   */
  bindConsumer: (queueName: string, handler: (payload: any) => Promise<void>) => {
    messageQueue.bindConsumer(queueName, handler)
  }
}