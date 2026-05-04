export {}

declare global {
  interface ElectronAPI {
    selectDirectory: () => Promise<string | null>
    selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>
    selectMultipleFiles: (filters?: { name: string; extensions: string[] }[]) => Promise<string[] | null>
    getAppDataPath: () => string
    getHomePath: () => string
    showErrorDialog: (message: string, detail?: string) => Promise<void>
    showMessageDialog: (options: {
      title?: string
      message: string
      type?: 'none' | 'info' | 'error' | 'question' | 'warning'
      buttons?: string[]
    }) => Promise<number>
    getPath: (pathName: string) => string | null
    minimizeWindow: () => void
    maximizeWindow: () => void
    closeWindow: () => void
  }

  interface Window {
    electronAPI: ElectronAPI
  }
}
