export const MAX_ARTICLE_IMPORT_BYTES = 2 * 1024 * 1024

const ARTICLE_CONTENT_TYPES = [
  'text/html',
  'application/xhtml+xml',
  'text/plain',
  'application/xml',
  'text/xml',
]

export async function readArticleResponseText(response: Response, maxBytes = MAX_ARTICLE_IMPORT_BYTES): Promise<string> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (contentType && !ARTICLE_CONTENT_TYPES.some((allowed) => contentType.includes(allowed))) {
    throw new Error('Unsupported article content type.')
  }

  const contentLength = Number(response.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error('Article response is too large.')
  }

  if (!response.body) {
    const text = await response.text()
    if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('Article response is too large.')
    return text
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      if (received > maxBytes) {
        await reader.cancel()
        throw new Error('Article response is too large.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}
