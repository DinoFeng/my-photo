interface QueueTask {
  id: string
  type: string
  payload: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

class QueueService {
  private tasks: Map<string, QueueTask> = new Map()
  private processing: Set<string> = new Set()
  private maxConcurrent = 3

  enqueue(type: string, payload: Record<string, unknown>): string {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const task: QueueTask = {
      id,
      type,
      payload,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    }
    this.tasks.set(id, task)
    this.processNext()
    return id
  }

  private async processNext() {
    if (this.processing.size >= this.maxConcurrent) return

    const pendingTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    if (pendingTasks.length === 0) return

    const task = pendingTasks[0]
    this.processing.add(task.id)
    task.status = 'processing'
    task.startedAt = new Date()

    try {
      switch (task.type) {
        case 'scan':
          await this.processScan(task)
          break
        case 'import':
          await this.processImport(task)
          break
        case 'export':
          await this.processExport(task)
          break
      }
      task.status = 'completed'
      task.progress = 100
      task.completedAt = new Date()
    } catch (err) {
      task.status = 'failed'
      task.error = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      this.processing.delete(task.id)
      this.processNext()
    }
  }

  private async processScan(task: QueueTask) {
    const { sourceDirectoryId } = task.payload as { sourceDirectoryId: string }
    for (let i = 0; i <= 100; i += 10) {
      task.progress = i
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  private async processImport(task: QueueTask) {
    for (let i = 0; i <= 100; i += 5) {
      task.progress = i
      await new Promise(resolve => setTimeout(resolve, 150))
    }
  }

  private async processExport(task: QueueTask) {
    for (let i = 0; i <= 100; i += 5) {
      task.progress = i
      await new Promise(resolve => setTimeout(resolve, 150))
    }
  }

  getTask(id: string): QueueTask | undefined {
    return this.tasks.get(id)
  }

  getAllTasks(): QueueTask[] {
    return Array.from(this.tasks.values())
  }

  removeTask(id: string): boolean {
    return this.tasks.delete(id)
  }
}

export const queueService = new QueueService()