import { Request, Response } from 'express'
import { prisma } from '../server'

export async function getAllSettings(req: Request, res: Response) {
  try {
    const settings = await prisma.setting.findMany()
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
}

export async function getSetting(req: Request, res: Response) {
  try {
    const { key } = req.params
    const setting = await prisma.setting.findUnique({
      where: { key }
    })
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' })
    }
    res.json(setting)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch setting' })
  }
}

export async function createSetting(req: Request, res: Response) {
  try {
    const { key, value, description } = req.body
    const setting = await prisma.setting.create({
      data: { key, value, description }
    })
    res.status(201).json(setting)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create setting' })
  }
}

export async function updateSetting(req: Request, res: Response) {
  try {
    const { key } = req.params
    const { value, description } = req.body
    const setting = await prisma.setting.update({
      where: { key },
      data: { value, description }
    })
    res.json(setting)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting' })
  }
}

export async function deleteSetting(req: Request, res: Response) {
  try {
    const { key } = req.params
    await prisma.setting.delete({ where: { key } })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete setting' })
  }
}