import { sql, count, eq } from 'drizzle-orm'
import * as fs from 'fs'
import { db, config, appLogger, media, user as userTable, session as sessionTable } from '@my-photo/shared'
import { hashPassword, generateRandomId } from '../utils/securityUtils'

const log = appLogger

const DATA_DIR = config.DATA_DIR

const ALL_TABLES = ['media', 'scan_checkpoint', 'setting', 'user', 'session', 'album', 'album_media', 'album_share'] as const

export async function ensureDatabaseReady(): Promise<void> {
  log.info('Starting database initialization...')

  fs.mkdirSync(DATA_DIR, { recursive: true })
  log.info('Data directory ready', { dataDir: DATA_DIR })

  await db.run(sql`PRAGMA journal_mode = WAL`)
  await db.run(sql`PRAGMA busy_timeout = 5000`)
  log.info('SQLite PRAGMA set: WAL mode, busy_timeout=5000')

  const existingResult = await db.all<{ name: string }>(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf%' ORDER BY name`
  )
  const existingTables = new Set(existingResult.map((r) => r.name))

  for (const tableName of ALL_TABLES) {
    if (existingTables.has(tableName)) {
      log.debug('Table already exists', { tableName })
    } else {
      log.info('Table will be created', { tableName })
    }
  }

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY NOT NULL,
      source_path TEXT NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      hash TEXT,
      width INTEGER,
      height INTEGER,
      duration REAL,
      make TEXT,
      model TEXT,
      date_taken TEXT,
      file_birthtime TEXT,
      file_mtime TEXT,
      effective_time TEXT,
      latitude REAL,
      longitude REAL,
      metadata TEXT,
      thumbnail_path TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS scan_checkpoint (
      id TEXT PRIMARY KEY NOT NULL,
      path TEXT UNIQUE NOT NULL,
      is_root INTEGER DEFAULT 0,
      last_scanned_mtime INTEGER,
      last_scanned_file TEXT,
      status TEXT DEFAULT 'idle',
      progress REAL DEFAULT 0,
      total_files INTEGER DEFAULT 0,
      scanned_files INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS setting (
      id TEXT PRIMARY KEY NOT NULL,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // === 相册功能新增表 ===
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT,
      password_hash TEXT,
      display_name TEXT NOT NULL,
      avatar_emoji TEXT NOT NULL DEFAULT '👤',
      invite_code TEXT UNIQUE,
      is_admin INTEGER NOT NULL DEFAULT 0,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  // 兼容旧数据库：如果列不存在则添加
  await db.run(sql`ALTER TABLE user ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`).catch(() => {})

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS album (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cover_media_id TEXT,
      visibility TEXT NOT NULL DEFAULT 'private',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS album_media (
      album_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      added_at TEXT NOT NULL,
      PRIMARY KEY (album_id, media_id)
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS album_share (
      id TEXT PRIMARY KEY NOT NULL,
      album_id TEXT NOT NULL,
      share_token TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT
    )
  `)

  log.info('Database initialization complete')

  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_status ON media(status)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_date_taken ON media(date_taken)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_file_type ON media(file_type)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_source_path ON media(source_path)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_filepath ON media(filepath)`)

  // 相册功能新增索引
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_user_status ON user(status)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_session_expires_at ON session(expires_at)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_album_owner_id ON album(owner_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_album_visibility ON album(visibility)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_album_created_at ON album(created_at)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_album_media_album_id ON album_media(album_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_album_media_media_id ON album_media(media_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_album_share_album_id ON album_share(album_id)`)
  log.info('Database indexes ready')

  // === Admin 初始化逻辑 ===
  await ensureAdminUser()
}

async function ensureAdminUser() {
  const initUsername = process.env.INIT_USERNAME
  const initPassword = process.env.INIT_PASSWORD

  if (!initUsername || !initPassword) {
    log.warn('==================================================')
    log.warn('未配置 INIT_USERNAME 和 INIT_PASSWORD 环境变量')
    log.warn('请在启动容器时设置：')
    log.warn('  docker run -e INIT_USERNAME=xxx -e INIT_PASSWORD=xxx ...')
    log.warn('==================================================')
    return
  }

  // 1. 查数据库中 is_admin=1 的用户
  const adminUsers = await db
    .select({ username: userTable.username })
    .from(userTable)
    .where(eq(userTable.isAdmin, true))

  if (adminUsers.length > 0) {
    // 已有 Admin，用户名必须等于 INIT_USERNAME，否则报错
    if (adminUsers[0].username !== initUsername) {
      log.error('==================================================')
      log.error('配置错误：数据库中 Admin 用户的用户名与 INIT_USERNAME 不一致')
      log.error('  数据库中 Admin 用户名:', { username: adminUsers[0].username })
      log.error('  INIT_USERNAME 配置:', { init: initUsername })
      log.error('请删除数据库中的 Admin 用户后重启，或修正 INIT_USERNAME 配置')
      log.error('==================================================')
      process.exit(1)
    }
    log.info('Admin 用户已存在，跳过初始化', { username: initUsername })
    return
  }

  // 2. 没有 is_admin=1 的用户，但可能有 username=INIT_USERNAME 的普通用户 → 这是异常状态
  const existingByName = await db
    .select({ isAdmin: userTable.isAdmin })
    .from(userTable)
    .where(eq(userTable.username, initUsername))
    .limit(1)

  if (existingByName.length > 0) {
    log.error('==================================================')
    log.error('配置错误：数据库中已存在 username=INIT_USERNAME 的用户，但 is_admin=0（不是管理员）')
    log.error('  INIT_USERNAME 配置:', { init: initUsername })
    log.error('请删除该用户或手动将其 is_admin 设为 1，然后重启')
    log.error('==================================================')
    process.exit(1)
  }

  // 3. 没有冲突 → 用环境变量创建 Admin
  const now = new Date().toISOString()
  const userId = generateRandomId()
  const passwordHash = hashPassword(initPassword)

  // 确保没有残留的 session
  await db.delete(sessionTable)

  await db.insert(userTable).values({
    id: userId,
    username: initUsername,
    passwordHash,
    displayName: 'Admin',
    avatarEmoji: '👨',
    isAdmin: true,
    mustChangePassword: true,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  log.info('Admin 用户已创建')
  log.info('  用户名:', { username: initUsername })
  log.info('  must_change_password: true → 首次登录后强制改密')
}