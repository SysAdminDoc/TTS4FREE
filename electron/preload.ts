import { contextBridge } from 'electron'

// The single, narrow bridge the renderer sees. Phase 2+ adds synthesize/export/
// storage IPC methods here; today it only advertises the desktop platform so the
// renderer can route around browser-only paths (e.g. skip service-worker setup).
const bridge = {
  isDesktop: true as const,
  kind: 'desktop' as const,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
}

contextBridge.exposeInMainWorld('betterttsPlatform', bridge)

export type BetterttsPlatformBridge = typeof bridge
