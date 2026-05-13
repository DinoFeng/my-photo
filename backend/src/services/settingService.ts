import { db } from '../db'
import { setting } from '../db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export interface SettingCreate {
  key: string
  value: string
  description?: string
}

export interface SettingUpdate {
  value?: string
  description?: string
}

export async function findAllSettings() {
  return await db.select().from(setting)
}

export async function findSettingByKey(key: string) {
  const result = await db.select().from(setting)
    .where(eq(setting.key, key))
  return result[0] || null
}

export async function createSetting(data: SettingCreate) {
  const now = new Date().toISOString()
  const result = await db.insert(setting).values({
    id: uuidv4(),
    key: data.key,
    value: data.value,
    description: data.description,
    createdAt: now,
    updatedAt: now
  }).returning()
  
  return result[0]
}

export async function updateSetting(key: string, data: SettingUpdate) {
  const result = await db.update(setting).set({
    ...data,
    updatedAt: new Date().toISOString()
  }).where(eq(setting.key, key)).returning()
  
  return result[0] || null
}

export async function deleteSetting(key: string) {
  const result = await db.delete(setting).where(eq(setting.key, key)).returning()
  return result[0] || null
}