export type TextSegment = { type: 'text'; content: string } | { type: 'pause'; duration: number }

export const PAUSE_TAG = /\[pause(?:\s+([\d.]+)\s*s?)?\]/gi

export function parsePauseTags(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(PAUSE_TAG)) {
    const before = text.slice(lastIndex, match.index)
    if (before.trim()) segments.push({ type: 'text', content: before.trim() })
    const duration = match[1] ? Number.parseFloat(match[1]) : 1
    if (duration > 0 && duration <= 30) segments.push({ type: 'pause', duration })
    lastIndex = match.index + match[0].length
  }

  const tail = text.slice(lastIndex)
  if (tail.trim()) segments.push({ type: 'text', content: tail.trim() })
  return segments.length > 0 ? segments : [{ type: 'text', content: text.trim() }]
}

const MAX_CHUNK_CHARS = 300

// Kokoro's tokenizer silently truncates past ~510 phoneme tokens, so no single
// chunk may exceed MAX_CHUNK_CHARS even when the text has no sentence punctuation.
function hardSplit(sentence: string): string[] {
  if (sentence.length <= MAX_CHUNK_CHARS) return [sentence]

  const parts: string[] = []
  let rest = sentence
  while (rest.length > MAX_CHUNK_CHARS) {
    const window = rest.slice(0, MAX_CHUNK_CHARS)
    let cut = Math.max(window.lastIndexOf(','), window.lastIndexOf(';'), window.lastIndexOf(':'))
    if (cut < MAX_CHUNK_CHARS * 0.4) cut = window.lastIndexOf(' ')
    if (cut <= 0) {
      cut = MAX_CHUNK_CHARS
    } else {
      cut += 1
    }
    const part = rest.slice(0, cut).trim()
    if (part) parts.push(part)
    rest = rest.slice(cut).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

export function splitIntoSentences(text: string): string[] {
  if (!text.trim()) return []
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).flatMap(hardSplit)
  if (sentences.length === 0) return [text.trim()]

  const chunks: string[] = []
  let buffer = ''

  for (const s of sentences) {
    if (buffer && buffer.length + s.length + 1 > MAX_CHUNK_CHARS) {
      chunks.push(buffer)
      buffer = s
    } else {
      buffer = buffer ? `${buffer} ${s}` : s
    }
  }
  if (buffer) chunks.push(buffer)
  return chunks
}

export function splitInput(text: string, separateLines: boolean): string[] {
  const normalized = text.trim()
  if (!normalized) return []
  if (!separateLines) return [normalized]

  return normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42)

  return slug || 'bettertts-audio'
}

export type DialogLine = {
  speaker: string | null
  text: string
}

const SPEAKER_PREFIX = /^\[speaker:\s*([^\]]+)\]\s*/i

export function parseDialogLines(text: string): DialogLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(SPEAKER_PREFIX)
      if (match) return { speaker: match[1].trim(), text: line.slice(match[0].length).trim() }
      return { speaker: null, text: line }
    })
    .filter((d) => d.text.length > 0)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
