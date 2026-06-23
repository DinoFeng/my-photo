import { WebSocketServer, WebSocket } from 'ws'
import type { SystemMessage, AnyWsMessage } from '@my-photo/shared'
import { appLogger } from '@my-photo/shared'

type ReadyCallback = () => void
type MessageCallback = (message: AnyWsMessage, clientId: string) => void

interface ClientInfo {
  ws: WebSocket
  connectedAt: Date
}

export class WsHub {
  private wss: WebSocketServer | null = null
  private clients: Map<string, ClientInfo> = new Map()
  private onReadyCallbacks: ReadyCallback[] = []
  private onMessageCallbacks: MessageCallback[] = []
  private isBackendConnected = false
  private log = appLogger

  constructor(private port: number) {}

  onReady(cb: ReadyCallback): void {
    this.onReadyCallbacks.push(cb)
  }

  onMessage(cb: MessageCallback): void {
    this.onMessageCallbacks.push(cb)
  }

  start(): void {
    this.wss = new WebSocketServer({ port: this.port })
    this.log.info('WS Hub 启动', { port: this.port })

    this.wss.on('connection', (ws: WebSocket) => {
      this.log.info('新 WS 连接')
      let clientId: string | null = null

      ws.on('message', (raw: Buffer) => {
        let message: AnyWsMessage
        try {
          message = JSON.parse(raw.toString())
        } catch {
          this.log.warn('收到无效 JSON 消息，忽略')
          return
        }

        if (message.type === 'system' && message.event === 'register') {
          clientId = (message as SystemMessage).clientId || 'unknown'
          if (this.clients.has(clientId)) {
            this.log.warn('重复 clientId 注册被拒绝', { clientId })
            ws.send(JSON.stringify({
              type: 'system',
              event: 'error',
              message: `Client ID '${clientId}' already registered`
            }))
            ws.close()
            return
          }
          this.clients.set(clientId, { ws, connectedAt: new Date() })
          this.log.info('客户端注册', { clientId })
          ws.send(JSON.stringify({ type: 'system', event: 'registered', clientId }))

          this.broadcast({
            type: 'system',
            event: 'connected',
            clientId
          })

          if (clientId === 'backend') {
            this.isBackendConnected = true
            this.log.info('Backend 已连接，发送 ready 信号')
            this.broadcast({ type: 'system', event: 'ready' })
            for (const cb of this.onReadyCallbacks) {
              cb()
            }
          }
          return
        }

        this.onMessageCallbacks.forEach(cb => cb(message, clientId || 'unknown'))
      })

      ws.on('close', () => {
        this.log.info('WS 连接断开', { clientId })
        if (clientId) {
          this.clients.delete(clientId)
          if (clientId === 'backend') {
            this.isBackendConnected = false
          }
          this.broadcast({ type: 'system', event: 'disconnected', clientId })
        }
      })

      ws.on('error', (err) => {
        this.log.exception('WS 连接错误', err instanceof Error ? err : undefined, { clientId })
      })
    })
  }

  sendToBackend(message: AnyWsMessage): void {
    let sent = false
    this.clients.forEach((info, id) => {
      if (id === 'backend' && info.ws.readyState === WebSocket.OPEN) {
        info.ws.send(JSON.stringify(message))
        sent = true
      }
    })
    if (!sent) {
      this.log.warn('消息无法发送到 Backend，客户端未连接')
    }
  }

  sendToClient(clientId: string, message: AnyWsMessage): void {
    const info = this.clients.get(clientId)
    if (info && info.ws.readyState === WebSocket.OPEN) {
      info.ws.send(JSON.stringify(message))
    } else {
      this.log.warn('消息无法发送到客户端', { clientId })
    }
  }

  broadcast(message: AnyWsMessage): void {
    const payload = JSON.stringify(message)
    this.clients.forEach((info) => {
      if (info.ws.readyState === WebSocket.OPEN) {
        info.ws.send(payload)
      }
    })
  }

  get connectedClients(): string[] {
    return Array.from(this.clients.keys())
  }

  get backendConnected(): boolean {
    return this.isBackendConnected
  }
}