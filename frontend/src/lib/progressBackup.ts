import {
  readRecordsStrict,
  reviewStage,
  validateRecords,
  writeRecordsStrict,
  type DailyRecords,
  type RecordEntry,
} from '../store/dailyLibrary.ts'
import { isValidTheme, THEME_STORAGE_KEY, type Theme } from '../store/themeStore.ts'
import { ACCENT_STORAGE_KEY, AUTO_SPEAK_STORAGE_KEY, type Accent } from './speech.ts'

export const SYNC_CODE_PREFIX = 'LIUJI1:'

export interface BackupPreferences {
  theme?: Theme
  accent?: Accent
  autoSpeak?: boolean
}

export interface ProgressBackupPayload {
  app: 'liuji'
  version: 1
  exportedAt: string
  dailyRecords: DailyRecords
  preferences?: BackupPreferences
}

export type ImportMode = 'merge' | 'replace'

export interface MergeSummary {
  records: DailyRecords
  added: number
  updated: number
  total: number
  preferences?: BackupPreferences
}

type CompactTuple =
  | [string, string[], string, number]
  | [string, string[], string, number, number]

function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(encoded: string): string {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(padLength)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

function readLocalPreferences(): BackupPreferences | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined
    const prefs: BackupPreferences = {}
    const theme = localStorage.getItem(THEME_STORAGE_KEY)
    if (isValidTheme(theme)) prefs.theme = theme
    const accent = localStorage.getItem(ACCENT_STORAGE_KEY)
    if (accent === 'us' || accent === 'uk') prefs.accent = accent
    const autoSpeak = localStorage.getItem(AUTO_SPEAK_STORAGE_KEY)
    if (autoSpeak === 'true' || autoSpeak === 'false') {
      prefs.autoSpeak = autoSpeak === 'true'
    }
    return Object.keys(prefs).length > 0 ? prefs : undefined
  } catch {
    return undefined
  }
}

function extractValidPreferences(raw: unknown): BackupPreferences | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const obj = raw as Record<string, unknown>
  const prefs: BackupPreferences = {}
  if (isValidTheme(obj.theme)) prefs.theme = obj.theme
  if (obj.accent === 'us' || obj.accent === 'uk') prefs.accent = obj.accent
  if (typeof obj.autoSpeak === 'boolean') prefs.autoSpeak = obj.autoSpeak
  return Object.keys(prefs).length > 0 ? prefs : undefined
}

export function createBackupPayload(records?: DailyRecords): ProgressBackupPayload {
  const checked = validateRecords(records ?? readRecordsStrict())
  const preferences = readLocalPreferences()
  return {
    app: 'liuji',
    version: 1,
    exportedAt: new Date().toISOString(),
    dailyRecords: checked,
    ...(preferences ? { preferences } : {}),
  }
}

export function serializeBackupJson(records?: DailyRecords): string {
  return JSON.stringify(createBackupPayload(records), null, 2)
}

export function encodeSyncCode(records?: DailyRecords): string {
  const checked = validateRecords(records ?? readRecordsStrict())
  const compact: Record<string, CompactTuple> = {}
  for (const [wordId, entry] of Object.entries(checked)) {
    compact[wordId] =
      entry.stage !== undefined
        ? [entry.learned, entry.reviewed, entry.due, entry.interval, entry.stage]
        : [entry.learned, entry.reviewed, entry.due, entry.interval]
  }
  return `${SYNC_CODE_PREFIX}${encodeBase64Url(JSON.stringify(compact))}`
}

