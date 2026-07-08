import { describe, expect, it } from 'vitest'
import { joinWordTimestamps, timestampTokensToPhonemes, type TimestampToken } from './kokoro-timestamps.ts'

describe('timestampTokensToPhonemes', () => {
  it('joins token phonemes with explicit whitespace markers', () => {
    const tokens: TimestampToken[] = [
      { text: 'Hello', phonemes: 'həlˈoʊ', whitespace: true, kind: 'word' },
      { text: 'world', phonemes: 'wˈɜːld', whitespace: false, kind: 'word' },
      { text: '.', phonemes: '.', whitespace: false, kind: 'punctuation' },
    ]

    expect(timestampTokensToPhonemes(tokens)).toBe('həlˈoʊ wˈɜːld.')
  })
})

describe('joinWordTimestamps', () => {
  it('maps duration frames to word cues and consumes punctuation timing', () => {
    const tokens: TimestampToken[] = [
      { text: 'Hello', phonemes: 'abc', whitespace: true, kind: 'word' },
      { text: 'world', phonemes: 'de', whitespace: false, kind: 'word' },
      { text: '.', phonemes: '.', whitespace: false, kind: 'punctuation' },
    ]
    const cues = joinWordTimestamps(tokens, [
      3,
      4, 4, 4, 2,
      5, 5,
      1,
      0,
    ])

    expect(cues).toEqual([
      { startSec: 0, endSec: 0.325, text: 'Hello' },
      { startSec: 0.325, endSec: 0.6, text: 'world' },
    ])
  })

  it('returns no cues when duration output is too short to align', () => {
    const tokens: TimestampToken[] = [{ text: 'Hi', phonemes: 'haɪ', whitespace: false, kind: 'word' }]

    expect(joinWordTimestamps(tokens, [1, 2])).toEqual([])
  })
})
