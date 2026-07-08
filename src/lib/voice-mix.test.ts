import { describe, expect, it } from 'vitest'
import { blendVoiceBins, formatMixFormula, parseMixFormula } from './voice-mix.ts'

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
