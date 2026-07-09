#!/usr/bin/env node
import { createWriteStream, existsSync, mkdirSync, rmSync, statSync, copyFileSync, renameSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const repoRoot = resolve(import.meta.dirname, '..')
const modelId = 'ayousanz/piper-plus-tsukuyomi-chan'
const hfResolveBase = `https://huggingface.co/${modelId}/resolve/main`
const pagesFileCap = 100 * 1000 * 1000
const targetRoot = resolve(repoRoot, process.argv[2] ?? join('dist', 'models', modelId))
const distRoot = resolve(repoRoot, 'dist')
const cacheRoot = resolve(repoRoot, 'node_modules', '.cache', 'bettertts-model-assets', modelId)
const onnxFile = 'tsukuyomi-chan-6lang-fp16.onnx'

const remoteAssets = [
  { path: onnxFile, size: 39_652_717 },
  { path: 'config.json', size: null },
]

if (!targetRoot.startsWith(`${distRoot}${sep}`)) {
  console.error(`Refusing to sync Piper assets outside dist/: ${targetRoot}`)
  process.exit(1)
}

mkdirSync(targetRoot, { recursive: true })
rmSync(targetRoot, { recursive: true, force: true })
mkdirSync(targetRoot, { recursive: true })

let totalBytes = 0

for (const asset of remoteAssets) {
  if (asset.size != null) validatePagesFileSize(asset.path, asset.size)
  const cached = await ensureRemoteAsset(asset)
  const target = join(targetRoot, asset.path)
  copyAsset(cached, target, asset.size)
  totalBytes += statSync(target).size
}

copyFileSync(join(targetRoot, 'config.json'), join(targetRoot, `${onnxFile}.json`))
totalBytes += statSync(join(targetRoot, `${onnxFile}.json`)).size

console.log(`Synced Piper-plus assets (${formatBytes(totalBytes)}) to ${targetRoot}`)

async function ensureRemoteAsset(asset) {
  const cachedPath = join(cacheRoot, asset.path)
  if (existsSync(cachedPath) && (asset.size == null || statSync(cachedPath).size === asset.size)) return cachedPath

  mkdirSync(dirname(cachedPath), { recursive: true })
  const tempPath = `${cachedPath}.tmp-${process.pid}`
  const url = `${hfResolveBase}/${asset.path}`
  const response = await fetchWithRetry(url)
  if (!response.body) throw new Error(`No response body for ${url}`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(tempPath))
  if (asset.size != null && statSync(tempPath).size !== asset.size) {
    rmSync(tempPath, { force: true })
    throw new Error(`Downloaded ${asset.path} with unexpected size`)
  }
  rmSync(cachedPath, { force: true })
  renameSync(tempPath, cachedPath)
  return cachedPath
}

async function fetchWithRetry(url) {
  let response = await fetch(url)
  for (let attempt = 0; attempt < 2 && response.status === 429; attempt += 1) {
    const delayMs = [1000, 2500][attempt]
    console.warn(`Rate limited downloading ${url}; retrying in ${Math.round(delayMs / 1000)}s`)
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    response = await fetch(url)
  }
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  return response
}

function validatePagesFileSize(path, size) {
  if (size > pagesFileCap) {
    console.error(`${path} is ${formatBytes(size)}, above the GitHub Pages 100 MB per-file cap`)
    process.exit(1)
  }
}

function copyAsset(source, target, expectedSize) {
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(source, target)
  if (expectedSize != null && statSync(target).size !== expectedSize) throw new Error(`Copied ${target} with unexpected size`)
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
