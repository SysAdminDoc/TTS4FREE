export type Cue = {
  index: number
  startSec: number
  endSec: number
  text: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// Derive all parts from a single rounded millisecond total; rounding the
// fraction alone can yield ms=1000 and emit invalid stamps like 00:00:02,1000.
function timeParts(sec: number): { h: number; m: number; s: number; ms: number } {
  const totalMs = Math.max(0, Math.round(sec * 1000))
  const ms = totalMs % 1000
  const totalSec = (totalMs - ms) / 1000
  return {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
    ms,
  }
}

function srtTime(sec: number): string {
  const { h, m, s, ms } = timeParts(sec)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${String(ms).padStart(3, '0')}`
}

function vttTime(sec: number): string {
  const { h, m, s, ms } = timeParts(sec)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${String(ms).padStart(3, '0')}`
}

// A blank line inside cue text terminates the block early and corrupts every
// following cue in strict parsers.
function cueText(text: string): string {
  return text.replace(/\n{2,}/g, '\n').trim()
}

export function toSRT(cues: Cue[]): string {
  return cues
    .map((c) => `${c.index}\n${srtTime(c.startSec)} --> ${srtTime(c.endSec)}\n${cueText(c.text)}`)
    .join('\n\n')
}

export function toVTT(cues: Cue[]): string {
  const body = cues
    .map((c) => `${c.index}\n${vttTime(c.startSec)} --> ${vttTime(c.endSec)}\n${cueText(c.text)}`)
    .join('\n\n')
  return `WEBVTT\n\n${body}`
}
