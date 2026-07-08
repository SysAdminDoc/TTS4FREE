import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// public/ files are copied verbatim, so the service-worker cache name is
// stamped after the bundle is written; every deploy invalidates the app shell.
function swBuildId(): Plugin {
  return {
    name: 'sw-build-id',
    closeBundle() {
      const swPath = join(import.meta.dirname, 'dist', 'sw.js')
      try {
        writeFileSync(swPath, readFileSync(swPath, 'utf8').replace('__BUILD_ID__', String(Date.now())))
      } catch {
        /* dist/sw.js absent in non-build contexts */
      }
    },
  }
}

export default defineConfig({
  base: '/BetterTTS/',
  plugins: [react(), swBuildId()],
})
