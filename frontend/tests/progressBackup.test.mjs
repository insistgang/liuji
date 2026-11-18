import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  applyBackupImport,
  encodeSyncCode,
  mergeDailyRecords,
  parseBackupInput,
  serializeBackupJson,
  SYNC_CODE_PREFIX,
} from '../src/lib/progressBackup.ts'
import { ACCENT_STORAGE_KEY, AUTO_SPEAK_STORAGE_KEY } from '../src/lib/speech.ts'
import { PROGRESS_KEY, readRecordsStrict } from '../src/store/dailyLibrary.ts'
import { THEME_STORAGE_KEY } from '../src/store/themeStore.ts'

function mockStorage(initial = {}) {
  const store = new Map(Object.entries(initial))
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, String(value))
    },
    removeItem: (key) => {
      store.delete(key)
    },
  }
  return store
}

afterEach(() => {
  delete globalThis.localStorage
  delete globalThis.window
})

test('serializeBackupJson round-trips daily records and user preferences', () => {
  mockStorage({
    [THEME_STORAGE_KEY]: 'sepia',
    [ACCENT_STORAGE_KEY]: 'uk',
    [AUTO_SPEAK_STORAGE_KEY]: 'true',
  })

  const records = {
    '2026-11-17:intuitive': {
      learned: '2026-11-17',
      reviewed: ['2026-11-17', '2026-11-18'],
      due: '2026-11-20',
      interval: 2,
      stage: 2,
    },
  }

  const json = serializeBackupJson(records)
  const parsed = parseBackupInput(json)
  assert.deepEqual(parsed.dailyRecords, records)
  assert.deepEqual(parsed.preferences, {
    theme: 'sepia',
    accent: 'uk',
    autoSpeak: true,
  })
})

test('encodeSyncCode round-trips compact records cleanly', () => {
  const records = {
    '2026-11-16:wrap up': {
      learned: '2026-11-16',
      reviewed: ['2026-11-16'],
      due: '2026-11-17',
      interval: 1,
      stage: 1,
    },
    '2026-11-17:concede': {
      learned: '2026-11-17',
      reviewed: ['2026-11-17'],
      due: '2026-11-17',
      interval: 0,
    },
  }

  const code = encodeSyncCode(records)
  assert.ok(code.startsWith(SYNC_CODE_PREFIX))
  const parsed = parseBackupInput(code)
  assert.deepEqual(parsed.dailyRecords, records)
})

test('mergeDailyRecords combines disjoint keys, unions reviews, and picks stronger state', () => {
  const current = {
    '2026-11-10:alpha': {
      learned: '2026-11-12',
      reviewed: ['2026-11-12'],
      due: '2026-11-13',
      interval: 1,
      stage: 1,
    },
    '2026-11-10:beta': {
      learned: '2026-11-10',
      reviewed: ['2026-11-10', '2026-11-15'],
      due: '2026-11-19',
      interval: 4,
      stage: 3,
    },
    '2026-11-10:gamma': {
      learned: '2026-11-10',
      reviewed: ['2026-11-14'],
      due: '2026-11-15',
      interval: 1,
      stage: 1,
    },
  }

  const incoming = {
    '2026-11-10:alpha': {
      learned: '2026-11-10',
      reviewed: ['2026-11-10', '2026-11-14'],
      due: '2026-11-18',
      interval: 4,
      stage: 3,
    },
    '2026-11-10:beta': {
      learned: '2026-11-11',
      reviewed: ['2026-11-15'],
      due: '2026-11-22',
      interval: 7,
      stage: 4,
    },
    '2026-11-10:delta': {
      learned: '2026-11-17',
      reviewed: ['2026-11-17'],
      due: '2026-11-18',
      interval: 1,
      stage: 1,
    },
  }

  const { merged, added, updated, total } = mergeDailyRecords(current, incoming)
  assert.equal(added, 1)
  assert.equal(updated, 2)
  assert.equal(total, 4)

  // Earliest learned preserved, reviewed unioned & sorted, newer review date wins
  assert.deepEqual(merged['2026-11-10:alpha'], {
    learned: '2026-11-10',
    reviewed: ['2026-11-10', '2026-11-12', '2026-11-14'],
    due: '2026-11-18',
    interval: 4,
    stage: 3,
  })

  // Same-day tie picks higher stage
  assert.deepEqual(merged['2026-11-10:beta'], {
    learned: '2026-11-10',
    reviewed: ['2026-11-10', '2026-11-15'],
    due: '2026-11-22',
    interval: 7,
    stage: 4,
  })

  // Untouched & newly added preserved
  assert.deepEqual(merged['2026-11-10:gamma'], current['2026-11-10:gamma'])
  assert.deepEqual(merged['2026-11-10:delta'], incoming['2026-11-10:delta'])
})

test('applyBackupImport rejects invalid payloads without mutating existing storage', () => {
  const existing = {
    '2026-11-17:word': {
      learned: '2026-11-17',
      reviewed: ['2026-11-17'],
      due: '2026-11-18',
      interval: 1,
      stage: 1,
    },
  }
  mockStorage({ [PROGRESS_KEY]: JSON.stringify(existing) })

  const invalidPayloads = [
    '',
    '{bad json',
    `${SYNC_CODE_PREFIX}!!!invalid-base64!!!`,
    JSON.stringify({
      app: 'liuji',
      version: 1,
      dailyRecords: {
        '2026-11-17:bad': {
          learned: '2026-02-30',
          reviewed: ['2026-02-30'],
          due: '2026-03-01',
          interval: 1,
          stage: 1,
        },
      },
    }),
    JSON.stringify({
      '2026-11-17:neg': {
        learned: '2026-11-17',
        reviewed: ['2026-11-17'],
        due: '2026-11-18',
        interval: -3,
        stage: 1,
      },
    }),
  ]

  for (const payload of invalidPayloads) {
    assert.throws(() => applyBackupImport(payload, 'merge'))
    assert.throws(() => applyBackupImport(payload, 'replace'))
    assert.deepEqual(readRecordsStrict(), existing)
  }

  // Corrupted existing localStorage is also never overwritten during merge
  mockStorage({ [PROGRESS_KEY]: '{"broken":{"learned":"bad"}}' })
  const validCode = encodeSyncCode(existing)
  assert.throws(() => applyBackupImport(validCode, 'merge'))
  assert.equal(globalThis.localStorage.getItem(PROGRESS_KEY), '{"broken":{"learned":"bad"}}')
})

test('applyBackupImport replaces records cleanly in replace mode', () => {
  mockStorage({
    [PROGRESS_KEY]: JSON.stringify({
      old: { learned: '2026-11-01', reviewed: ['2026-11-01'], due: '2026-11-02', interval: 1, stage: 1 },
    }),
  })
  const replacement = {
    fresh: { learned: '2026-11-18', reviewed: ['2026-11-18'], due: '2026-11-19', interval: 1, stage: 1 },
  }
  const summary = applyBackupImport(encodeSyncCode(replacement), 'replace')
  assert.equal(summary.total, 1)
  assert.deepEqual(readRecordsStrict(), replacement)
})
