import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { drizzle, sql } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';

const DATA_DIR = path.join(process.cwd(), 'data');

@Injectable()
export class DatabaseService {
  private client: ReturnType<typeof createClient>;
  private db: ReturnType<typeof drizzle<typeof schema>>;

  getDb() {
    if (!this.db) {
      this.initClient();
    }
    return this.db;
  }

  private initClient() {
    this.client = createClient({
      url: process.env.DATABASE_URL || 'file:./data/db.sqlite',
    });
    this.db = drizzle(this.client, { schema });
  }

  async ensureReady() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    this.initClient();

    const db = this.db;

    await db.run(sql`PRAGMA journal_mode = WAL`);
    await db.run(sql`PRAGMA busy_timeout = 5000`);

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
    `);

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
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS setting (
        id TEXT PRIMARY KEY NOT NULL,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_status ON media(status)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_date_taken ON media(date_taken)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_file_type ON media(file_type)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_source_path ON media(source_path)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_media_filepath ON media(filepath)`);

    console.log('Database ready');
  }
}