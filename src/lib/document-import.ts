import { unzipSync } from 'fflate'

export type ImportedDocument = {
  kind: 'pdf' | 'docx'
  title: string
  text: string
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export function isDocumentImportFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return file.type === 'application/pdf'
    || file.type === DOCX_MIME
    || name.endsWith('.pdf')
    || name.endsWith('.docx')
}

export async function importDocumentFile(file: File): Promise<ImportedDocument> {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return { kind: 'pdf', title: trimExtension(file.name), text: await extractPdfText(file) }
  }
  if (file.type === DOCX_MIME || name.endsWith('.docx')) {
    return { kind: 'docx', title: trimExtension(file.name), text: await extractDocxText(file) }
  }
  throw new Error('Import supports TXT, EPUB, PDF, and DOCX files.')
}

export async function extractPdfText(file: File): Promise<string> {
  try {
    return await extractPdfTextFromArrayBuffer(await file.arrayBuffer())
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (/password|encrypted|drm/i.test(message)) {
      throw new Error('Password-protected or encrypted PDFs cannot be imported locally.')
    }
    if (/No selectable text/i.test(message)) throw err
    throw new Error('PDF import failed. The file may be damaged, encrypted, or unsupported.')
  }
}

export async function extractPdfTextFromArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    isEvalSupported: false,
  } as Parameters<typeof pdfjs.getDocument>[0] & { disableWorker: boolean })
  const pdf = await loadingTask.promise
  try {
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const lines = textContentToLines(content.items as PdfTextItem[])
      if (lines) pages.push(lines)
    }
    const text = normalizeTextBlocks(pages.join('\n\n'))
    if (!text) throw new Error('No selectable text found in this PDF. Scanned PDFs need OCR before importing.')
    return text
  } finally {
    await loadingTask.destroy()
  }
}

export async function extractDocxText(file: File): Promise<string> {
  return extractDocxTextFromArrayBuffer(await file.arrayBuffer())
}

export function extractDocxTextFromArrayBuffer(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer))
  const documentKey = Object.keys(files).find((key) => key.replace(/^\/+/, '') === 'word/document.xml')
  if (!documentKey) throw new Error('DOCX import failed. The file is missing word/document.xml.')

  const xml = new TextDecoder('utf-8').decode(files[documentKey])
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('DOCX import failed. The document XML is damaged.')

  const body = Array.from(doc.getElementsByTagName('*')).find((element) => localName(element) === 'body')
  if (!body) throw new Error('DOCX import failed. The document body is missing.')

  const text = normalizeTextBlocks(extractDocxNodeText(body))
  if (!text) throw new Error('DOCX contains no readable text content.')
  return text
}

type PdfTextItem = {
  str?: string
  hasEOL?: boolean
}

function textContentToLines(items: PdfTextItem[]): string {
  const lines: string[] = []
  let current = ''
  for (const item of items) {
    if (typeof item.str !== 'string') continue
    current += item.str
    if (item.hasEOL) {
      lines.push(current)
      current = ''
    } else if (item.str.trim()) {
      current += ' '
    }
  }
  if (current.trim()) lines.push(current)
  return normalizeTextBlocks(lines.join('\n'))
}

function extractDocxNodeText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const element = node as Element
  const tag = localName(element)
  if (['delText', 'footnoteReference', 'endnoteReference', 'annotationRef', 'drawing', 'pict', 'object'].includes(tag)) return ''
  if (tag === 't') return element.textContent ?? ''
  if (tag === 'tab') return '\t'
  if (tag === 'br' || tag === 'cr') return '\n'

  const inner = Array.from(element.childNodes).map(extractDocxNodeText).join('')
  if (tag === 'p') return `${inner.trim()}\n`
  if (tag === 'tr') return `${inner.trim()}\n`
  if (tag === 'tc') return `${inner.trim()}\t`
  return inner
}

function localName(element: Element): string {
  return element.localName || element.tagName.replace(/^.*:/, '')
}

function normalizeTextBlocks(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\t+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function trimExtension(name: string): string {
  return name.replace(/\.(pdf|docx)$/i, '').trim() || 'Imported document'
}
