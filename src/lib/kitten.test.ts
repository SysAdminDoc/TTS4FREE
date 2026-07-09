import { describe, expect, it } from 'vitest'
import { encodeWav } from './wav.ts'
import {
  KITTEN_DEFAULT_MODEL,
  KITTEN_MODELS,
  KITTEN_SAMPLE_RATE,
  KITTEN_VOICES,
  clampKittenSpeed,
  wavBlobToFloat32,
} from './kitten.ts'

describe('kitten metadata', () => {
  it('lists the documented lightweight model sizes', () => {
    expect(KITTEN_DEFAULT_MODEL).toBe('nano')
    expect(KITTEN_MODELS.map((model) => [model.id, model.params, model.weightSize])).toEqual([
      ['nano', '15M', '24 MB'],
      ['micro', '40M', '41 MB'],
      ['mini', '80M', '78 MB'],
    ])
  })

  it('lists the eight KittenTTS voices', () => {
    expect(KITTEN_VOICES.map((voice) => voice.id)).toEqual([
      'Bella',
      'Luna',
      'Rosie',
      'Kiki',
      'Jasper',
      'Bruno',
      'Hugo',
      'Leo',
    ])
  })

  it('keeps speed in the KittenTTS operating range', () => {
    expect(clampKittenSpeed(0.25)).toBe(0.5)
    expect(clampKittenSpeed(1.4)).toBe(1.4)
    expect(clampKittenSpeed(2.5)).toBe(2)
  })

  it('parses the package WAV blob back to mono float samples', async () => {
    const source = new Float32Array([-1, -0.5, 0, 0.5, 1])
    const blob = new Blob([encodeWav(source, KITTEN_SAMPLE_RATE)], { type: 'audio/wav' })

    const parsed = await wavBlobToFloat32(blob)

    expect(parsed.sampleRate).toBe(KITTEN_SAMPLE_RATE)
    expect(Array.from(parsed.samples).map((sample) => Number(sample.toFixed(3)))).toEqual([-1, -0.5, 0, 0.5, 1])
  })

  it('rejects blobs shorter than a RIFF header with its own error', async () => {
    await expect(wavBlobToFloat32(new Blob([new Uint8Array([1, 2, 3, 4])]))).rejects.toThrow('invalid WAV payload')
  })

  it('rejects a fmt chunk truncated below its declared 16 bytes', async () => {
    const wav = new Uint8Array(encodeWav(new Float32Array([0, 0.5]), KITTEN_SAMPLE_RATE))
    // Cut mid-fmt: RIFF(12) + fmt header(8) + only 4 of the 16 fmt bytes.
    await expect(wavBlobToFloat32(new Blob([wav.slice(0, 24)]))).rejects.toThrow('invalid WAV payload')
  })

  it('clamps a data chunk that declares more bytes than the buffer holds', async () => {
    const wav = new Uint8Array(encodeWav(new Float32Array([-1, -0.5, 0, 0.5, 1]), KITTEN_SAMPLE_RATE))
    // Drop the last 4 bytes (2 samples) without touching the declared size.
    const truncated = wav.slice(0, wav.length - 4)
    const parsed = await wavBlobToFloat32(new Blob([truncated]))
    expect(parsed.samples.length).toBe(3)
  })
})
