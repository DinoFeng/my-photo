import { Request, Response } from 'express'
import { db } from '../db'
import { setting } from '../db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export async function getAllSettings(req: Request, res: Response) {
  try {
    const settings = await db.select().from(setting)
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
}

export async function getSetting(req: Request, res: Response) {
  try {
    const { key } = req.params
    const result = await db.select().from(setting).where(eq(setting.key, key))
    const settingItem = result[0]
    if (!settingItem) {
      return res.status(404).json({ error: 'Setting not found' })
    }
    res.json(settingItem)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch setting' })
  }
}

export async function createSetting(req: Request, res: Response) {
  try {
    const { key, value, description } = req.body
    const now = new Date().toISOString()
    const result = await db.insert(setting).values({
      id: uuidv4(),
      key,
      value,
      description,
      createdAt: now,
      updatedAt: now
    }).returning()
    res.status(201).json(result[0])
  } catch (error) {
    res.status(500).json({ error: 'Failed to create setting' })
  }
}

export async function updateSetting(req: Request, res: Response) {
  try {
    const { key } = req.params
    const { value, description } = req.body
    const result = await db.update(setting).set({
      value,
      description,
      updatedAt: new Date().toISOString()
    }).where(eq(setting.key, key)).returning()
    if (result.length === 0) {
      return res.status(404).json({ error: 'Setting not found' })
    }
    res.json(result[0])
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting' })
  }
}

export async function deleteSetting(req: Request, res: Response) {
  try {
    const { key } = req.params
    const result = await db.delete(setting).where(eq(setting.key, key)).returning()
    if (result.length === 0) {
      return res.status(404).json({ error: 'Setting not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete setting' })
  }
}