import { Request, Response } from 'express'
import {
  findAllSettings,
  findSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting
} from '../services/settingService'

export async function getAllSettings(req: Request, res: Response) {
  try {
    const settings = await findAllSettings()
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
}

export async function getSetting(req: Request, res: Response) {
  try {
    const { key } = req.params
    const settingItem = await findSettingByKey(key)
    
    if (!settingItem) {
      return res.status(404).json({ error: 'Setting not found' })
    }
    res.json(settingItem)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch setting' })
  }
}

export async function createSettingHandler(req: Request, res: Response) {
  try {
    const { key, value, description } = req.body
    const settingItem = await createSetting({ key, value, description })
    res.status(201).json(settingItem)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create setting' })
  }
}

export async function updateSettingHandler(req: Request, res: Response) {
  try {
    const { key } = req.params
    const { value, description } = req.body
    
    const updated = await updateSetting(key, { value, description })
    
    if (!updated) {
      return res.status(404).json({ error: 'Setting not found' })
    }
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting' })
  }
}

export async function deleteSettingHandler(req: Request, res: Response) {
  try {
    const { key } = req.params
    const deleted = await deleteSetting(key)
    
    if (!deleted) {
      return res.status(404).json({ error: 'Setting not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete setting' })
  }
}