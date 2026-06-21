import { Injectable } from '@nestjs/common';
import { eq, and, like, sql } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service.js';
import { media } from '../../core/database/schema.js';

interface QueryParams {
  page: number;
  limit: number;
  search?: string;
  fileType?: string;
  sourcePath?: string;
}

@Injectable()
export class MediaService {
  constructor(private dbService: DatabaseService) {}

  async getList(params: QueryParams) {
    const db = this.dbService.getDb();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 30));
    const offset = (page - 1) * limit;

    const conditions = [eq(media.status, 'active')];

    if (params.search) {
      conditions.push(like(media.filename, `%${params.search}%`));
    }
    if (params.fileType) {
      conditions.push(eq(media.fileType, params.fileType));
    }
    if (params.sourcePath) {
      conditions.push(eq(media.sourcePath, params.sourcePath));
    }

    const whereClause = and(...conditions);

    const [totalResult, items] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(media).where(whereClause),
      db
        .select()
        .from(media)
        .where(whereClause)
        .orderBy(sql`${media.dateTaken} IS NULL, ${media.dateTaken} DESC, ${media.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}