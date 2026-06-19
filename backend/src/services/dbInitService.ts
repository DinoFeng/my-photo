import fs from 'fs'
import path from 'path'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { appLogger } from '../utils/logging'

const log = appLogger

const DATA_DIR = path.join(process.cwd(), 'data')

const ALL_TABLES = ['media', 'scan_checkpoint', 'setting'] as const

export async function ensureDatabaseReady(): Promise<void> {
  log.info('Starting database initialization...')

  fs.mkdirSync(DATA_DIR, { recursive: true })
  log.info('Data directory ready', { dataDir: DATA_DIR })

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

  log.info('Database initialization complete')
}