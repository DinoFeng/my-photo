import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  sourcePath: text('source_path').notNull(),  // 源目录路径
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
  path: text('path').unique().notNull(),  // 目录路径（唯一）
  isRoot: integer('is_root', { mode: 'boolean' }).default(false),  // 是否顶层目录
  lastScannedMtime: integer('last_scanned_mtime'),  // 上次扫描时的目录 mtime
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

export const taskQueue = sqliteTable('task_queue', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  payload: text('payload').notNull(),
  status: text('status').default('pending'),
  consumerId: text('consumer_id'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  priority: integer('priority').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const queueConfig = sqliteTable('queue_config', {
  name: text('name').primaryKey(),
  consumerCount: integer('consumer_count').default(1),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  pollingInterval: integer('polling_interval').default(1000),
  maxConcurrentTasks: integer('max_concurrent_tasks').default(10),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})