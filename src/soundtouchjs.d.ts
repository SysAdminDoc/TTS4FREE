declare module 'soundtouchjs' {
  export class SoundTouch {
    pitchSemitones: number
    pitch: number
    rate: number
    tempo: number
    inputBuffer: { putSamples(samples: Float32Array, position?: number, numFrames?: number): void }
  }

  export class SimpleFilter {
    constructor(source: { extract(target: Float32Array, numFrames: number, position: number): number }, soundTouch: SoundTouch)
    extract(target: Float32Array, numFrames: number): number
  }
}
