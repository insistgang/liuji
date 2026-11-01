import type {
  VocabularyWord,
  WordProgress,
  VocabProgressStats,
} from '../types/vocabulary'

const STORAGE_KEY = 'liuji-offline-progress-v1'
const DATA_URL = `${import.meta.env.BASE_URL}data/vocabulary.json`

interface OfflineProgress extends WordProgress {
  created_at: string
}

type ProgressMap = Record<string, OfflineProgress>

let wordsPromise: Promise<VocabularyWord[]> | null = null

export interface OfflineResponse<T> {
  data: { code: number; data: T; message: string }
}

function response<T>(data: T): OfflineResponse<T> {
  return { data: { code: 0, data, message: 'ok' } }
}

function nowIso() {
  return new Date().toISOString()
}

function readProgress(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as ProgressMap
  } catch {
    return {}
  }
}

function writeProgress(progress: ProgressMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

async function getWords(): Promise<VocabularyWord[]> {
  if (!wordsPromise) {
    wordsPromise = fetch(DATA_URL).then((res) => {
      if (!res.ok) throw new Error('离线词库加载失败')
      return res.json() as Promise<VocabularyWord[]>
    })
  }
  return wordsPromise
}

function asNewProgress(word: VocabularyWord): WordProgress {
  return {
    id: 0,
    word_id: word.id,
    word,
    status: 'new',
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review: '',
    last_review: null,
    correct_count: 0,
    wrong_count: 0,
  }
}

function isDue(progress: OfflineProgress, now = Date.now()) {
  return (
    ['learning', 'review'].includes(progress.status) &&
    !!progress.next_review &&
    new Date(progress.next_review).getTime() <= now
  )
}

function nextInterval(repetitions: number, quality: number) {
  if (quality < 3) return 0
  const intervals = [1, 3, 7, 14, 30, 60]
  return intervals[Math.min(repetitions, intervals.length - 1)]
}

export const offlineApi = {
  async getWords(page = 1, perPage = 20, search = '') {
    const words = await getWords()
    const query = search.trim().toLowerCase()
    const filtered = query
      ? words.filter(
          (word) =>
            word.word.toLowerCase().includes(query) ||
            (word.definition_cn || '').includes(query),
        )
      : words
    const items = filtered.slice((page - 1) * perPage, page * perPage)
    return response({ items, total: filtered.length, page, per_page: perPage })
  },

  async getNewWords(count = 20) {
    const words = await getWords()
    const progress = readProgress()
    const items = words
      .filter((word) => !progress[word.id])
      .slice(0, count)
      .map(asNewProgress)
    return response(items)
  },

  async startLearning(wordIds: number[]) {
    const words = await getWords()
    const progress = readProgress()
    const timestamp = nowIso()
    const started: OfflineProgress[] = []
    for (const wordId of wordIds) {
      const word = words.find((item) => item.id === wordId)
      if (!word) continue
      const current = progress[wordId]
      const next: OfflineProgress = current || {
        ...asNewProgress(word),
        status: 'learning',
        created_at: timestamp,
      }
      next.status = 'learning'
      next.next_review = new Date(Date.now() + 86400000).toISOString()
      progress[wordId] = next
      started.push(next)
    }
    writeProgress(progress)
    return response(started)
  },

  async getReviewWords(limit = 50) {
    const progress = readProgress()
    const items = Object.values(progress)
      .filter((item) => isDue(item))
      .sort(
        (a, b) =>
          new Date(a.next_review).getTime() - new Date(b.next_review).getTime(),
      )
      .slice(0, limit)
    return response(items)
  },

  async submitReview(wordId: number, quality: number) {
    const progress = readProgress()
    const current = progress[wordId]
    if (!current) throw new Error('请先学习该单词')
    const repetitions = current.repetitions + 1
    const interval = nextInterval(current.repetitions, quality)
    const timestamp = nowIso()
    const next: OfflineProgress = {
      ...current,
      repetitions,
      interval,
      ease_factor: Math.max(
        1.3,
        current.ease_factor + (quality >= 3 ? 0.1 : -0.2),
      ),
      last_review: timestamp,
      next_review: new Date(Date.now() + interval * 86400000).toISOString(),
      correct_count: current.correct_count + (quality >= 3 ? 1 : 0),
      wrong_count: current.wrong_count + (quality < 3 ? 1 : 0),
      status: interval >= 30 ? 'mastered' : interval >= 7 ? 'review' : 'learning',
    }
    progress[wordId] = next
    writeProgress(progress)
    return response(next)
  },

  async getProgress() {
    const words = await getWords()
    const progress = Object.values(readProgress())
    const stats: VocabProgressStats = {
      total_words: words.length,
      new_words: words.length - progress.length,
      learning_words: progress.filter((item) => item.status === 'learning').length,
      review_words: progress.filter((item) => item.status === 'review').length,
      mastered_words: progress.filter((item) => item.status === 'mastered').length,
      due_today: progress.filter((item) => isDue(item)).length,
    }
    return response(stats)
  },

  async getWeakWords(limit = 20) {
    const items = Object.values(readProgress())
      .sort(
        (a, b) =>
          b.wrong_count - a.wrong_count ||
          new Date(a.next_review).getTime() - new Date(b.next_review).getTime(),
      )
      .slice(0, limit)
    return response(items)
  },

  async getDailyPlan() {
    const progress = Object.values(readProgress())
    const target = 20
    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const start = dayStart.getTime()
    const learnedToday = progress.filter(
      (item) => new Date(item.created_at).getTime() >= start,
    ).length
    const reviewsDoneToday = progress.filter(
      (item) => item.last_review && new Date(item.last_review).getTime() >= start,
    ).length
    const dueReviews = progress.filter((item) => isDue(item)).length
    const mastered = progress.filter((item) => item.status === 'mastered').length
    const activeDates = new Set(
      progress.flatMap((item) =>
        [item.created_at, item.last_review]
          .filter((value): value is string => !!value)
          .map((value) => value.slice(0, 10)),
      ),
    )
    const today = now.toISOString().slice(0, 10)
    let streakDays = 0
    const cursor = new Date(now)
    if (!activeDates.has(today)) cursor.setDate(cursor.getDate() - 1)
    while (activeDates.has(cursor.toISOString().slice(0, 10))) {
      streakDays += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    const newWordsRemaining = Math.max(0, target - learnedToday)
    return response({
      date: today,
      daily_new_target: target,
      new_words_learned_today: learnedToday,
      new_words_remaining: newWordsRemaining,
      due_reviews: dueReviews,
      reviews_done_today: reviewsDoneToday,
      total_learned: progress.length,
      mastered,
      streak_days: streakDays,
      completed: newWordsRemaining === 0 && dueReviews === 0,
    })
  },
}
