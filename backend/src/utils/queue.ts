import path from 'path'

let queueManager: any = null

class MessageQueue {
  private handlers: Map<string, (payload: any) => Promise<void>> = new Map()

  bindConsumer(queueName: string, handler: (payload: any) => Promise<void>) {
    this.handlers.set(queueName, handler)
  }

  async publish(queueName: string, payload: any): Promise<string> {
    if (!queueManager) await this.initQueueManager()

    const handler = this.handlers.get(queueName)
    if (!handler) {
      throw new Error(`No consumer bound to queue: ${queueName}`)
    }

    const task = await queueManager.addTaskToQueue(queueName, payload)
    return task.id
  }

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

  async getJob(id: string) {
    if (!queueManager) await this.initQueueManager()
    return queueManager.getTaskById(id)
  }

  async getAllJobs() {
    if (!queueManager) await this.initQueueManager()
    return queueManager.getAllTasks()
  }

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

export const messageQueue = new MessageQueue()

export const queue = {
  enqueue: async (type: string, payload: Record<string, unknown>): Promise<string> => {
    return messageQueue.publish(type, payload)
  },

  getTask: async (id: string) => {
    return messageQueue.getJob(id)
  },

  getAllTasks: async () => {
    return messageQueue.getAllJobs()
  },

  removeTask: async (id: string): Promise<boolean> => {
    return messageQueue.removeJob(id)
  },

  bindConsumer: (queueName: string, handler: (payload: any) => Promise<void>) => {
    messageQueue.bindConsumer(queueName, handler)
  }
}