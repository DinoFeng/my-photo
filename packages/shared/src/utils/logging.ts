import pino from 'pino'
import type { Logger } from 'pino'
import { readFileSync } from 'fs'
import { resolve, dirname, basename, sep } from 'path'
import { fileURLToPath } from 'url'
import { Transform, Writable } from 'stream'
import { createStream as createRotatingStream } from 'rotating-file-stream'
import { createConsoleStream, formatLogLine, DEFAULT_FORMAT, PINO_BUILTIN_KEYS } from './consoleTransport'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function isPlainObject(val: unknown): boolean {
  return val !== null && typeof val === 'object' && !Array.isArray(val) && Object.getPrototypeOf(val) === Object.prototype
}

const LOG_METHODS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const

function wrapLogger(logger: Logger): Logger {
  return new Proxy(logger, {
    get(target, prop) {
      if (prop === 'child') {
        return function (bindings: Record<string, unknown>) {
          return wrapLogger(target.child(bindings))
        }
      }

      if (prop === 'exception') {
        const fn = function exception(message: string, error?: Error, ...args: any[]) {
          const errorLog = (target as any).error.bind(target)
          const err = error ?? (() => { const e = new Error(message); Error.captureStackTrace(e, fn); return e })()
          const context: Record<string, any> = { err }
          for (const arg of args) {
            if (isPlainObject(arg)) {
              Object.assign(context, arg)
            }
          }
          return errorLog(context, message)
        }
        return fn
      }

      if (prop === 'setLevel') {
        return function (level: string) {
          target.level = level
        }
      }

      if (typeof prop === 'string' && (LOG_METHODS as readonly string[]).includes(prop)) {
        const original = (target as any)[prop].bind(target)
        return function (...args: any[]) {
          if (isPlainObject(args[args.length - 1])) {
            const obj = { ...args.pop() }
            for (const key of Object.keys(obj)) {
              if (PINO_BUILTIN_KEYS.has(key)) {
                const renamed = `_${key}`
                ;(obj as any)[renamed] = (obj as any)[key]
                delete (obj as any)[key]
              }
            }
            const msg = args[0] as string
            if (typeof msg === 'string' && /\{(\w+)\}/.test(msg)) {
              args[0] = msg.replace(/\{(\w+)\}/g, (_, key) => {
                const val = (obj as any)[key]
                if (val !== undefined) {
                  delete (obj as any)[key]
                  return val
                }
                return `{${key}}`
              })
            }
            if (Object.keys(obj).length > 0) {
              return original(obj, ...args)
            }
            return original(...args)
          }
          return original(...args)
        }
      }
      return (target as any)[prop]
    },
  })
}

export interface LoggerWithException extends Logger {
  exception(message: string, error?: Error, ...args: any[]): void
  setLevel(level: string): void
  trace(msg: string, obj?: any, ...args: any[]): void
  debug(msg: string, obj?: any, ...args: any[]): void
  info(msg: string, obj?: any, ...args: any[]): void
  warn(msg: string, obj?: any, ...args: any[]): void
  error(msg: string, obj?: any, ...args: any[]): void
  fatal(msg: string, obj?: any, ...args: any[]): void
}

function getCaller(): string {
  const stack = new Error().stack
  if (!stack) return ''

  const lines = stack.split('\n')
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(/at\s+(?:.*?\s+\()?(.+?):(\d+):\d+\)?$/)
    if (!match) continue

    const filepath = match[1]
    const lineNum = match[2]
    if (filepath.includes('node_modules')) continue
    if (filepath.includes('logging.ts')) continue
    if (filepath.includes('consoleTransport.ts')) continue
    return `${filepath}:${lineNum}`
  }
  return ''
}

export interface RotationConfig {
  size?: string
  interval?: string
  maxFiles?: number
  compress?: boolean | 'gzip'
}

const DEFAULT_ROTATION: RotationConfig = {
  size: '10M',
  interval: '1d',
  maxFiles: 30,
  compress: 'gzip',
}

export interface HandlerConfig {
  type: 'console' | 'file'
  filename?: string
  level: string
  format?: string
  rotation?: boolean | RotationConfig
}

export interface LoggerConfig {
  level: string
  handlers: string[]
}

export interface LoggingConfig {
  format?: string
  handlers: Record<string, HandlerConfig>
  loggers: Record<string, LoggerConfig>
}

