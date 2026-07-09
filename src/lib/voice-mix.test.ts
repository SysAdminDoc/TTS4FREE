import { describe, expect, it, vi } from 'vitest'
import { VOICE_STYLE_FLOATS, blendVoiceBins, formatMixFormula, parseMixFormula, voiceBinFromBuffer } from './voice-mix.ts'

describe('blendVoiceBins', () => {
  it('returns the only bin unchanged for a single entry', () => {
    const data = new Float32Array([1, 2, 3])
    const result = blendVoiceBins([{ data, weight: 1 }])
    expect(result).toBe(data)
  })

  it('averages two equal-weight bins', () => {
    const a = new Float32Array([0, 4, 8])
    const b = new Float32Array([2, 0, 2])
    const result = blendVoiceBins([
      { data: a, weight: 1 },
      { data: b, weight: 1 },
    ])
    expect(result[0]).toBeCloseTo(1)
    expect(result[1]).toBeCloseTo(2)
    expect(result[2]).toBeCloseTo(5)
  })

  it('respects unequal weights', () => {
    const a = new Float32Array([0, 0])
    const b = new Float32Array([10, 10])
    const result = blendVoiceBins([
      { data: a, weight: 3 },
      { data: b, weight: 1 },
    ])
    expect(result[0]).toBeCloseTo(2.5)
    expect(result[1]).toBeCloseTo(2.5)
  })

  it('throws on empty input', () => {
    expect(() => blendVoiceBins([])).toThrow('No voice bins')
  })
})

describe('parseMixFormula', () => {
  it('parses af_heart(2)+af_bella(1)', () => {
    const result = parseMixFormula('af_heart(2)+af_bella(1)')
    expect(result).toEqual([
      { voiceId: 'af_heart', weight: 2 },
      { voiceId: 'af_bella', weight: 1 },
    ])
  })

  it('defaults weight to 1 when omitted', () => {
    const result = parseMixFormula('af_heart+af_bella')
    expect(result).toEqual([
      { voiceId: 'af_heart', weight: 1 },
      { voiceId: 'af_bella', weight: 1 },
    ])
  })

  it('returns null for a single voice', () => {
    expect(parseMixFormula('af_heart')).toBeNull()
  })

  it('returns null for invalid syntax', () => {
    expect(parseMixFormula('invalid!!+bad')).toBeNull()
  })
})

describe('formatMixFormula', () => {
  it('formats a mix with and without weight suffixes', () => {
    expect(
      formatMixFormula([
        { voiceId: 'af_heart', weight: 2 },
        { voiceId: 'af_bella', weight: 1 },
      ]),
    ).toBe('af_heart(2) + af_bella')
  })
})

describe('voiceBinFromBuffer', () => {
  it('rejects HTML or other non-Float32 payloads', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bytes = new TextEncoder().encode('<!doctype html>')

    expect(voiceBinFromBuffer(bytes.buffer as ArrayBuffer, 'af_heart')).toBeNull()
    expect(warn).toHaveBeenCalledWith('Discarding invalid voice bin payload for af_heart')
    warn.mockRestore()
  })

  it('rejects short Float32 voice data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = new Float32Array(256)

    expect(voiceBinFromBuffer(data.buffer as ArrayBuffer, 'af_heart')).toBeNull()
    warn.mockRestore()
  })

  it('accepts an exact Kokoro style tensor', () => {
    const data = new Float32Array(VOICE_STYLE_FLOATS)

    expect(voiceBinFromBuffer(data.buffer as ArrayBuffer, 'af_heart')?.length).toBe(VOICE_STYLE_FLOATS)
  })
})
