import { Writable } from 'stream'

const LEVELS: Record<number, string> = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL',
}

const COLORS: Record<string, string> = {
  DEBUG: '\x1b[36m',
  INFO: '\x1b[32m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m',
  FATAL: '\x1b[95m',
  RESET: '\x1b[0m',
}

function formatTime(epoch: number): string {
  const d = new Date(epoch)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}.${ms}`
}

const PINO_BUILTIN_KEYS = new Set(['level', 'time', 'pid', 'hostname', 'name', 'msg', 'v', 'caller', 'err'])

export function formatLogLine(obj: any): string {
  const time = formatTime(obj.time)
  const name = obj.name || 'app'
  const pid = obj.pid
  const level = LEVELS[obj.level] || 'INFO'
  const msg = obj.msg

  let caller = ''
  if (obj.caller) {
    const lastColon = obj.caller.lastIndexOf(':')
    const filePath = obj.caller.substring(0, lastColon)
    const line = obj.caller.substring(lastColon + 1) || '?'
    const file = filePath.replace(/\\/g, '/').split('/').pop() || filePath
    caller = `${file}[line:${line}]`
  }

  const extra = Object.keys(obj)
    .filter((k) => !PINO_BUILTIN_KEYS.has(k))
    .map((k) => `${k}=${JSON.stringify(obj[k])}`)
    .join(' ')

  let errStack = ''
  if (obj.err) {
    const errType = obj.err.type || 'Error'
    const errMsg = obj.err.message || ''
    const stack = obj.err.stack || ''
    errStack = `\n  ${errType}: ${errMsg}`
    if (stack) {
      const stackLines = stack.split('\n')
      for (let i = 1; i < stackLines.length; i++) {
        errStack += `\n    ${stackLines[i].trim()}`
      }
    }
  }

  const color = COLORS[level] || ''
  const reset = color ? COLORS.RESET : ''

  return `${color}${time} - ${name} - pid:${pid} - ${caller} - ${level}: ${msg}${extra ? ' ' + extra : ''}${errStack}${reset}`
}

export function createConsoleStream(): Writable {
  let leftover = ''

  return new Writable({
    write(chunk: Buffer, _encoding: string, callback: () => void) {
      const text = leftover + chunk.toString('utf-8')
      const lines = text.split('\n')
      leftover = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line)
          ;(process as any)._rawDebug(formatLogLine(obj))
        } catch {
          ;(process as any)._rawDebug(line)
        }
      }

      callback()
    },

    final(callback: () => void) {
      if (leftover) {
        try {
          const obj = JSON.parse(leftover)
          ;(process as any)._rawDebug(formatLogLine(obj))
        } catch {
          ;(process as any)._rawDebug(leftover)
        }
      }
      callback()
    },
  })
}