export function parseBackupInput(raw: string): {
  dailyRecords: DailyRecords
  preferences?: BackupPreferences
} {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('请输入同步码或选择备份文件')
  }

  if (trimmed.startsWith(SYNC_CODE_PREFIX)) {
    try {
      const payloadText = decodeBase64Url(trimmed.slice(SYNC_CODE_PREFIX.length).trim())
      const parsed: unknown = JSON.parse(payloadText)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('invalid sync object')
      }
      const reconstructed: Record<string, unknown> = {}
      for (const [wordId, tuple] of Object.entries(parsed as Record<string, unknown>)) {
        if (!Array.isArray(tuple) || (tuple.length !== 4 && tuple.length !== 5)) {
          throw new Error('invalid tuple')
        }
        reconstructed[wordId] = {
          learned: tuple[0],
          reviewed: tuple[1],
          due: tuple[2],
          interval: tuple[3],
          ...(tuple.length === 5 ? { stage: tuple[4] } : {}),
        }
      }
      return { dailyRecords: validateRecords(reconstructed) }
    } catch {
      throw new Error('同步码无效或已损坏，未修改当前学习记录')
    }
  }

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      (parsed as Record<string, unknown>).app === 'liuji' &&
      'dailyRecords' in parsed
    ) {
      const container = parsed as { dailyRecords: unknown; preferences?: unknown }
      const dailyRecords = validateRecords(container.dailyRecords)
      const preferences = extractValidPreferences(container.preferences)
      return preferences ? { dailyRecords, preferences } : { dailyRecords }
    }
    return { dailyRecords: validateRecords(parsed) }
  } catch {
    throw new Error('备份文件格式无效或数据已损坏，未修改当前学习记录')
  }
}

function latestActivityDate(entry: RecordEntry): string {
  if (entry.reviewed.length === 0) return entry.learned
  return [...entry.reviewed].sort().at(-1) ?? entry.learned
}

export function mergeDailyRecords(
  current: DailyRecords,
  incoming: DailyRecords,
): { merged: DailyRecords; added: number; updated: number; total: number } {
  const checkedCurrent = validateRecords(current)
  const checkedIncoming = validateRecords(incoming)
  const merged: DailyRecords = { ...checkedCurrent }
  let added = 0
  let updated = 0

  for (const [wordId, inc] of Object.entries(checkedIncoming)) {
    const cur = checkedCurrent[wordId]
    if (!cur) {
      merged[wordId] = inc
      added += 1
      continue
    }

    const learned = cur.learned <= inc.learned ? cur.learned : inc.learned
    const reviewed = [...new Set([...cur.reviewed, ...inc.reviewed])].sort()
    const lastCur = latestActivityDate(cur)
    const lastInc = latestActivityDate(inc)

    let winner: RecordEntry
    if (lastInc > lastCur) {
      winner = inc
    } else if (lastCur > lastInc) {
      winner = cur
    } else {
      const stageCur = reviewStage(cur)
      const stageInc = reviewStage(inc)
      if (stageInc > stageCur) {
        winner = inc
      } else if (stageCur > stageInc) {
        winner = cur
      } else {
        winner = inc.due > cur.due ? inc : cur
      }
    }

    const combined: RecordEntry = {
      learned,
      reviewed,
      due: winner.due,
      interval: winner.interval,
      stage: reviewStage(winner),
    }

    const curReviewedSorted = [...new Set(cur.reviewed)].sort()
    const changed =
      cur.learned !== combined.learned ||
      cur.due !== combined.due ||
      cur.interval !== combined.interval ||
      reviewStage(cur) !== combined.stage ||
      JSON.stringify(curReviewedSorted) !== JSON.stringify(combined.reviewed)

    if (changed) updated += 1
    merged[wordId] = combined
  }

  return { merged, added, updated, total: Object.keys(merged).length }
}

export function applyBackupImport(raw: string, mode: ImportMode): MergeSummary {
  const { dailyRecords, preferences } = parseBackupInput(raw)

  if (mode === 'merge') {
    const current = readRecordsStrict()
    const { merged, added, updated, total } = mergeDailyRecords(current, dailyRecords)
    const written = writeRecordsStrict(merged)
    return { records: written, added, updated, total, preferences }
  }

  const checked = writeRecordsStrict(dailyRecords)
  const total = Object.keys(checked).length
  return { records: checked, added: total, updated: 0, total, preferences }
}
