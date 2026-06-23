import WebSocket from 'ws'
import type { AnyWsMessage, NotifyMessage } from '@my-photo/shared'
import { appLogger } from '@my-photo/shared'

type ReadyCallback = () => void
type NotifyCallback = (message: NotifyMessage) => void

export class WsClient {
  private ws: WebSocket | null = null
  private onReadyCallbacks: ReadyCallback[] = []
  private onNotifyCallbacks: NotifyCallback[] = []
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isRegistered = false
  private log = appLogger

  private readonly initialDelay = 1000
  private readonly maxDelay = 30000
  private readonly multiplier = 2

  constructor(private url: string, private clientId: string) {}

  onReady(cb: ReadyCallback): void {
    this.onReadyCallbacks.push(cb)
  }

  onNotify(cb: NotifyCallback): void {
    this.onNotifyCallbacks.push(cb)
  }

  connect(): void {
    if (this.ws) {
      this.ws.close()
    }

    this.log.info('连接 WS Hub', { url: this.url, clientId: this.clientId })
    this.ws = new WebSocket(this.url)

    this.ws.on('open', () => {
      this.log.info('WS 连接建立，发送注册')
      this.ws!.send(JSON.stringify({
        type: 'system',
        event: 'register',
        clientId: this.clientId
      }))
    })

    this.ws.on('message', (raw: Buffer) => {
      let message: AnyWsMessage
      try {
        message = JSON.parse(raw.toString())
      } catch {
        this.log.warn('收到无效 JSON 消息')
        return
      }

      if (message.type === 'system' && message.event === 'registered') {
        this.isRegistered = true
        this.reconnectAttempt = 0
        this.log.info('WS 注册成功')
        return
      }

      if (message.type === 'system' && message.event === 'ready') {
        this.log.info('收到 Hub ready 信号')
        for (const cb of this.onReadyCallbacks) {
          cb()
        }
        return
      }

      if (message.type === 'notify') {
        for (const cb of this.onNotifyCallbacks) {
          cb(message as NotifyMessage)
        }
        return
      }
    })

    this.ws.on('close', () => {
      this.log.warn('WS 连接断开')
      this.isRegistered = false
      this.scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      this.log.exception('WS 连接错误', err instanceof Error ? err : undefined)
      this.ws?.close()
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const delay = Math.min(
      this.initialDelay * Math.pow(this.multiplier, this.reconnectAttempt),
      this.maxDelay
    )
    this.reconnectAttempt += 1

    this.log.info('WS 重连', { attempt: this.reconnectAttempt, delay })
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  get connected(): boolean {
    return this.isRegistered
  }
}