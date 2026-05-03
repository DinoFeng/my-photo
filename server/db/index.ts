import { DataSource } from 'typeorm'
import Photo from './models/Photo.js'
import Album from './models/Album.js'
import Setting from './models/Setting.js'
import ImportTask from './models/ImportTask.js'
import AlbumPhoto from './models/AlbumPhoto.js'
import PhotoTag from './models/PhotoTag.js'
import { join } from 'path'

const appDataPath = process.env.APP_DATA_PATH || join(process.env.HOME || process.env.USERPROFILE || '.', '.myphoto')

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: join(appDataPath, 'database', 'photos.db'),
  entities: [Photo, Album, Setting, ImportTask, AlbumPhoto, PhotoTag],
  synchronize: true,
  logging: false
})

export async function initializeDatabase() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
      await createDefaultSettings()
    }
    return AppDataSource
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

async function createDefaultSettings() {
  const settingRepo = AppDataSource.getRepository(Setting)
  const existing = await settingRepo.findOne({ where: { id: 'default' } })

  if (!existing) {
    const defaultSettings = settingRepo.create({
      id: 'default',
      photoSourcePath: '',
      watchPath: '',
      organizePattern: '{year}/{month}/{day}',
      duplicateDetection: 'hash',
      thumbnailQuality: 'medium',
      remoteAccess: false,
      remotePort: 3000
    })
    await settingRepo.save(defaultSettings)
  }
}
