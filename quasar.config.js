import { configure } from '@quasar/vite-plugin'

export default configure(function (ctx) {
  return {
    eslint: {
      warnings: true,
      errors: true
    },
    build: {
      target: {
        browser: ['es2022', 'edge89', 'firefox120', 'chrome120', 'safari17'],
        node: 'node22'
      },
      vueRouterMode: 'hash'
    },
    devServer: {
      port: 8080,
      open: false
    },
    framework: {
      config: {},
      iconSet: 'mdi-v7',
      plugins: [
        'Dialog',
        'Notify',
        'Loading',
        'LocalStorage'
      ]
    },
    electron: {
      bundler: 'builder',
      packager: {},
      builder: {
        appId: 'com.myphoto.app',
        productName: 'MyPhoto',
        win: {
          target: 'nsis'
        },
        mac: {
          target: 'dmg'
        },
        linux: {
          target: 'AppImage'
        }
      }
    },
    css: ['app.scss']
  }
})
