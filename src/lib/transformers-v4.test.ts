import { describe, expect, it } from 'vitest'
import { ModelRegistry } from '@huggingface/transformers'

describe('Transformers.js v4 registry APIs', () => {
  it('exposes the ModelRegistry methods used for exact download metadata', () => {
    expect(typeof ModelRegistry.get_pipeline_files).toBe('function')
    expect(typeof ModelRegistry.is_pipeline_cached).toBe('function')
    expect(typeof ModelRegistry.clear_pipeline_cache).toBe('function')
    expect(typeof ModelRegistry.get_file_metadata).toBe('function')
  })
})
