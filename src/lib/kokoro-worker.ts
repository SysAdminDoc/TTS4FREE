import type { ProgressInfo } from './kokoro.ts'
import type { WorkerRequest, WorkerResponse } from '../worker/tts.worker.ts'

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, { resolve: (samples: Float32Array) => void; reject: (err: Error) => void }>()
let progressCallback: ((info: ProgressInfo) => void) | null = null
let loadPromise: Promise<void> | null = null
let loadKey = ''
let loadResolve: (() => void) | null = null
let loadReject: ((err: Error) => void) | null = null

function rejectAll(err: Error) {
  const reject = loadReject
  loadResolve = null
  loadReject = null
  loadPromise = null
  loadKey = ''
  reject?.(err)
  for (const entry of pending.values()) entry.reject(err)
  pending.clear()
}

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('../worker/tts.worker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data
    if (msg.type === 'progress') {
      progressCallback?.(msg.info)
    } else if (msg.type === 'loaded') {
      loadResolve?.()
      loadResolve = null
      loadReject = null
    } else if (msg.type === 'loadError') {
      const reject = loadReject
      loadResolve = null
      loadReject = null
      loadPromise = null
      loadKey = ''
      reject?.(new Error(msg.message))
    } else if (msg.type === 'generated') {
      pending.get(msg.id)?.resolve(msg.samples)
      pending.delete(msg.id)
    } else if (msg.type === 'generateError') {
      pending.get(msg.id)?.reject(new Error(msg.message))
      pending.delete(msg.id)
    }
  })
  worker.addEventListener('error', () => {
    worker = null
    rejectAll(new Error('The TTS worker crashed. Generate again to restart it.'))
  })
  return worker
}

export function loadKokoroWorker(
  device: 'webgpu' | 'wasm',
  dtype: 'fp32' | 'q8',
  onProgress: (info: ProgressInfo) => void,
): Promise<void> {
  progressCallback = onProgress
  const key = `${device}:${dtype}`
  if (loadPromise && loadKey === key) return loadPromise
  const w = getWorker()
  loadKey = key
  loadPromise = new Promise<void>((resolve, reject) => {
    loadResolve = resolve
    loadReject = reject
    w.postMessage({ type: 'load', device, dtype } satisfies WorkerRequest)
  })
  return loadPromise
}

export function generateWorker(text: string, voice: string, speed: number, voiceBin?: Float32Array): Promise<Float32Array> {
  const w = getWorker()
  const id = nextId++
  return new Promise<Float32Array>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    // Clone voice bin for transfer — the caller may reuse the original across
    // multiple chunks in one generation run.
    const binCopy = voiceBin ? new Float32Array(voiceBin) : undefined
    const msg: WorkerRequest = { type: 'generate', text, voice, speed, id, voiceBin: binCopy }
    const transfer = binCopy ? [binCopy.buffer as ArrayBuffer] : []
    w.postMessage(msg, { transfer })
  })
}

export function resetWorker() {
  worker?.terminate()
  worker = null
  rejectAll(new Error('TTS session was reset.'))
}
