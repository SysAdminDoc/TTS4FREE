import { formatBytes } from './text.ts'

export const MAX_QUEUE_EXPORT_BYTES = 256 * 1024 * 1024

export function totalBlobBytes(blobs: Pick<Blob, 'size'>[]): number {
  return blobs.reduce((sum, blob) => sum + blob.size, 0)
}

export function queueExportSizeError(blobs: Pick<Blob, 'size'>[], maxBytes = MAX_QUEUE_EXPORT_BYTES): string | null {
  const total = totalBlobBytes(blobs)
  if (total <= maxBytes) return null
  return `Queue export is ${formatBytes(total)}. Export ${formatBytes(maxBytes)} or less at a time.`
}
