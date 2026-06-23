export type WsMessageType = 'notify' | 'route' | 'route-response' | 'system'

export type NotifyEvent = 'task-start' | 'task-complete' | 'task-error' | 'scan-progress'

export type SystemEvent = 'register' | 'registered' | 'ready' | 'connected' | 'disconnected' | 'error'

export interface WsMessage {
  type: WsMessageType
}

export interface NotifyMessage extends WsMessage {
  type: 'notify'
  event: NotifyEvent
  queue: string
  payload?: Record<string, unknown>
  error?: string
}

export interface SystemMessage extends WsMessage {
  type: 'system'
  event: SystemEvent
  clientId?: string
  message?: string
}

export interface RouteMessage extends WsMessage {
  type: 'route'
  id: string
  from: string
  to: string
  action: string
  payload?: Record<string, unknown>
}

export interface RouteResponseMessage extends WsMessage {
  type: 'route-response'
  id: string
  from: string
  to: string
  result?: Record<string, unknown>
}

export type AnyWsMessage = NotifyMessage | SystemMessage | RouteMessage | RouteResponseMessage