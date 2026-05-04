import { MigrationInterface, QueryRunner } from "typeorm"

export class InitialMigration1714810000000 implements MigrationInterface {
    name = 'InitialMigration1714810000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "album" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL,
                "type" TEXT NOT NULL DEFAULT 'custom',
                "rule" TEXT,
                "coverPath" TEXT,
                "photoCount" INTEGER NOT NULL DEFAULT 0,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME
            )
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "photo" (
                "id" TEXT PRIMARY KEY,
                "filePath" TEXT NOT NULL,
                "fileName" TEXT NOT NULL,
                "fileHash" TEXT,
                "thumbnailPath" TEXT,
                "exif" TEXT,
                "takenDate" TEXT,
                "fileSize" INTEGER NOT NULL DEFAULT 0,
                "width" INTEGER NOT NULL DEFAULT 0,
                "height" INTEGER NOT NULL DEFAULT 0,
                "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME
            )
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "album_photo" (
                "id" TEXT PRIMARY KEY,
                "albumId" TEXT NOT NULL,
                "photoId" TEXT NOT NULL,
                "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("albumId") REFERENCES "album"("id") ON DELETE CASCADE,
                FOREIGN KEY ("photoId") REFERENCES "photo"("id") ON DELETE CASCADE
            )
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "photo_tag" (
                "id" TEXT PRIMARY KEY,
                "photoId" TEXT NOT NULL,
                "tagName" TEXT NOT NULL,
                "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("photoId") REFERENCES "photo"("id") ON DELETE CASCADE
            )
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "setting" (
                "id" TEXT PRIMARY KEY,
                "photoSourcePath" TEXT,
                "watchPath" TEXT,
                "organizePattern" TEXT NOT NULL DEFAULT '{year}/{month}/{day}',
                "duplicateDetection" TEXT NOT NULL DEFAULT 'hash',
                "thumbnailQuality" TEXT NOT NULL DEFAULT 'medium',
                "remoteAccess" INTEGER NOT NULL DEFAULT 0,
                "remotePort" INTEGER NOT NULL DEFAULT 3000,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "import_task" (
                "id" TEXT PRIMARY KEY,
                "sourcePath" TEXT NOT NULL,
                "targetPath" TEXT,
                "fileName" TEXT NOT NULL,
                "fileHash" TEXT,
                "status" TEXT NOT NULL DEFAULT 'pending',
                "errorMessage" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "completedAt" DATETIME
            )
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_album_photo_albumId" ON "album_photo"("albumId")
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_album_photo_photoId" ON "album_photo"("photoId")
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_photo_tag_photoId" ON "photo_tag"("photoId")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_photo_tag_photoId"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_album_photo_photoId"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_album_photo_albumId"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "import_task"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "setting"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "photo_tag"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "album_photo"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "photo"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "album"`)
    }
}
