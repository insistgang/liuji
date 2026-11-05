import { useEffect, useState } from 'react'

export type DailyWord = {
  id: string; no: number; word: string; phonetic: string; definition_cn: string
  example_en: string; example_cn: string; memory: string; group: string
}
export type DailyLesson = { date: string; title: string; words: DailyWord[]; image: string; markdown: string; source: string }
export type DailyLibrary = { lessons: DailyLesson[]; total_words: number; review_window: string }
export type RecordEntry = { learned: string; reviewed: string[]; due: string; interval: number; stage?: number }
export type DailyRecords = Record<string, RecordEntry>
export const PROGRESS_KEY = 'liuji-daily-library-progress-v1'
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30] as const
export type ReviewQuality = 1 | 3 | 4 | 5
const PROGRESS_EVENT = 'liuji-daily-progress-updated'

export const day = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return day(value)
}

export function reviewStage(record: RecordEntry): number {
  if (record.stage !== undefined) return record.stage
  return record.interval > 0 ? REVIEW_INTERVALS.filter(interval => interval <= record.interval).length : 0
}

export function scheduleReview(old: RecordEntry | undefined, remembered: boolean, today = day(), quality?: ReviewQuality): RecordEntry {
  const rating: ReviewQuality = quality ?? (remembered ? 4 : 1)
  const previousStage = old ? reviewStage(old) : 0
  const reviewedToday = old?.reviewed.includes(today) ?? false
  const dueNow = old ? old.due <= today : false
  const canAdvance = previousStage === 0 || (dueNow && !reviewedToday)
  let stage: number
  let due: string
  if (rating === 1) {
    stage = 0
    due = today
  } else if (rating === 3) {
    stage = previousStage === 0 ? 1 : previousStage
    due = previousStage === 0 ? addDays(today, REVIEW_INTERVALS[0]) : old!.due
  } else {
    const jump = rating === 5 ? 2 : 1
    stage = canAdvance ? Math.min(previousStage + jump, REVIEW_INTERVALS.length) : Math.max(previousStage, 1)
    due = canAdvance ? addDays(today, REVIEW_INTERVALS[stage - 1]) : previousStage === 0 ? addDays(today, REVIEW_INTERVALS[0]) : old!.due
  }
  const interval = stage > 0 ? REVIEW_INTERVALS[stage - 1] : 0
  return { learned: old?.learned || today, reviewed: [...new Set([...(old?.reviewed || []), today])], due, interval, stage }
}

function validDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && day(new Date(`${value}T12:00:00`)) === value
}

export function readRecordsStrict(): DailyRecords {
  const value: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('学习记录格式异常')
  for (const item of Object.values(value)) {
    if (!item || !validDay(item.learned) || !validDay(item.due) ||
      !Array.isArray(item.reviewed) || !item.reviewed.every(validDay) ||
      !Number.isFinite(item.interval) || item.interval < 0 ||
      (item.stage !== undefined && (!Number.isInteger(item.stage) || item.stage < 0 || item.stage > REVIEW_INTERVALS.length))) {
      throw new Error('学习记录格式异常')
    }
  }
  return value as DailyRecords
}

export function useDailyRecords() {
  const [records, setRecords] = useState<DailyRecords>(() => {
    try { return readRecordsStrict() } catch { return {} }
  })
  const [storageError, setStorageError] = useState('')
  useEffect(() => {
    const refresh = () => {
      try { setRecords(readRecordsStrict()); setStorageError('') }
      catch { setStorageError('学习记录读取失败；原有记录未被覆盖。') }
    }
    const onStorage = (event: StorageEvent) => { if (event.key === PROGRESS_KEY || event.key === null) refresh() }
    window.addEventListener('storage', onStorage)
    window.addEventListener(PROGRESS_EVENT, refresh)
    refresh()
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(PROGRESS_EVENT, refresh)
    }
  }, [])

  function save(word: DailyWord, remembered: boolean, quality?: ReviewQuality): RecordEntry | null {
    try {
      const current = readRecordsStrict()
      const next = scheduleReview(current[word.id], remembered, day(), quality)
      const updated = { ...current, [word.id]: next }
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated))
      setRecords(updated)
      setStorageError('')
      window.dispatchEvent(new Event(PROGRESS_EVENT))
      return next
    } catch {
      setStorageError('学习记录未保存。请检查浏览器存储权限或原有记录格式；没有覆盖已有数据。')
      return null
    }
  }
  return { records, storageError, save }
}

export function useDailyLibrary() {
  const [library, setLibrary] = useState<DailyLibrary | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/daily_words.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(`词表读取失败：${response.status}`); return response.json() })
      .then((data: DailyLibrary) => {
        if (!data.lessons?.length || data.lessons.some(lesson => !Array.isArray(lesson.words))) throw new Error('每日词库格式异常或没有期次')
        setLibrary(data)
      }).catch((err: Error) => { if (err.name !== 'AbortError') setError(err.message) })
    return () => controller.abort()
  }, [])
  return { library, error }
}
