type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private minLevel: LogLevel = 'info'

  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }

  setLevel(level: LogLevel) {
    this.minLevel = level
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, context, error)
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    if (this.levels[level] < this.levels[this.minLevel]) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    }

    this.logs.push(entry)

    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`
    const logMessage = context
      ? `${prefix} ${message} ${JSON.stringify(context)}`
      : `${prefix} ${message}`

    switch (level) {
      case 'debug':
        console.debug(logMessage)
        break
      case 'info':
        console.info(logMessage)
        break
      case 'warn':
        console.warn(logMessage)
        break
      case 'error':
        console.error(logMessage, error)
        break
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level)
    }
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
  }
}

export const logger = new Logger()
