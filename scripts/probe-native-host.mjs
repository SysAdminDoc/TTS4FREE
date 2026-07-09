#!/usr/bin/env node
// TF-99 end-to-end probe: forks the built native inference host under plain
// Node (advanced serialization = structured clone, matching utilityProcess
// semantics), loads the real Kokoro q8 model through kokoro-js on
// onnxruntime-node, synthesizes a sentence, and reports timing + sample count.
// This exercises the exact code path the desktop app uses, without a GUI.
import { fork } from 'node:child_process'
import { existsSync } from 'node:fs'

const hostPath = 'dist-electron/tts-host.mjs'
if (!existsSync(hostPath)) {
  console.error('Host not built. Run: node scripts/build-electron.mjs')
  process.exit(2)
}

const text = process.argv[2] ?? 'Native inference is working on this machine.'
const voice = process.argv[3] ?? 'af_heart'

const env = { ...process.env, BETTERTTS_MODEL_CACHE: 'dist-electron/model-cache' }
delete env.ELECTRON_RUN_AS_NODE

const child = fork(hostPath, [], {
  serialization: 'advanced',
  stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  env,
})

const startedAt = performance.now()
let loadedAt = 0
let lastProgressLine = ''

const timeout = setTimeout(() => {
  console.error('Probe timed out after 10 minutes.')
  child.kill()
  process.exit(1)
}, 600_000)

function finish(code) {
  clearTimeout(timeout)
  child.kill()
  process.exit(code)
}

child.on('message', (msg) => {
  if (!msg || typeof msg !== 'object') return
  if (msg.type === 'progress') {
    const info = msg.info ?? {}
    if (info.status === 'progress' && info.file && typeof info.progress === 'number') {
      const line = `  downloading ${info.file} ${Math.round(info.progress)}%`
      if (line !== lastProgressLine) {
        lastProgressLine = line
        process.stdout.write(`${line}\r`)
      }
    }
  } else if (msg.type === 'info') {
    console.log(`runtime: ${JSON.stringify(msg.runtime)}`)
    child.send({ type: 'load' })
  } else if (msg.type === 'loaded') {
    loadedAt = performance.now()
    console.log(`\nmodel loaded in ${Math.round(loadedAt - startedAt)} ms (${msg.key})`)
    console.log(`runtime: onnxruntime-node ${msg.runtime.ortVersion} · transformers ${msg.runtime.transformersVersion} · node ${msg.runtime.node} · cache ${msg.runtime.modelCacheDir}`)
    child.send({ type: 'generate', text, voice, speed: 1, id: 1 })
  } else if (msg.type === 'loadError') {
    console.error(`\nload failed: ${msg.message}`)
    finish(1)
  } else if (msg.type === 'generated') {
    const ms = performance.now() - loadedAt
    const seconds = msg.samples.length / 24000
    console.log(
      JSON.stringify({
        ok: true,
        voice,
        samples: msg.samples.length,
        audioSeconds: Number(seconds.toFixed(2)),
        synthMs: Math.round(ms),
        realtimeFactor: Number((seconds / (ms / 1000)).toFixed(2)),
      }),
    )
    finish(0)
  } else if (msg.type === 'generateError') {
    console.error(`generate failed: ${msg.message}`)
    finish(1)
  }
})

child.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`host exited with code ${code}`)
    process.exit(1)
  }
})

child.send({ type: 'info' })
