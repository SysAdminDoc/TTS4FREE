import { describe, expect, it } from 'vitest'
import { type Cue, toSRT, toVTT } from './subtitles.ts'

const CUES: Cue[] = [
  { index: 1, startSec: 0, endSec: 2.5, text: 'Hello world.' },
  { index: 2, startSec: 2.5, endSec: 5.123, text: 'Second sentence.' },
]

describe('toSRT', () => {
  it('formats cues with comma-separated milliseconds', () => {
    const srt = toSRT(CUES)
    expect(srt).toContain('00:00:00,000 --> 00:00:02,500')
    expect(srt).toContain('00:00:02,500 --> 00:00:05,123')
    expect(srt).toContain('Hello world.')
    expect(srt).toContain('Second sentence.')
  })

  it('includes cue index numbers', () => {
    const srt = toSRT(CUES)
    expect(srt).toMatch(/^1\n/)
    expect(srt).toContain('\n\n2\n')
  })
})

describe('toVTT', () => {
  it('starts with WEBVTT header', () => {
    const vtt = toVTT(CUES)
    expect(vtt).toMatch(/^WEBVTT\n/)
  })

  it('uses dot-separated milliseconds', () => {
    const vtt = toVTT(CUES)
    expect(vtt).toContain('00:00:00.000 --> 00:00:02.500')
  })
})

describe('timestamp edge cases', () => {
  it('never emits a 4-digit millisecond field when the fraction rounds up', () => {
    const cues: Cue[] = [{ index: 1, startSec: 1.9995, endSec: 59.9999, text: 'Edge.' }]
    const srt = toSRT(cues)
    expect(srt).toContain('00:00:02,000 --> 00:01:00,000')
    expect(srt).not.toMatch(/,\d{4}/)
  })

  it('handles negative-adjacent zero without underflow', () => {
    const srt = toSRT([{ index: 1, startSec: 0, endSec: 0.0004, text: 'Tiny.' }])
    expect(srt).toContain('00:00:00,000 --> 00:00:00,000')
  })

  it('collapses blank lines inside cue text so blocks are not terminated early', () => {
    const srt = toSRT([{ index: 1, startSec: 0, endSec: 1, text: 'Para one\n\nPara two' }])
    expect(srt).toContain('Para one\nPara two')
    expect(srt).not.toContain('\n\n\n')
    const blocks = srt.split('\n\n')
    expect(blocks.length).toBe(1)
  })
})
