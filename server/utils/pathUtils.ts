import { join } from 'path'

export function buildTargetPath(pattern: string, exif: any, fileName: string): string {
  let path = pattern
  
  const date = exif?.date ? new Date(exif.date) : new Date()
  
  path = path.replace('{year}', date.getFullYear().toString())
  path = path.replace('{month}', String(date.getMonth() + 1).padStart(2, '0'))
  path = path.replace('{day}', String(date.getDate()).padStart(2, '0'))
  path = path.replace('{date}', date.toISOString().split('T')[0])
  
  path = path.replace('{camera}', exif?.camera || 'Unknown')
  path = path.replace('{model}', exif?.model || 'Unknown')
  
  path = path.replace('{city}', exif?.gps?.city || 'Unknown')
  path = path.replace('{country}', exif?.gps?.country || 'Unknown')
  
  path = path.replace('{event}', 'Unknown')
  
  return join(path, fileName)
}

export function isPathChildOf(parent: string, child: string): boolean {
  const parentPath = parent.replace(/[/\\]+$/, '') + (parent.includes('/') ? '/' : '\\')
  return child.startsWith(parentPath)
}

export function arePathsRelated(path1: string, path2: string): boolean {
  return isPathChildOf(path1, path2) || isPathChildOf(path2, path1)
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}
