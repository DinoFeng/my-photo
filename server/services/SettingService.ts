import { AppDataSource } from '../db/index.js'
import Setting from '../db/models/Setting.js'

const settingRepository = AppDataSource.getRepository(Setting)

export async function getSettings(): Promise<Setting> {
  let settings = await settingRepository.findOne({ where: { id: 'default' } })
  
  if (!settings) {
    settings = settingRepository.create({
      id: 'default',
      photoSourcePath: '',
      watchPath: '',
      organizePattern: '{year}/{month}/{day}',
      duplicateDetection: 'hash',
      thumbnailQuality: 'medium',
      remoteAccess: false,
      remotePort: 3000
    })
    await settingRepository.save(settings)
  }
  
  return settings
}

export async function updateSettings(updates: Partial<Setting>): Promise<Setting> {
  let settings = await getSettings()
  
  Object.assign(settings, updates)
  settings.updatedAt = new Date()
  
  return await settingRepository.save(settings)
}

export async function validateDirectorySettings(photoSourcePath: string, watchPath: string): Promise<string[] | null> {
  const errors: string[] = []
  
  if (!photoSourcePath && !watchPath) {
    return errors
  }
  
  if (photoSourcePath && watchPath) {
    const sourcePath = photoSourcePath.replace(/[/\\]+$/, '')
    const watch = watchPath.replace(/[/\\]+$/, '')
    
    if (sourcePath === watch) {
      errors.push('照片源目录和导入监控目录不能相同')
    }
    
    if (watch.startsWith(sourcePath + (sourcePath.includes('/') ? '/' : '\\')) ||
        sourcePath.startsWith(watch + (watch.includes('/') ? '/' : '\\'))) {
      errors.push('照片源目录和导入监控目录不能是父子目录关系')
    }
  }
  
  return errors.length > 0 ? errors : null
}
