import { isValidDay } from '../store/dailyLibrary.ts'

export const PLAN_STORAGE_KEY = 'liuji-study-plan-v1'
export const MAX_NOTE_LENGTH = 160

export const practiceOptions = [
  { id: 'reading', label: '阅读' },
  { id: 'listening', label: '听力' },
  { id: 'writing', label: '写作' },
  { id: 'translation', label: '翻译' },
] as const

export type Practice = typeof practiceOptions[number]['id']
export type StudyResult = Practice | 'review-only'
export type StudyEntry = { result: StudyResult; note: string }
type StudyLog = Record<string, StudyEntry>
type StudyStorage = Pick<Storage, 'getItem' | 'setItem'>

export function isPractice(value: unknown): value is Practice {
  return practiceOptions.some(({ id }) => id === value)
}

export function resultLabel(result: StudyResult): string {
  return result === 'review-only' ? '仅复习' : practiceOptions.find(({ id }) => id === result)!.label
}

function isEntry(value: unknown): value is StudyEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Partial<StudyEntry>
  return (item.result === 'review-only' || isPractice(item.result)) &&
    typeof item.note === 'string' && item.note.length <= MAX_NOTE_LENGTH
}

export function readStudyLog(storage: Pick<Storage, 'getItem'>): StudyLog {
  const raw = storage.getItem(PLAN_STORAGE_KEY)
  if (raw === null) return {}
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !Object.entries(value).every(([date, entry]) => isValidDay(date) && isEntry(entry))) {
    throw new Error('学习小结格式异常')
  }
  return value as StudyLog
}

export function saveStudyEntry(storage: StudyStorage, date: string, entry: StudyEntry): StudyLog {
  if (!isValidDay(date) || !isEntry(entry)) throw new Error('学习小结不合法')
  const updated = { ...readStudyLog(storage), [date]: { ...entry, note: entry.note.trim() } }
  storage.setItem(PLAN_STORAGE_KEY, JSON.stringify(updated))
  return updated
}
