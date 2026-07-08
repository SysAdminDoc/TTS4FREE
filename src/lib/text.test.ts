import { describe, expect, it } from 'vitest'
import { formatBytes, parseDialogLines, parsePauseTags, slugify, splitInput, splitIntoSentences } from './text.ts'

describe('slugify', () => {
  it('lowercases and replaces non-alphanumeric chars', () => {
    expect(slugify('Hello World!')).toBe('hello-world')
  })

  it('trims leading/trailing hyphens', () => {
    expect(slugify('---test---')).toBe('test')
  })

  it('truncates to 42 characters', () => {
    const long = 'a'.repeat(100)
    expect(slugify(long).length).toBeLessThanOrEqual(42)
  })

  it('returns fallback for empty/whitespace input', () => {
    expect(slugify('')).toBe('tts4free-audio')
    expect(slugify('   ')).toBe('tts4free-audio')
    expect(slugify('!!!')).toBe('tts4free-audio')
  })
})

describe('splitInput', () => {
  it('returns whole text as single chunk when separateLines is false', () => {
    expect(splitInput('Hello\nWorld', false)).toEqual(['Hello\nWorld'])
  })

  it('splits by line when separateLines is true', () => {
    expect(splitInput('Line 1\nLine 2\n\nLine 3', true)).toEqual(['Line 1', 'Line 2', 'Line 3'])
  })

  it('returns empty array for blank input', () => {
    expect(splitInput('', false)).toEqual([])
    expect(splitInput('   ', true)).toEqual([])
  })

  it('trims each line and filters empties', () => {
    expect(splitInput('  a  \n\n  b  \n', true)).toEqual(['a', 'b'])
  })
})

describe('parsePauseTags', () => {
  it('parses [pause] with default 1s duration', () => {
    const result = parsePauseTags('Hello [pause] world')
    expect(result).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'pause', duration: 1 },
      { type: 'text', content: 'world' },
    ])
  })

  it('parses [pause 2s] with specified duration', () => {
    const result = parsePauseTags('A [pause 2s] B')
    expect(result).toEqual([
      { type: 'text', content: 'A' },
      { type: 'pause', duration: 2 },
      { type: 'text', content: 'B' },
    ])
  })

  it('parses [pause 0.5] without s suffix', () => {
    const result = parsePauseTags('X [pause 0.5] Y')
    expect(result[1]).toEqual({ type: 'pause', duration: 0.5 })
  })

  it('is case insensitive', () => {
    const result = parsePauseTags('[Pause 3s]')
    expect(result[0]).toEqual({ type: 'pause', duration: 3 })
  })

  it('clamps duration to 30s max', () => {
    const result = parsePauseTags('[pause 50s]')
    expect(result).toEqual([{ type: 'text', content: '[pause 50s]' }])
  })

  it('returns text segment for input without pause tags', () => {
    const result = parsePauseTags('Just text')
    expect(result).toEqual([{ type: 'text', content: 'Just text' }])
  })

  it('handles multiple consecutive pauses', () => {
    const result = parsePauseTags('[pause 1s][pause 2s]')
    expect(result).toEqual([
      { type: 'pause', duration: 1 },
      { type: 'pause', duration: 2 },
    ])
  })
})

describe('splitIntoSentences', () => {
  it('splits at sentence boundaries', () => {
    const result = splitIntoSentences('Hello world. How are you? Fine!')
    expect(result).toEqual(['Hello world. How are you? Fine!'])
  })

  it('groups short sentences together', () => {
    const result = splitIntoSentences('A. B. C.')
    expect(result.length).toBe(1)
    expect(result[0]).toBe('A. B. C.')
  })

  it('splits when combined length exceeds 300', () => {
    const long = 'X'.repeat(200) + '. ' + 'Y'.repeat(200) + '.'
    const result = splitIntoSentences(long)
    expect(result.length).toBe(2)
  })

  it('returns input for text without sentence boundaries', () => {
    const result = splitIntoSentences('Just a phrase')
    expect(result).toEqual(['Just a phrase'])
  })

  it('handles empty input', () => {
    expect(splitIntoSentences('')).toEqual([])
    expect(splitIntoSentences('   ')).toEqual([])
  })
})

describe('parseDialogLines', () => {
  it('parses [speaker:Name] prefixes', () => {
    const result = parseDialogLines('[speaker:Alice] Hello.\n[speaker:Bob] Hi there.')
    expect(result).toEqual([
      { speaker: 'Alice', text: 'Hello.' },
      { speaker: 'Bob', text: 'Hi there.' },
    ])
  })

  it('handles lines without speaker prefix', () => {
    const result = parseDialogLines('No prefix here.\n[speaker:Bob] With prefix.')
    expect(result).toEqual([
      { speaker: null, text: 'No prefix here.' },
      { speaker: 'Bob', text: 'With prefix.' },
    ])
  })

  it('skips empty lines', () => {
    const result = parseDialogLines('[speaker:A] Line 1\n\n[speaker:B] Line 2')
    expect(result.length).toBe(2)
  })

  it('is case insensitive on the speaker tag', () => {
    const result = parseDialogLines('[Speaker:Eve] Test')
    expect(result[0].speaker).toBe('Eve')
  })
})

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(2048)).toBe('2 kB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
