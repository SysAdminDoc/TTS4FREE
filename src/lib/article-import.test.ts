import { describe, expect, it } from 'vitest'
import { readArticleResponseText } from './article-import.ts'

describe('readArticleResponseText', () => {
  it('reads supported article text responses', async () => {
    const response = new Response('<article>Hello</article>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })

    await expect(readArticleResponseText(response, 128)).resolves.toBe('<article>Hello</article>')
  })

  it('rejects unsupported content types before reading the body', async () => {
    const response = new Response('not an article', {
      headers: { 'content-type': 'image/svg+xml' },
    })

    await expect(readArticleResponseText(response, 128)).rejects.toThrow('Unsupported article content type')
  })

  it('rejects oversized content-length before reading the body', async () => {
    const response = new Response('small body', {
      headers: {
        'content-length': '4096',
        'content-type': 'text/html',
      },
    })

    await expect(readArticleResponseText(response, 128)).rejects.toThrow('Article response is too large')
  })

  it('cancels streaming responses once the byte cap is crossed', async () => {
    let cancelled = false
    let pullCount = 0
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pullCount += 1
        controller.enqueue(encoder.encode('x'.repeat(80)))
      },
      cancel() {
        cancelled = true
      },
    })
    const response = new Response(stream, {
      headers: { 'content-type': 'text/html' },
    })

    await expect(readArticleResponseText(response, 128)).rejects.toThrow('Article response is too large')
    expect(cancelled).toBe(true)
    expect(pullCount).toBeLessThan(4)
  })
})
