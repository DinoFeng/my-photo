import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  sourcePath: text('source_path').notNull(),
  filename: text('filename').notNull(),
  filepath: text('filepath').notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: text('file_type').notNull(),
  hash: text('hash'),
  width: integer('width'),
  height: integer('height'),
  duration: real('duration'),
  make: text('make'),
  model: text('model'),
  dateTaken: text('date_taken'),
  fileBirthtime: text('file_birthtime'),
  fileMtime: text('file_mtime'),
  effectiveTime: text('effective_time'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  metadata: text('metadata'),
  thumbnailPath: text('thumbnail_path'),
  status: text('status').default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const setting = sqliteTable('setting', {
  id: text('id').primaryKey(),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const scanCheckpoint = sqliteTable('scan_checkpoint', {
  id: text('id').primaryKey(),
  path: text('path').unique().notNull(),
  isRoot: integer('is_root', { mode: 'boolean' }).default(false),
  lastScannedMtime: integer('last_scanned_mtime'),
  lastScannedFile: text('last_scanned_file'),
  status: text('status').default('idle'),
  progress: real('progress').default(0),
  totalFiles: integer('total_files').default(0),
  scannedFiles: integer('scanned_files').default(0),
  errorCount: integer('error_count').default(0),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

// === 相册功能新增表 ===

// 用户表（管理员 + 家庭成员）
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  username: text('username'),
  passwordHash: text('password_hash'),
  displayName: text('display_name').notNull(),
  avatarEmoji: text('avatar_emoji').notNull().default('👤'),
  inviteCode: text('invite_code').unique(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// 用户登录会话表
export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
})

// 相册表
export const album = sqliteTable('album', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  coverMediaId: text('cover_media_id'),
  visibility: text('visibility').notNull().default('private'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// 相册-照片关联表（多对多）
export const albumMedia = sqliteTable('album_media', {
  albumId: text('album_id').notNull(),
  mediaId: text('media_id').notNull(),
  addedAt: text('added_at').notNull(),
})

// 相册分享记录表
export const albumShare = sqliteTable('album_share', {
  id: text('id').primaryKey(),
  albumId: text('album_id').notNull(),
  shareToken: text('share_token').unique().notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at'),
})