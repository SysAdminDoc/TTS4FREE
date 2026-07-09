export const TRANSFORMERS_RUNTIME_VERSION = '4.2.0'
export const TRANSFORMERS_V43_TARGET_VERSION = '4.3.0'

export type CrossOriginStorageStatus = {
  api: 'navigator.crossOriginStorage'
  exposed: boolean
  requestFileHandle: boolean
  secureContext: boolean | null
  usable: boolean
  defaultBehavior: 'disabled'
  message: string
}

export type TransformersUpgradeCriterion = {
  id: string
  label: string
  met: boolean
  required: boolean
}

export type TransformersUpgradeReadiness = {
  currentVersion: string
  targetVersion: string
  readyToSwitch: boolean
  criteria: TransformersUpgradeCriterion[]
}

type CrossOriginStorageProbe = {
  navigator?: {
    crossOriginStorage?: unknown
  }
  secureContext?: boolean | null
}

type TransformersReadinessInput = {
  currentVersion?: string
  targetVersion?: string
  candidateEngineSuitePassed?: boolean
  currentRegistryApisVerified?: boolean
}

type CrossOriginStorageManagerLike = {
  requestFileHandle?: unknown
}

export function detectCrossOriginStorage(probe: CrossOriginStorageProbe = {}): CrossOriginStorageStatus {
  const navigatorLike = probe.navigator ?? (typeof navigator === 'undefined' ? undefined : navigator as CrossOriginStorageProbe['navigator'])
  const secureContext = probe.secureContext ?? (typeof isSecureContext === 'boolean' ? isSecureContext : null)
  const manager = navigatorLike?.crossOriginStorage as CrossOriginStorageManagerLike | undefined
  const exposed = manager != null && typeof manager === 'object'
  const requestFileHandle = typeof manager?.requestFileHandle === 'function'
  const usable = exposed && requestFileHandle && secureContext !== false

  return {
    api: 'navigator.crossOriginStorage',
    exposed,
    requestFileHandle,
    secureContext,
    usable,
    defaultBehavior: 'disabled',
    message: usable
      ? 'Experimental Cross-Origin Storage API detected; BetterTTS still uses the per-origin Cache API by default.'
      : exposed
        ? 'Experimental Cross-Origin Storage is exposed but does not provide the expected requestFileHandle() method.'
        : 'Cross-Origin Storage is not exposed; BetterTTS uses the per-origin Cache API by default.',
  }
}

export function transformersUpgradeReadiness(input: TransformersReadinessInput = {}): TransformersUpgradeReadiness {
  const currentVersion = input.currentVersion ?? TRANSFORMERS_RUNTIME_VERSION
  const targetVersion = input.targetVersion ?? TRANSFORMERS_V43_TARGET_VERSION
  const criteria: TransformersUpgradeCriterion[] = [
    {
      id: 'candidate-version',
      label: `Candidate runtime is ${targetVersion} or newer`,
      met: compareSemver(currentVersion, targetVersion) >= 0,
      required: true,
    },
    {
      id: 'registry-apis',
      label: 'ModelRegistry cache and metadata APIs are present',
      met: input.currentRegistryApisVerified ?? true,
      required: true,
    },
    {
      id: 'engine-suite',
      label: 'Kokoro, Supertonic, KittenTTS, and Transformers.js v4 compatibility tests pass under the candidate runtime',
      met: input.candidateEngineSuitePassed ?? false,
      required: true,
    },
  ]

  return {
    currentVersion,
    targetVersion,
    readyToSwitch: criteria.every((criterion) => !criterion.required || criterion.met),
    criteria,
  }
}

function compareSemver(left: string, right: string): number {
  const a = parseSemver(left)
  const b = parseSemver(right)
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1
  }
  return 0
}

function parseSemver(version: string): [number, number, number] {
  const parts = version.replace(/^[^\d]*/, '').split('.').map((part) => Number.parseInt(part, 10))
  return [
    Number.isFinite(parts[0]) ? parts[0] : 0,
    Number.isFinite(parts[1]) ? parts[1] : 0,
    Number.isFinite(parts[2]) ? parts[2] : 0,
  ]
}
