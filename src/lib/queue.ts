import type { AudioFormat } from './encode.ts'
import type { VoiceId } from './voices.ts'

export type ChunkStatus = 'pending' | 'generating' | 'done' | 'failed'

export type QueueChunk = {
  index: number
  text: string
  status: ChunkStatus
  blobKey?: string
  error?: string
}

export type QueueJob = {
  id: string
  title: string
  createdAt: number
  voice: VoiceId | string
  speed: number
  format: AudioFormat
  bitrate: number
  chunks: QueueChunk[]
}

const DB_NAME = 'bettertts-queue'
const DB_VERSION = 1
const JOBS_STORE = 'jobs'
const CHUNKS_STORE = 'chunks'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(JOBS_STORE)) db.createObjectStore(JOBS_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) db.createObjectStore(CHUNKS_STORE)
    }
    req.onblocked = () => {
      dbPromise = null
      reject(new Error('Queue DB blocked'))
    }
    req.onsuccess = () => {
      const db = req.result
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function saveJob(job: QueueJob): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(JOBS_STORE, 'readwrite')
  tx.objectStore(JOBS_STORE).put(job)
  await txDone(tx)
}

export async function listJobs(): Promise<QueueJob[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(JOBS_STORE, 'readonly')
    const req = tx.objectStore(JOBS_STORE).getAll()
    req.onsuccess = () => {
      const jobs = req.result as QueueJob[]
      jobs.sort((a, b) => b.createdAt - a.createdAt)
      resolve(jobs)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getJob(id: string): Promise<QueueJob | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(JOBS_STORE, 'readonly')
    const req = tx.objectStore(JOBS_STORE).get(id)
    req.onsuccess = () => resolve((req.result as QueueJob) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteJob(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction([JOBS_STORE, CHUNKS_STORE], 'readwrite')
  tx.objectStore(JOBS_STORE).delete(id)
  // Chunk blobs are keyed as "{jobId}:{chunkIndex}"
  const cursorReq = tx.objectStore(CHUNKS_STORE).openCursor()
  cursorReq.onsuccess = () => {
    const cursor = cursorReq.result
    if (cursor) {
      if (typeof cursor.key === 'string' && cursor.key.startsWith(`${id}:`)) cursor.delete()
      cursor.continue()
    }
  }
  await txDone(tx)
}

export async function saveChunkBlob(jobId: string, chunkIndex: number, blob: Blob): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(CHUNKS_STORE, 'readwrite')
  tx.objectStore(CHUNKS_STORE).put(blob, `${jobId}:${chunkIndex}`)
  await txDone(tx)
}

export async function getChunkBlob(jobId: string, chunkIndex: number): Promise<Blob | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, 'readonly')
    const req = tx.objectStore(CHUNKS_STORE).get(`${jobId}:${chunkIndex}`)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export function jobProgress(job: QueueJob): { done: number; total: number; pct: number } {
  const total = job.chunks.length
  const done = job.chunks.filter((c) => c.status === 'done').length
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
}

export function nextPendingChunk(job: QueueJob): QueueChunk | null {
  return job.chunks.find((c) => c.status === 'pending') ?? null
}
