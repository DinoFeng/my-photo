import { spawn } from 'child_process'
import { createConnection } from 'net'

const services = [
  {
    name: 'worker',
    color: '\x1b[32m', // green
    cwd: 'worker',
    cmd: 'pnpm',
    args: ['dev'],
    port: parseInt(process.env.WS_HUB_PORT || '3001', 10),
  },
  {
    name: 'api',
    color: '\x1b[34m', // blue
    cwd: 'backend',
    cmd: 'pnpm',
    args: ['dev'],
    port: parseInt(process.env.PORT || '3000', 10),
  },
  {
    name: 'web',
    color: '\x1b[36m', // cyan
    cwd: 'frontend',
    cmd: 'pnpm',
    args: ['dev'],
    port: parseInt(process.env.VITE_PORT || '5173', 10),
  },
]

const RESET = '\x1b[0m'
const running = new Map()

function prefix(name, color) {
  const time = new Date().toISOString().substring(11, 19)
  return `${color}[${time}] [${name}]${RESET} `
}

function waitForPort(port, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    let attempts = 0

    function tryConnect() {
      attempts++
      const socket = createConnection({ port, host: '127.0.0.1' }, () => {
        socket.destroy()
        resolve(true)
      })
      socket.on('error', () => {
        socket.destroy()
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for port ${port} after ${attempts} attempts`))
          return
        }
        setTimeout(tryConnect, 300)
      })
    }

    tryConnect()
  })
}

function spawnService({ name, color, cwd, cmd, args }) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n')
    for (const line of lines) {
      if (line.trim() === '') continue
      process.stdout.write(prefix(name, color) + line + '\n')
    }
  })

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n')
    for (const line of lines) {
      if (line.trim() === '') continue
      process.stderr.write(prefix(name, color) + line + '\n')
    }
  })

  child.on('exit', (code, signal) => {
    process.stderr.write(
      prefix(name, color) + `exited (code=${code}, signal=${signal}) — shutting down others\n`
    )
    shutdown(code ?? 1)
  })

  child.on('error', (err) => {
    process.stderr.write(prefix(name, color) + `spawn error: ${err.message}\n`)
    shutdown(1)
  })

  running.set(name, child)
  return child
}

function shutdown(exitCode) {
  for (const [name, child] of running) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' })
      } else {
        child.kill('SIGTERM')
      }
    } catch {
      // ignore
    }
    running.delete(name)
  }
  setTimeout(() => process.exit(exitCode), 200)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

async function main() {
  for (const svc of services) {
    process.stdout.write(prefix(svc.name, svc.color) + `starting...\n`)
    spawnService(svc)

    try {
      await waitForPort(svc.port)
      process.stdout.write(
        prefix(svc.name, svc.color) + `ready on port ${svc.port}, starting next\n`
      )
    } catch (err) {
      process.stderr.write(prefix(svc.name, svc.color) + `${err.message}\n`)
      shutdown(1)
      return
    }
  }

  process.stdout.write(`\x1b[35mAll services ready\x1b[0m\n`)
}

main().catch((err) => {
  console.error(err)
  shutdown(1)
})