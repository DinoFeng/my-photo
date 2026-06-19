import { createLogger, appLogger } from '../src/utils/logging'
import type { LoggingConfig } from '../src/utils/logging'

console.log('')
console.log('═══════════════════════════════════════════════════════')
console.log('  方式一：appLogger — 统一日志，所有模块共用')
console.log('═══════════════════════════════════════════════════════')
console.log('')

const log = appLogger

log.info('app 启动', { version: '1.0.0' })
log.debug('数据库连接池初始化', { pool: 10 })
log.info('文件监听已启动')

console.log('')
console.log('═══════════════════════════════════════════════════════')
console.log('  方式二：createLogger(config, name) — 直接传 JSON 配置')
console.log('═══════════════════════════════════════════════════════')
console.log('')

const config: LoggingConfig = {
  handlers: {
    console: { type: 'console', level: 'DEBUG' },
    myFile: { type: 'file', filename: './logs/demo.log', level: 'DEBUG' },
    errorFile: { type: 'file', filename: './logs/error.log', level: 'error' },
  },
  loggers: {
    demo: { level: 'TRACE', handlers: ['console'] },
    demoFile: { level: 'DEBUG', handlers: ['console', 'myFile', 'errorFile'] },
  },
}

const demo = createLogger(config, 'demo')
const demoFile = createLogger(config, 'demoFile')

demo.trace('demo trace 可见，因为配置了 TRACE')
demo.debug('demo debug 可见')
demo.info('demo info 可见')

demoFile.debug('demoFile 同时输出到控制台和文件')

console.log('')
console.log('═══════════════════════════════════════════════════════')
console.log('  运行时 setLevel')
console.log('═══════════════════════════════════════════════════════')
console.log('')

demo.setLevel('warn')
demo.info('被过滤了')
demo.warn('demo 只剩 warn 以上可见')

console.log('')
console.log('═══════════════════════════════════════════════════════')
console.log('  模板格式')
console.log('═══════════════════════════════════════════════════════')
console.log('')

demo.setLevel('info')
demo.info('{key} 模板：端口 {port}', { port: 3000 })
demo.info('{host}:{port} 连接池 {pool}', { host: 'localhost', port: 5432, pool: 10 })
demo.info('hello %s', 'world')
demo.info('%s has %d items', 'user', 42)

console.log('')
console.log('═══════════════════════════════════════════════════════')
console.log('  exception')
console.log('═══════════════════════════════════════════════════════')
console.log('')

const err = new Error('Task processing time exceeded')
demoFile.exception('扫描目录失败', err, { dirPath: 'media/xiuren/85/8553' })

console.log('')

demo.exception('无 error 参数，自动生成调用栈')

console.log('')