export { db, media, scanCheckpoint, setting, user, session, album, albumMedia, albumShare } from './db/index'
export type { ScanPayload, PublishFn, QueueConfig, SubscriberQueueConfig, Handler, HandlerMap, QueueHandlerMap } from './types/fanout'
export type { UpsertResult } from './types/media'
export type { WsMessage, NotifyMessage, SystemMessage, RouteMessage, RouteResponseMessage, AnyWsMessage, WsMessageType, NotifyEvent, SystemEvent } from './types/messages'
export { appLogger, accessLogger, getLogger, createLogger } from './utils/logging'
export type { LoggerWithException, LoggingConfig } from './utils/logging'
export { AppEventBus, DB_READY } from './utils/eventBus'
export { config, resolveMediaPath, toMediaRelativePath } from './config'

// === 相册功能：新类型定义 ===
export interface AlbumUser {
  id: string
  username: string | null
  displayName: string
  avatarEmoji: string
  inviteCode: string | null
  isAdmin: boolean
  status: string
  createdAt: string
  updatedAt: string
}

export interface Album {
  id: string
  ownerId: string
  name: string
  description: string | null
  coverMediaId: string | null
  visibility: 'private' | 'all_users'
  sortOrder: number
  createdAt: string
  updatedAt: string
  mediaCount?: number
  ownerName?: string
}

export interface AlbumShare {
  id: string
  albumId: string
  shareToken: string
  createdBy: string
  createdAt: string
  expiresAt: string | null
}