function loadConfig(): LoggingConfig {
  const configPath = process.env.LOGGING_CONFIG_PATH
    || resolve(process.cwd(), 'logging.json')
  const raw = readFileSync(configPath, 'utf-8')
  return JSON.parse(raw)
}

const config = loadConfig()

function resolveLevel(name: string, configLevel: string): string {
  const envKey = `LOG_LEVEL_${name.toUpperCase()}`
  if (process.env[envKey]) {
    return process.env[envKey]!.toLowerCase()
  }
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL.toLowerCase()
  }
  return configLevel.toLowerCase()
}

function createFileStream(filepath: string, format?: string, rotation?: boolean | RotationConfig): Writable {
  if (rotation === false) {
    const dest = pino.destination({ dest: filepath, mkdir: true, sync: true }) as unknown as Writable
    return createTransform(dest, format)
  }

  const merged: RotationConfig = typeof rotation === 'object'
    ? { ...DEFAULT_ROTATION, ...rotation }
    : { ...DEFAULT_ROTATION }

  const dir = dirname(filepath)
  const base = basename(filepath)
  const dest = createRotatingStream(base, {
    path: dir.endsWith(sep) ? dir : dir + sep,
    size: merged.size,
    interval: merged.interval,
    maxFiles: merged.maxFiles,
    compress: merged.compress,
  }) as unknown as Writable

  return createTransform(dest, format)
}

function createTransform(dest: Writable, format?: string): Transform {
  let leftover = ''

  const transform = new Transform({
    transform(chunk: Buffer, _encoding: string, callback: () => void) {
      const text = leftover + chunk.toString('utf-8')
      const lines = text.split('\n')
      leftover = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line)
          const formatted = formatLogLine(obj, format)
          const plain = formatted.replace(/\x1b\[[0-9;]*m/g, '')
          this.push(plain + '\n')
        } catch {
          this.push(line + '\n')
        }
      }

      callback()
    },

    final(callback: () => void) {
      if (leftover) {
        try {
          const obj = JSON.parse(leftover)
          const formatted = formatLogLine(obj, format)
          const plain = formatted.replace(/\x1b\[[0-9;]*m/g, '')
          this.push(plain + '\n')
        } catch {
          this.push(leftover + '\n')
        }
      }
      callback()
    },
  })

  transform.pipe(dest)
  return transform
}

function buildLoggerFromConfig(
  loggingConfig: LoggingConfig,
  name: string,
): Logger {
  const loggerConfig = loggingConfig.loggers[name]
  if (!loggerConfig) {
    throw new Error(`Logger "${name}" not found in config`)
  }

  const resolvedLevel = resolveLevel(name, loggerConfig.level)

  const streams = loggerConfig.handlers.map((handlerName) => {
    const handler = loggingConfig.handlers[handlerName]
    if (!handler) {
      throw new Error(`Handler "${handlerName}" not found in config`)
    }

    const resolvedFormat = handler.format ?? loggingConfig.format ?? DEFAULT_FORMAT

    if (handler.type === 'console') {
      return { level: handler.level.toLowerCase(), stream: createConsoleStream(resolvedFormat) }
    }

    if (handler.type === 'file') {
      const dest = resolve(process.cwd(), handler.filename!)
      return { level: handler.level.toLowerCase(), stream: createFileStream(dest, resolvedFormat, handler.rotation) }
    }

    throw new Error(`Unknown handler type: ${handler.type}`)
  })

  const raw = pino(
    { level: resolvedLevel, name, mixin() { return { caller: getCaller() } } },
    pino.multistream(streams),
  )
  return wrapLogger(raw)
}

function buildLogger(name: string): Logger {
  return buildLoggerFromConfig(config, name)
}

export const appLogger = buildLogger('app') as LoggerWithException
export const accessLogger = appLogger

const loggerCache = new Map<string, LoggerWithException>()

export function getLogger(name: string): LoggerWithException {
  if (loggerCache.has(name)) {
    return loggerCache.get(name)!
  }
  const logger = buildLogger(name) as LoggerWithException
  loggerCache.set(name, logger)
  return logger
}

export function createLogger(config: LoggingConfig, name: string): LoggerWithException {
  return buildLoggerFromConfig(config, name) as LoggerWithException
}