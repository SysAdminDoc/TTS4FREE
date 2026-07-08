import { describe, expect, it } from 'vitest'
import { concatFloat32Arrays, encodeWav } from './wav.ts'

describe('encodeWav', () => {
  it('produces a valid RIFF/WAVE header', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1])
    const buf = encodeWav(samples, 24000)
    const view = new DataView(buf)

    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF')
    expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE')
    expect(String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15))).toBe('fmt ')
    expect(String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39))).toBe('data')
  })

  it('encodes correct file size in header', () => {
    const samples = new Float32Array(100)
    const buf = encodeWav(samples, 24000)
    const view = new DataView(buf)

    expect(view.getUint32(4, true)).toBe(36 + 100 * 2)
    expect(view.getUint32(40, true)).toBe(100 * 2)
  })

  it('writes sample rate correctly', () => {
    const buf = encodeWav(new Float32Array(1), 48000)
    const view = new DataView(buf)

    expect(view.getUint32(24, true)).toBe(48000)
  })

  it('clamps samples to [-1, 1] range', () => {
    const samples = new Float32Array([2, -3, 0.5])
    const buf = encodeWav(samples, 24000)
    const view = new DataView(buf)

    expect(view.getInt16(44, true)).toBe(0x7fff)
    expect(view.getInt16(46, true)).toBe(-0x8000)
  })

  it('returns correct total buffer size', () => {
    const samples = new Float32Array(50)
    const buf = encodeWav(samples, 24000)

    expect(buf.byteLength).toBe(44 + 50 * 2)
  })
})

describe('concatFloat32Arrays', () => {
  it('concatenates multiple arrays', () => {
    const a = new Float32Array([1, 2])
    const b = new Float32Array([3, 4, 5])
    const result = concatFloat32Arrays([a, b])

    expect(result.length).toBe(5)
    expect([...result]).toEqual([1, 2, 3, 4, 5])
  })

  it('handles empty arrays', () => {
    const result = concatFloat32Arrays([new Float32Array(0), new Float32Array([1])])

    expect(result.length).toBe(1)
    expect(result[0]).toBe(1)
  })

  it('handles no arrays', () => {
    const result = concatFloat32Arrays([])

    expect(result.length).toBe(0)
  })
})
