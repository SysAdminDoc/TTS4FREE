// Renderer client for the desktop native inference host (TF-99). Mirrors the
// browser worker client in src/lib/kokoro-worker.ts, but transports over the
// betterttsPlatform IPC bridge instead of a Worker. Web builds resolve
// getNativeTtsBridge() to null, so every entry point is a safe no-op there.
import type { ProgressInfo } from '../lib/kokoro.ts'
import { getNativeTtsBridge } from './index.ts'

export type NativeRuntimeInfo = {
  runtime: 'onnxruntime-node'
  ep: 'cpu'
  ortVersion: string
  transformersVersion: string
  kokoroJsVersion: string
  node: string
  modelCacheDir: string
}

type HostMessage =
  | { type: 'progress'; info: ProgressInfo }
  | { type: 'loaded'; key: string; runtime: NativeRuntimeInfo }
  | { type: 'loadError'; message: string; key: string }
  | { type: 'generated'; samples: Float32Array; id: number }
  | { type: 'generateError'; message: string; id: number }
  | { type: 'info'; runtime: NativeRuntimeInfo }
  | { type: 'crashed' }

let subscribed = false
let nextId = 0
const pending = new Map<number, { resolve: (samples: Float32Array) => void; reject: (err: Error) => void }>()
let progressCallback: ((info: ProgressInfo) => void) | null = null
let loadPromise: Promise<NativeRuntimeInfo> | null = null
let loadKey = ''
const loadWaiters = new Map<string, { resolve: (runtime: NativeRuntimeInfo) => void; reject: (err: Error) => void }>()
let runtimeInfo: NativeRuntimeInfo | null = null

export function nativeTtsAvailable(): boolean {
  return getNativeTtsBridge() !== null
}

export function getNativeRuntimeInfo(): NativeRuntimeInfo | null {
  return runtimeInfo
}

function rejectAll(err: Error) {
  loadPromise = null
  loadKey = ''
  for (const waiter of loadWaiters.values()) waiter.reject(err)
  loadWaiters.clear()
  for (const entry of pending.values()) entry.reject(err)
  pending.clear()
}

function handleMessage(message: HostMessage) {
  if (message.type === 'progress') {
    progressCallback?.(message.info)
  } else if (message.type === 'loaded') {
    runtimeInfo = message.runtime
    loadWaiters.get(message.key)?.resolve(message.runtime)
    loadWaiters.delete(message.key)
  } else if (message.type === 'loadError') {
    const waiter = loadWaiters.get(message.key)
    loadWaiters.delete(message.key)
    if (loadKey === message.key) {
      loadPromise = null
      loadKey = ''
    }
    waiter?.reject(new Error(message.message))
  } else if (message.type === 'generated') {
    // Structured clone across the bridge can arrive as a plain typed-array view;
    // normalize so downstream buffer math sees a real Float32Array.
    const samples = message.samples instanceof Float32Array ? message.samples : new Float32Array(message.samples)
    pending.get(message.id)?.resolve(samples)
    pending.delete(message.id)
  } else if (message.type === 'generateError') {
    pending.get(message.id)?.reject(new Error(message.message))
    pending.delete(message.id)
  } else if (message.type === 'crashed') {
    runtimeInfo = null
    rejectAll(new Error('The native inference host crashed. Generate again to restart it.'))
  }
}

function ensureSubscription(): ReturnType<typeof getNativeTtsBridge> {
  const bridge = getNativeTtsBridge()
  if (!bridge) throw new Error('Native TTS is only available in the desktop app.')
  if (!subscribed) {
    bridge.onMessage((message) => handleMessage(message as HostMessage))
    subscribed = true
  }
  return bridge
}

export function loadNativeKokoro(onProgress: (info: ProgressInfo) => void): Promise<NativeRuntimeInfo> {
  progressCallback = onProgress
  const key = 'cpu:q8'
  if (loadPromise && loadKey === key) return loadPromise
  let bridge: ReturnType<typeof getNativeTtsBridge>
  try {
    bridge = ensureSubscription()
  } catch (err) {
    return Promise.reject(err instanceof Error ? err : new Error(String(err)))
  }
  loadKey = key
  loadPromise = new Promise<NativeRuntimeInfo>((resolve, reject) => {
    loadWaiters.set(key, { resolve, reject })
    bridge!.post({ type: 'load', dtype: 'q8' })
  })
  return loadPromise
}

export function generateNative(text: string, voice: string, speed: number): Promise<Float32Array> {
  let bridge: ReturnType<typeof getNativeTtsBridge>
  try {
    bridge = ensureSubscription()
  } catch (err) {
    return Promise.reject(err instanceof Error ? err : new Error(String(err)))
  }
  const id = nextId++
  return new Promise<Float32Array>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    bridge!.post({ type: 'generate', text, voice, speed, id })
  })
}

export function resetNativeTts() {
  const bridge = getNativeTtsBridge()
  bridge?.post({ type: 'reset' })
  runtimeInfo = null
  rejectAll(new Error('Native TTS session was reset.'))
}
