import { splitIntoSentences } from './text.ts'

function getBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis
  const voices = synth.getVoices()
  if (voices.length > 0) return Promise.resolve(voices)

  return new Promise((resolve) => {
    const onReady = () => {
      synth.removeEventListener('voiceschanged', onReady)
      resolve(synth.getVoices())
    }
    synth.addEventListener('voiceschanged', onReady)
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', onReady)
      resolve(synth.getVoices())
    }, 2000)
  })
}

export async function speakBrowser(
  text: string,
  speed: number,
  chosenVoice?: SpeechSynthesisVoice,
  shouldAbort?: () => boolean,
) {
  if (!('speechSynthesis' in window)) {
    throw new Error('This browser does not expose speech synthesis.')
  }

  const synth = window.speechSynthesis
  synth.cancel()

  const voice = chosenVoice ?? (await getBrowserVoices()).find((v) => v.lang.toLowerCase().startsWith('en')) ?? null
  const chunks = splitIntoSentences(text)
  const rate = Math.max(0.5, Math.min(1.5, speed))

  for (const chunk of chunks) {
    if (shouldAbort?.()) {
      synth.cancel()
      return
    }
    await new Promise<void>((resolve, reject) => {
      const utt = new SpeechSynthesisUtterance(chunk)
      utt.rate = rate
      utt.voice = voice

      // Scale the stall watchdog with utterance length and rate; a fixed 20s
      // cancels legitimate long utterances at slow speeds.
      const watchdogMs = Math.max(10000, Math.round((chunk.length * 120) / rate))
      const watchdog = setTimeout(() => {
        synth.cancel()
        resolve()
      }, watchdogMs)
      const abortPoll = shouldAbort
        ? setInterval(() => {
            if (shouldAbort()) synth.cancel()
          }, 250)
        : null
      const cleanup = () => {
        clearTimeout(watchdog)
        if (abortPoll) clearInterval(abortPoll)
      }

      utt.onend = () => {
        cleanup()
        resolve()
      }
      utt.onerror = (ev) => {
        cleanup()
        if (ev.error === 'interrupted' || ev.error === 'canceled') resolve()
        else reject(new Error('Browser speech playback failed.'))
      }

      synth.speak(utt)
    })
    if (shouldAbort?.()) return
  }
}
