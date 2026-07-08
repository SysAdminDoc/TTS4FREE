export type ClipRecord = {
  id: string
  filename: string
  label: string
  voice: string
  speed: number
  createdAt: number
  size: number
  duration: string
}

const DB_NAME = 'tts4free-library'
const DB_VERSION = 1
const CLIPS_STORE = 'clips'
const BLOBS_STORE = 'blobs'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(CLIPS_STORE)) db.createObjectStore(CLIPS_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(BLOBS_STORE)) db.createObjectStore(BLOBS_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function saveClip(record: ClipRecord, blob: Blob): Promise<void> {
  const db = await openDB()
  const tx = db.transaction([CLIPS_STORE, BLOBS_STORE], 'readwrite')
  tx.objectStore(CLIPS_STORE).put(record)
  tx.objectStore(BLOBS_STORE).put(blob, record.id)
  await txDone(tx)
}

export async function listClips(): Promise<ClipRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CLIPS_STORE, 'readonly')
    const req = tx.objectStore(CLIPS_STORE).getAll()
    req.onsuccess = () => {
      const records = req.result as ClipRecord[]
      records.sort((a, b) => b.createdAt - a.createdAt)
      resolve(records)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getClipBlob(id: string): Promise<Blob | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOBS_STORE, 'readonly')
    const req = tx.objectStore(BLOBS_STORE).get(id)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteClip(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction([CLIPS_STORE, BLOBS_STORE], 'readwrite')
  tx.objectStore(CLIPS_STORE).delete(id)
  tx.objectStore(BLOBS_STORE).delete(id)
  await txDone(tx)
}

export async function clearLibrary(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction([CLIPS_STORE, BLOBS_STORE], 'readwrite')
  tx.objectStore(CLIPS_STORE).clear()
  tx.objectStore(BLOBS_STORE).clear()
  await txDone(tx)
}
