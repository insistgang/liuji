import type {
  VocabularyWord,
  WordProgress,
  VocabProgressStats,
} from '../types/vocabulary'
import { summarizeDefinition } from '../lib/quiz'

const STORAGE_KEY = 'liuji-offline-progress-v1'
const DAILY_PROGRESS_KEY = 'liuji-daily-library-progress-v1'
const DATA_URL = `${import.meta.env.BASE_URL}data/vocabulary.json`
const DAILY_DATA_URL = `${import.meta.env.BASE_URL}data/daily_words.json`

interface OfflineProgress extends WordProgress {
  created_at: string
}

type ProgressMap = Record<string, OfflineProgress>

let wordsPromise: Promise<VocabularyWord[]> | null = null

export interface OfflineResponse<T> {
  data: { code: number; data: T; message: string }
}

export type QuizMode = 'mixed' | 'choice' | 'spelling'

export interface QuizOptionDetail {
  option: string
  word_key?: string
  word: string
  phonetic: string | null
  definition_cn: string
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

  async startQuiz(count = 10, quizMode: QuizMode = 'mixed') {
    interface QuizWordCandidate {
      key: string
      word: string
      phonetic: string | null
      part_of_speech: string | null
      definition_cn: string
    }

    const shuffle = <T,>(items: T[]): T[] => {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    }

    let candidates: QuizWordCandidate[] = []
    try {
      const res = await fetch(DAILY_DATA_URL)
      if (res.ok) {
        const payload = (await res.json()) as {
          lessons?: Array<{
            words?: Array<{
              id: string
              word: string
              phonetic?: string
              definition_cn?: string
            }>
          }>
        }
        const dailyWords = (payload.lessons || []).flatMap((lesson) => lesson.words || [])
        candidates = dailyWords
          .filter((item) => item.word && item.definition_cn?.trim())
          .map((item) => ({
            key: item.id,
            word: item.word,
            phonetic: item.phonetic || null,
            part_of_speech: null,
            definition_cn: item.definition_cn || '',
          }))
      }
    } catch {
      // Fallback to vocabulary.json below
    }

    if (candidates.length === 0) {
      const words = await getWords()
      candidates = words
        .filter((item) => item.word && item.definition_cn?.trim())
        .map((item) => ({
          key: String(item.id),
          word: item.word,
          phonetic: item.phonetic || null,
          part_of_speech: item.part_of_speech || null,
          definition_cn: item.definition_cn || '',
        }))
    }

    if (candidates.length === 0) {
      return response([])
    }

    let learnedKeys = new Set<string>()
    try {
      const raw = JSON.parse(localStorage.getItem(DAILY_PROGRESS_KEY) || '{}') as Record<string, unknown>
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        learnedKeys = new Set(Object.keys(raw))
      }
    } catch {
      // Ignore malformed progress during quiz generation
    }

    const studied = shuffle(candidates.filter((item) => learnedKeys.has(item.key)))
    const unstudied = shuffle(candidates.filter((item) => !learnedKeys.has(item.key)))
    const ordered = [...studied, ...unstudied]

    const picked: QuizWordCandidate[] = []
    const seenWords = new Set<string>()
    for (const item of ordered) {
      const lower = item.word.toLowerCase()
      if (seenWords.has(lower)) continue
      seenWords.add(lower)
      picked.push(item)
      if (picked.length >= count) break
    }

    const types =
      quizMode === 'spelling'
        ? (['spelling'] as const)
        : quizMode === 'choice'
          ? (['meaning', 'word', 'listening'] as const)
          : (['meaning', 'word', 'listening', 'spelling'] as const)

    const questions = picked.map((target, index) => {
      const questionType = types[index % types.length]

      if (questionType === 'spelling') {
        return {
          word_id: index + 1,
          word_key: target.key,
          word: target.word,
          phonetic: target.phonetic || '',
          part_of_speech: target.part_of_speech || '',
          definition_cn: target.definition_cn,
          question_type: 'spelling',
          prompt: target.definition_cn,
          options: [] as string[],
          correct_answer: target.word,
          option_details: [] as QuizOptionDetail[],
        }
      }

      const distractorPool = shuffle(
        candidates.filter((item) => item.word.toLowerCase() !== target.word.toLowerCase()),
      )

      if (questionType === 'word') {
        const seenOptions = new Set<string>([target.word])
        const details: QuizOptionDetail[] = [
          {
            option: target.word,
            word_key: target.key,
            word: target.word,
            phonetic: target.phonetic,
            definition_cn: target.definition_cn,
          },
        ]
        for (const candidate of distractorPool) {
          if (details.length >= 4) break
          if (seenOptions.has(candidate.word)) continue
          seenOptions.add(candidate.word)
          details.push({
            option: candidate.word,
            word_key: candidate.key,
            word: candidate.word,
            phonetic: candidate.phonetic,
            definition_cn: candidate.definition_cn,
          })
        }
        const shuffledDetails = shuffle(details)
        return {
          word_id: index + 1,
          word_key: target.key,
          word: target.word,
          phonetic: target.phonetic || '',
          part_of_speech: target.part_of_speech || '',
          definition_cn: target.definition_cn,
          question_type: questionType,
          prompt: target.definition_cn,
          options: shuffledDetails.map((d) => d.option),
          correct_answer: target.word,
          option_details: shuffledDetails,
        }
      }

      const correctAnswer = summarizeDefinition(target.definition_cn)
      const seenOptions = new Set<string>([correctAnswer])
      const details: QuizOptionDetail[] = [
        {
          option: correctAnswer,
          word_key: target.key,
          word: target.word,
          phonetic: target.phonetic,
          definition_cn: target.definition_cn,
        },
      ]
      for (const candidate of distractorPool) {
        if (details.length >= 4) break
        const summary = summarizeDefinition(candidate.definition_cn)
        if (!summary || seenOptions.has(summary)) continue
        seenOptions.add(summary)
        details.push({
          option: summary,
          word_key: candidate.key,
          word: candidate.word,
          phonetic: candidate.phonetic,
          definition_cn: candidate.definition_cn,
        })
      }
      const shuffledDetails = shuffle(details)
      return {
        word_id: index + 1,
        word_key: target.key,
        word: target.word,
        phonetic: target.phonetic || '',
        part_of_speech: target.part_of_speech || '',
        definition_cn: target.definition_cn,
        question_type: questionType,
        prompt: target.word,
        options: shuffledDetails.map((d) => d.option),
        correct_answer: correctAnswer,
        option_details: shuffledDetails,
      }
    })

    return response(questions)
  },
}
