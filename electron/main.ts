import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { startServer } from '../server/app.js'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'MyPhoto',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (process.env.QUASAR_ELECTRON_PRELOAD) {
    mainWindow.loadURL(process.env.QUASAR_ELECTRON_PRELOAD)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  await startServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('select-directory', async () => {
  const { dialog } = await import('electron')
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  
  if (result.canceled) {
    return null
  }
  
  return result.filePaths[0]
})

ipcMain.handle('get-app-data-path', () => {
  return app.getPath('userData')
})
