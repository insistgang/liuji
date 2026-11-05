import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { readRecordsStrict, REVIEW_INTERVALS, reviewStage, scheduleReview } from '../src/store/dailyLibrary.ts'

function addDays(date, days) {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

afterEach(() => { delete globalThis.localStorage })

test('first learning starts tomorrow and follows all six intervals', () => {
  let today = '2026-11-05'
  let record
  for (const [index, interval] of REVIEW_INTERVALS.entries()) {
    record = scheduleReview(record, true, today)
    assert.equal(record.stage, index + 1)
    assert.equal(record.interval, interval)
    assert.equal(record.due, addDays(today, interval))
    assert.equal(record.learned, '2026-11-05')
    today = record.due
  }
  record = scheduleReview(record, true, today)
  assert.equal(record.stage, 6)
  assert.equal(record.interval, 30)
})

test('early and repeated answers do not skip stages or postpone a scheduled review', () => {
  const first = scheduleReview(undefined, true, '2026-11-05')
  assert.deepEqual(scheduleReview(first, true, '2026-11-05'), first)
  const second = scheduleReview(first, true, first.due)
  const early = scheduleReview(second, true, '2026-11-07')
  assert.equal(early.stage, 2)
  assert.equal(early.due, second.due)
  assert.equal(scheduleReview(early, true, second.due).stage, 3)
})

test('forgotten words remain due today and restart at one day after recall', () => {
  const old = { learned: '2026-10-20', reviewed: ['2026-10-20'], due: '2026-11-04', interval: 15, stage: 5 }
  const forgotten = scheduleReview(old, false, '2026-11-05')
  assert.equal(forgotten.stage, 0)
  assert.equal(forgotten.due, '2026-11-05')
  const recalled = scheduleReview(forgotten, true, '2026-11-05')
  assert.equal(recalled.stage, 1)
  assert.equal(recalled.due, '2026-11-06')
  assert.equal(recalled.learned, old.learned)
})

test('overdue review advances only once from the actual review date', () => {
  const old = { learned: '2026-10-20', reviewed: ['2026-10-20'], due: '2026-10-21', interval: 1, stage: 1 }
  const reviewed = scheduleReview(old, true, '2026-11-05')
  assert.equal(reviewed.stage, 2)
  assert.equal(reviewed.due, '2026-11-07')
})

test('legacy progress retains dates and is mapped to the closest completed interval', () => {
  const old = { learned: '2026-10-20', reviewed: ['2026-10-20'], due: '2026-11-01', interval: 8 }
  assert.equal(reviewStage(old), 4)
  const reviewed = scheduleReview(old, true, '2026-11-05')
  assert.equal(reviewed.stage, 5)
  assert.equal(reviewed.due, '2026-11-20')
  globalThis.localStorage = { getItem: () => JSON.stringify({ word: old }) }
  assert.deepEqual(readRecordsStrict(), { word: old })
})

test('malformed stored progress and impossible dates are rejected rather than overwritten', () => {
  const valid = { learned: '2026-11-05', reviewed: [], due: '2026-11-06', interval: 1, stage: 1 }
  const invalid = [
    'null', '[]', '{', JSON.stringify({ word: { learned: 'bad' } }),
    JSON.stringify({ word: { ...valid, due: '2026-02-30' } }),
    JSON.stringify({ word: { ...valid, learned: '2026-11-31' } }),
  ]
  for (const value of invalid) {
    globalThis.localStorage = { getItem: () => value }
    assert.throws(() => readRecordsStrict())
  }
})

test('date arithmetic handles month and year boundaries', () => {
  assert.equal(scheduleReview(undefined, true, '2026-12-31').due, '2027-01-01')
  assert.equal(scheduleReview(undefined, true, '2028-02-28').due, '2028-02-29')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2028-02-28', 1), '2028-02-29')
})

test('memory strength ratings follow the 默默背单词 style ladder', () => {
  const fresh = scheduleReview(undefined, true, '2026-11-05', 4)
  assert.equal(fresh.stage, 1)
  assert.equal(fresh.due, '2026-11-06')

  const vague = scheduleReview(fresh, true, '2026-11-06', 3)
  assert.equal(vague.stage, 1)
  assert.equal(vague.due, '2026-11-06')

  const known = scheduleReview(fresh, true, '2026-11-06', 4)
  assert.equal(known.stage, 2)
  assert.equal(known.due, '2026-11-08')

  const strong = scheduleReview(fresh, true, '2026-11-06', 5)
  assert.equal(strong.stage, 3)
  assert.equal(strong.due, '2026-11-10')

  const forgotten = scheduleReview(known, false, '2026-11-08', 1)
  assert.equal(forgotten.stage, 0)
  assert.equal(forgotten.interval, 0)
  assert.equal(forgotten.due, '2026-11-08')

  const capped = scheduleReview({ learned: '2026-10-01', reviewed: ['2026-10-01'], due: '2026-11-05', interval: 30, stage: 5 }, true, '2026-11-05', 5)
  assert.equal(capped.stage, 6)
  assert.equal(capped.interval, 30)
})

test('very familiar words on a first sighting skip the shortest interval', () => {
  const strong = scheduleReview(undefined, true, '2026-11-05', 5)
  assert.equal(strong.stage, 2)
  assert.equal(strong.due, '2026-11-07')
})
