import { contextBridge, ipcRenderer } from 'electron'

const NATIVE_TTS_CHANNEL = 'bettertts:native-tts'

// The single, narrow bridge the renderer sees. Native TTS messages relay
// through main to the inference utilityProcess; payloads are structured-clone
// data only (strings, numbers, Float32Array) — no functions, no handles.
const bridge = {
  isDesktop: true as const,
  kind: 'desktop' as const,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  nativeTts: {
    post(message: unknown): void {
      ipcRenderer.send(NATIVE_TTS_CHANNEL, message)
    },
    onMessage(listener: (message: unknown) => void): () => void {
      const handler = (_event: unknown, message: unknown) => listener(message)
      ipcRenderer.on(NATIVE_TTS_CHANNEL, handler)
      return () => {
        ipcRenderer.removeListener(NATIVE_TTS_CHANNEL, handler)
      }
    },
  },
}

contextBridge.exposeInMainWorld('betterttsPlatform', bridge)

export type BetterttsPlatformBridge = typeof bridge
