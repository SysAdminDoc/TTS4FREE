export type Cue = {
  index: number
  startSec: number
  endSec: number
  text: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function srtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec % 1) * 1000)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${String(ms).padStart(3, '0')}`
}

function vttTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec % 1) * 1000)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${String(ms).padStart(3, '0')}`
}

export function toSRT(cues: Cue[]): string {
  return cues
    .map((c) => `${c.index}\n${srtTime(c.startSec)} --> ${srtTime(c.endSec)}\n${c.text}`)
    .join('\n\n')
}

export function toVTT(cues: Cue[]): string {
  const body = cues
    .map((c) => `${c.index}\n${vttTime(c.startSec)} --> ${vttTime(c.endSec)}\n${c.text}`)
    .join('\n\n')
  return `WEBVTT\n\n${body}`
}
