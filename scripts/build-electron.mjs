#!/usr/bin/env node
// Bundles the Electron main and preload scripts to CommonJS in dist-electron/.
// CJS keeps preload/main on the rock-solid Electron path (no ESM loader edge
// cases) while the renderer stays modern ESM through Vite.
import { build } from 'esbuild'

const dev = process.argv.includes('--dev')

const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  // Electron and Node built-ins are provided by the runtime, never bundled.
  external: ['electron'],
  sourcemap: dev,
  minify: !dev,
  logLevel: 'info',
}

await Promise.all([
  build({ ...common, entryPoints: ['electron/main.ts'], outfile: 'dist-electron/main.cjs' }),
  build({ ...common, entryPoints: ['electron/preload.ts'], outfile: 'dist-electron/preload.cjs' }),
])

console.log('Built Electron main + preload → dist-electron/')
