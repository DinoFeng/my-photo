import { ipcMain } from 'electron'
import { app, dialog } from 'electron'
import { join } from 'path'

export function setupIpcHandlers(): void {
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })

    if (result.canceled) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('select-file', async (event, filters?: { name: string; extensions: string[] }[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters || []
    })

    if (result.canceled) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('select-multiple-files', async (event, filters?: { name: string; extensions: string[] }[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: filters || []
    })

    if (result.canceled) {
      return []
    }

    return result.filePaths
  })

  ipcMain.handle('get-app-data-path', () => {
    return app.getPath('userData')
  })

  ipcMain.handle('get-home-path', () => {
    return app.getPath('home')
  })

  ipcMain.handle('show-error-dialog', async (event, message: string, detail?: string) => {
    await dialog.showErrorBox(message, detail || '')
  })

  ipcMain.handle('show-message-dialog', async (event, options: {
    title?: string
    message: string
    type?: 'none' | 'info' | 'error' | 'question' | 'warning'
    buttons?: string[]
  }) => {
    const result = await dialog.showMessageBox({
      title: options.title || '提示',
      message: options.message,
      type: options.type || 'info',
      buttons: options.buttons || ['确定']
    })

    return result.response
  })

  ipcMain.handle('get-path', (event, pathName: string) => {
    try {
      return app.getPath(pathName as Parameters<typeof app.getPath>[0])
    } catch {
      return null
    }
  })

  ipcMain.handle('minimize-window', (event) => {
    const window = event.sender.getOwnerBrowserWindow()
    if (window) {
      window.minimize()
    }
  })

  ipcMain.handle('maximize-window', (event) => {
    const window = event.sender.getOwnerBrowserWindow()
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize()
      } else {
        window.maximize()
      }
    }
  })

  ipcMain.handle('close-window', (event) => {
    const window = event.sender.getOwnerBrowserWindow()
    if (window) {
      window.close()
    }
  })
}
