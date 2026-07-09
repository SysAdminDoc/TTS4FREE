import { kokoroLanguageForVoice } from './voices.ts'

export function needsDirectKokoroPath(voice: string, voiceBin?: Float32Array): boolean {
  const language = kokoroLanguageForVoice(voice).phonemeLanguage
  return Boolean(voiceBin) || (language !== 'en-us' && language !== 'en')
}
