import type { App } from 'vue'

interface ErrorHandlerOptions {
  showToast?: boolean
  logToConsole?: boolean
}

class GlobalErrorHandler {
  private options: ErrorHandlerOptions = {
    showToast: true,
    logToConsole: true
  }

  install(app: App, options?: Partial<ErrorHandlerOptions>) {
    this.options = { ...this.options, ...options }

    app.config.errorHandler = (error, _instance, info) => {
      this.handleError(error, info)
    }

    window.addEventListener('unhandledrejection', (event) => {
      this.handlePromiseRejection(event)
    })

    window.addEventListener('error', (event) => {
      this.handleGlobalError(event)
    })
  }

  private handleError(error: unknown, info: string) {
    const message = this.extractErrorMessage(error)
    
    if (this.options.logToConsole) {
      console.error('Vue Error:', error)
      console.error('Error Info:', info)
    }

    if (this.options.showToast) {
      this.showErrorToast(message)
    }
  }

  private handlePromiseRejection(event: PromiseRejectionEvent) {
    const message = this.extractErrorMessage(event.reason)
    
    if (this.options.logToConsole) {
      console.error('Unhandled Promise Rejection:', event.reason)
    }

    if (this.options.showToast) {
      this.showErrorToast(message)
    }

    event.preventDefault()
  }

  private handleGlobalError(event: ErrorEvent) {
    const message = event.message || 'Unknown error'
    
    if (this.options.logToConsole) {
      console.error('Global Error:', event.error)
    }

    if (this.options.showToast) {
      this.showErrorToast(message)
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: unknown }).message)
    }
    return 'An unknown error occurred'
  }

  private showErrorToast(message: string) {
    const toastContainer = document.createElement('div')
    toastContainer.className = 'error-toast'
    toastContainer.textContent = message
    
    const existingToast = document.querySelector('.error-toast')
    if (existingToast) {
      existingToast.remove()
    }
    
    document.body.appendChild(toastContainer)

    setTimeout(() => {
      toastContainer.classList.add('fade-out')
      setTimeout(() => {
        toastContainer.remove()
      }, 300)
    }, 5000)
  }

  public showError(message: string) {
    if (this.options.logToConsole) {
      console.error(message)
    }
    this.showErrorToast(message)
  }

  public showWarning(message: string) {
    if (this.options.logToConsole) {
      console.warn(message)
    }
    this.showToast(message, 'warning')
  }

  private showToast(message: string, type: 'error' | 'warning' = 'error') {
    const toastContainer = document.createElement('div')
    toastContainer.className = `toast toast-${type}`
    toastContainer.textContent = message
    
    document.body.appendChild(toastContainer)

    setTimeout(() => {
      toastContainer.classList.add('fade-out')
      setTimeout(() => {
        toastContainer.remove()
      }, 300)
    }, 5000)
  }
}

export const errorHandler = new GlobalErrorHandler()

export function setupErrorHandler(app: App) {
  app.use(errorHandler, {
    showToast: true,
    logToConsole: true
  })
}