import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { type QueueJob, deleteJob, getChunkBlob, getJob, jobProgress, listJobs, nextPendingChunk, saveChunkBlob, saveJob } from './queue.ts'

function makeJob(id: string, chunks = 3): QueueJob {
  return {
    id,
    title: `Job ${id}`,
    createdAt: Date.now(),
    voice: 'af_heart',
    speed: 1,
    format: 'wav',
    bitrate: 128,
    chunks: Array.from({ length: chunks }, (_, i) => ({
      index: i,
      text: `Chunk ${i} text.`,
      status: 'pending' as const,
    })),
  }
}

describe('queue', () => {
  beforeEach(async () => {
    const jobs = await listJobs()
    for (const j of jobs) await deleteJob(j.id)
  })

  it('saves and retrieves a job', async () => {
    const job = makeJob('q1')
    await saveJob(job)
    const retrieved = await getJob('q1')
    expect(retrieved).not.toBeNull()
    expect(retrieved!.title).toBe('Job q1')
    expect(retrieved!.chunks.length).toBe(3)
  })

  it('lists jobs newest-first', async () => {
    await saveJob({ ...makeJob('old'), createdAt: 100 })
    await saveJob({ ...makeJob('new'), createdAt: 300 })
    const jobs = await listJobs()
    expect(jobs[0].id).toBe('new')
    expect(jobs[1].id).toBe('old')
  })

  it('updates an existing job in place', async () => {
    const job = makeJob('q2')
    await saveJob(job)
    job.chunks[0].status = 'done'
    await saveJob(job)
    const updated = await getJob('q2')
    expect(updated!.chunks[0].status).toBe('done')
  })

  it('stores and retrieves chunk blobs', async () => {
    await saveJob(makeJob('q3'))
    const blob = new Blob(['audio data'], { type: 'audio/wav' })
    await saveChunkBlob('q3', 0, blob)
    const retrieved = await getChunkBlob('q3', 0)
    expect(retrieved).not.toBeNull()
    expect(await retrieved!.text()).toBe('audio data')
  })

  it('deleteJob removes job and its chunk blobs', async () => {
    await saveJob(makeJob('q4'))
    await saveChunkBlob('q4', 0, new Blob(['chunk0']))
    await saveChunkBlob('q4', 1, new Blob(['chunk1']))
    await deleteJob('q4')
    expect(await getJob('q4')).toBeNull()
    expect(await getChunkBlob('q4', 0)).toBeNull()
    expect(await getChunkBlob('q4', 1)).toBeNull()
  })

  it('jobProgress computes percentages', () => {
    const job = makeJob('q5')
    job.chunks[0].status = 'done'
    job.chunks[1].status = 'done'
    const { done, total, pct } = jobProgress(job)
    expect(done).toBe(2)
    expect(total).toBe(3)
    expect(pct).toBe(67)
  })

  it('nextPendingChunk finds the first pending', () => {
    const job = makeJob('q6')
    job.chunks[0].status = 'done'
    const next = nextPendingChunk(job)
    expect(next).not.toBeNull()
    expect(next!.index).toBe(1)
  })

  it('nextPendingChunk returns null when all done', () => {
    const job = makeJob('q7')
    for (const c of job.chunks) c.status = 'done'
    expect(nextPendingChunk(job)).toBeNull()
  })
})
