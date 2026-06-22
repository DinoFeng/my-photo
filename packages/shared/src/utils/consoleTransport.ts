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

export const DEFAULT_FORMAT = '{time} - {name} - pid:{pid} - {file}[line:{line}] - {level}: {msg}{extra}{err}'

interface LogParts {
  time: string
  name: string
  pid: string
  level: string
  msg: string
  file: string
  line: string
  extra: string
  err: string
}

function buildLogParts(obj: any): LogParts {
  const time = formatTime(obj.time)
  const name = obj.name || 'app'
  const pid = String(obj.pid)
  const level = LEVELS[obj.level] || 'INFO'
  const msg = obj.msg

  let file = ''
  let line = ''
  if (obj.caller) {
    const lastColon = obj.caller.lastIndexOf(':')
    const filePath = obj.caller.substring(0, lastColon)
    line = obj.caller.substring(lastColon + 1) || '?'
    file = filePath.replace(/\\/g, '/').split('/').pop() || filePath
  }

  const extra = Object.keys(obj)
    .filter((k) => !PINO_BUILTIN_KEYS.has(k))
    .map((k) => `${k}=${JSON.stringify(obj[k])}`)
    .join(' ')

  let err = ''
  if (obj.err) {
    const errType = obj.err.type || 'Error'
    const errMsg = obj.err.message || ''
    const stack = obj.err.stack || ''
    err = `\n  ${errType}: ${errMsg}`
    if (stack) {
      const stackLines = stack.split('\n')
      for (let i = 1; i < stackLines.length; i++) {
        err += `\n    ${stackLines[i].trim()}`
      }
    }
  }

  return { time, name, pid, level, msg, file, line, extra, err }
}

const TEMPLATE_RE = /\{(time|name|pid|level|msg|file|line|extra|err)\}/g

function applyTemplate(template: string, parts: LogParts): string {
  return template.replace(TEMPLATE_RE, (_, key: keyof LogParts) => parts[key] ?? '')
}

export function formatLogLine(obj: any, format?: string): string {
  const parts = buildLogParts(obj)
  const result = applyTemplate(format || DEFAULT_FORMAT, parts)

  const color = COLORS[parts.level] || ''
  const reset = color ? COLORS.RESET : ''

  return `${color}${result}${reset}`
}

export function createConsoleStream(format?: string): Writable {
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
          ;(process as any)._rawDebug(formatLogLine(obj, format))
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
          ;(process as any)._rawDebug(formatLogLine(obj, format))
        } catch {
          ;(process as any)._rawDebug(leftover)
        }
      }
      callback()
    },
  })
}