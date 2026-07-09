import { KOKORO_MODEL_ID, installKokoroAssetFallback } from '../lib/kokoro-assets.ts'
import type { ProgressInfo } from '../lib/kokoro.ts'
import { needsDirectKokoroPath } from '../lib/kokoro-direct.ts'

type KokoroModule = typeof import('kokoro-js')
type KokoroInstance = Awaited<ReturnType<KokoroModule['KokoroTTS']['from_pretrained']>>

export type WorkerRequest =
  | { type: 'load'; device: 'webgpu' | 'wasm'; dtype: 'fp32' | 'q8' }
  | { type: 'generate'; text: string; voice: string; speed: number; id: number; voiceBin?: Float32Array }

export type WorkerResponse =
  | { type: 'progress'; info: ProgressInfo }
  | { type: 'loaded' }
  | { type: 'loadError'; message: string }
  | { type: 'generated'; samples: Float32Array; id: number }
  | { type: 'generateError'; message: string; id: number }

let tts: KokoroInstance | null = null
let loadedKey = ''

self.addEventListener('message', async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data

  if (msg.type === 'load') {
    const key = `${msg.device}:${msg.dtype}`
    if (tts && loadedKey === key) {
      self.postMessage({ type: 'loaded' } satisfies WorkerResponse)
      return
    }
    try {
      installKokoroAssetFallback()
      const { KokoroTTS } = await import('kokoro-js')
      tts = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
        device: msg.device,
        dtype: msg.dtype,
        progress_callback: (info) => {
          self.postMessage({ type: 'progress', info: info as ProgressInfo } satisfies WorkerResponse)
        },
      })
      loadedKey = key
      self.postMessage({ type: 'loaded' } satisfies WorkerResponse)
    } catch (err) {
      tts = null
      loadedKey = ''
      self.postMessage({ type: 'loadError', message: err instanceof Error ? err.message : 'Model load failed' } satisfies WorkerResponse)
    }
    return
  }

  if (msg.type === 'generate') {
    if (!tts) {
      self.postMessage({ type: 'generateError', message: 'Model not loaded', id: msg.id } satisfies WorkerResponse)
      return
    }
    try {
      let samples: Float32Array | undefined

      if (needsDirectKokoroPath(msg.voice, msg.voiceBin)) {
        const { synthesizeDirectKokoro } = await import('../lib/kokoro-multilingual.ts')
        const audio = await synthesizeDirectKokoro(tts, msg.text, msg.voice, msg.speed, msg.voiceBin)
        samples = audio?.samples
      } else {
        const audio = (await tts.generate(msg.text, { voice: msg.voice as never, speed: msg.speed })) as { audio?: Float32Array }
        samples = audio.audio
      }

      if (samples) {
        self.postMessage(
          { type: 'generated', samples, id: msg.id } satisfies WorkerResponse,
          { transfer: [samples.buffer as ArrayBuffer] },
        )
      } else {
        self.postMessage({ type: 'generateError', message: 'No audio produced', id: msg.id } satisfies WorkerResponse)
      }
    } catch (err) {
      self.postMessage({ type: 'generateError', message: err instanceof Error ? err.message : 'Generation failed', id: msg.id } satisfies WorkerResponse)
    }
  }
})
