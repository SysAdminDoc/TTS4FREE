import { describe, expect, it } from 'vitest'
import { MAX_QUEUE_EXPORT_BYTES, queueExportSizeError, totalBlobBytes } from './export-guards.ts'

describe('queue export size guards', () => {
  it('sums blob sizes without reading their contents', () => {
    expect(totalBlobBytes([{ size: 10 }, { size: 20 }])).toBe(30)
  })

  it('allows exports at the cap', () => {
    expect(queueExportSizeError([{ size: MAX_QUEUE_EXPORT_BYTES }])).toBeNull()
  })

  it('rejects exports above the browser memory cap', () => {
    expect(queueExportSizeError([{ size: MAX_QUEUE_EXPORT_BYTES + 1 }])).toContain('Export')
  })
})
