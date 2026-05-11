import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const sourceDirectory = sqliteTable('source_directory', {
  id: text('id').primaryKey(),
  path: text('path').unique().notNull(),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  lastScanned: text('last_scanned'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  sourceDirectoryId: text('source_directory_id').notNull(),
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
  sourceDirectoryId: text('source_directory_id').unique().notNull(),
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