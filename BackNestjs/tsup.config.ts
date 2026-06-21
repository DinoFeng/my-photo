import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/main.ts'],
    format: 'esm',
    clean: true,
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
    dts: false,
  },
  {
    entry: ['src/features/scan/media.worker.ts'],
    format: 'esm',
    clean: false,
    outDir: 'dist/features/scan',
    sourcemap: true,
    target: 'es2022',
    dts: false,
  },
]);