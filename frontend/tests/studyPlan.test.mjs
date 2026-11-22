import assert from 'node:assert/strict'
import test from 'node:test'
import { isPractice, PLAN_STORAGE_KEY, readStudyLog, resultLabel, saveStudyEntry } from '../src/lib/studyPlan.ts'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

test('public plan accepts only the four practice identifiers', () => {
  for (const id of ['reading', 'listening', 'writing', 'translation']) assert.equal(isPractice(id), true)
  for (const id of ['review-only', 'unknown', 'constructor', null]) assert.equal(isPractice(id), false)
  assert.equal(resultLabel('review-only'), '仅复习')
})

test('one manual result per day, preserving previous days and vocabulary storage', () => {
  const storage = memoryStorage()
  storage.setItem('liuji-daily-library-progress-v1', '{"sentinel":true}')
  assert.deepEqual(readStudyLog(storage), {})
  saveStudyEntry(storage, '2026-11-22', { result: 'review-only', note: '' })
  saveStudyEntry(storage, '2026-11-22', { result: 'reading', note: '  漏看转折  ' })
  saveStudyEntry(storage, '2026-11-23', { result: 'translation', note: '' })
  assert.deepEqual(readStudyLog(storage), {
    '2026-11-22': { result: 'reading', note: '漏看转折' },
    '2026-11-23': { result: 'translation', note: '' },
  })
  assert.equal(storage.getItem('liuji-daily-library-progress-v1'), '{"sentinel":true}')
})

test('invalid input and corrupt existing storage do not overwrite data', () => {
  const storage = memoryStorage()
  assert.throws(() => saveStudyEntry(storage, '2026-02-30', { result: 'reading', note: '' }))
  assert.throws(() => saveStudyEntry(storage, '2026-11-22', { result: 'reading', note: 'x'.repeat(161) }))
  assert.equal(storage.getItem(PLAN_STORAGE_KEY), null)
  for (const raw of ['', '[]', '{"2026-11-22":{"result":"unknown","note":""}}']) {
    storage.setItem(PLAN_STORAGE_KEY, raw)
    assert.throws(() => saveStudyEntry(storage, '2026-11-22', { result: 'review-only', note: '' }))
    assert.equal(storage.getItem(PLAN_STORAGE_KEY), raw)
  }
})
