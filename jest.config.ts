import { setConfig } from '@nestjs/config'

export default {
  test: {
    environment: 'node',
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.json'
      }
    },
    testMatch: ['**/*.test.ts'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts'
    ]
  }
}
