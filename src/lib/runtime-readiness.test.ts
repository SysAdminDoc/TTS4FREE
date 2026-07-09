import { describe, expect, it } from 'vitest'
import {
  detectCrossOriginStorage,
  transformersUpgradeReadiness,
} from './runtime-readiness.ts'

describe('Cross-Origin Storage detection', () => {
  it('keeps the default cache path when the experimental API is absent', () => {
    const status = detectCrossOriginStorage({ navigator: {}, secureContext: true })

    expect(status.usable).toBe(false)
    expect(status.exposed).toBe(false)
    expect(status.defaultBehavior).toBe('disabled')
    expect(status.message).toContain('per-origin Cache API')
  })

  it('recognizes the proposed requestFileHandle surface without invoking it', () => {
    let called = false
    const status = detectCrossOriginStorage({
      navigator: {
        crossOriginStorage: {
          requestFileHandle: () => {
            called = true
          },
        },
      },
      secureContext: true,
    })

    expect(status.usable).toBe(true)
    expect(status.requestFileHandle).toBe(true)
    expect(status.defaultBehavior).toBe('disabled')
    expect(called).toBe(false)
  })
})

describe('Transformers.js upgrade readiness', () => {
  it('keeps the current 4.2 runtime gated from the 4.3 target', () => {
    const readiness = transformersUpgradeReadiness()

    expect(readiness.currentVersion).toBe('4.2.0')
    expect(readiness.targetVersion).toBe('4.3.0')
    expect(readiness.readyToSwitch).toBe(false)
    expect(readiness.criteria.find((criterion) => criterion.id === 'candidate-version')?.met).toBe(false)
    expect(readiness.criteria.find((criterion) => criterion.id === 'engine-suite')?.met).toBe(false)
  })

  it('marks a candidate ready only after the engine compatibility suite passes', () => {
    expect(transformersUpgradeReadiness({
      currentVersion: '4.3.0',
      candidateEngineSuitePassed: false,
    }).readyToSwitch).toBe(false)

    expect(transformersUpgradeReadiness({
      currentVersion: '4.3.1',
      candidateEngineSuitePassed: true,
    }).readyToSwitch).toBe(true)
  })
})
