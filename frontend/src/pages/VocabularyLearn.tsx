import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Eye,
  Keyboard,
  Lightbulb,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react'
import LearningFeedback from '../components/LearningFeedback'
import SpeakButton from '../components/vocabulary/SpeakButton'
import { buildChoices, summarizeDefinition } from '../lib/quiz'
import { preloadWordAudio, speakText, useSpeechPreferences } from '../lib/speech'
import { plainText } from '../lib/text'
import {
  addDays,
  day,
  REVIEW_INTERVALS,
  reviewStage,
  useDailyLibrary,
  useDailyRecords,
  type ReviewQuality,
} from '../store/dailyLibrary'

const RATINGS: { quality: ReviewQuality; keyHint: string; label: string; hint: string; color: string }[] = [
  { quality: 1, keyHint: '1', label: '忘记', hint: '今天再练', color: 'bg-rose-600 hover:bg-rose-700' },
  { quality: 3, keyHint: '2', label: '有点难', hint: '保持当前档位', color: 'bg-amber-600 hover:bg-amber-700' },
  { quality: 4, keyHint: '3', label: '记得', hint: '进入下一档', color: 'bg-teal-600 hover:bg-teal-700' },
  { quality: 5, keyHint: '4', label: '很熟', hint: '直接跳过一档', color: 'bg-emerald-600 hover:bg-emerald-700' },
]

type Answer = { wordId: string; kind: 'correct' | 'wrong'; wrongChoiceId?: string }

export default function VocabularyLearn({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const { library, error } = useDailyLibrary()
  const { records, storageError, save } = useDailyRecords()
  const { accent, autoSpeak, setAutoSpeak } = useSpeechPreferences()
  const [mode, setMode] = useState<'learn' | 'review'>(reviewOnly ? 'review' : 'learn')
  const [selected, setSelected] = useState('')
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const [sessionQueue, setSessionQueue] = useState<string[] | null>(null)
  const [feedback, setFeedback] = useState<{
    message: string
    tone: 'success' | 'retry' | 'error'
    sequence: number
  } | null>(null)
  const today = day()

  const lesson = library
    ? library.lessons.find((item) => item.date === selected) ||
      library.lessons.find((item) => item.date <= today) ||
      library.lessons[0]
    : null
  const all = library
    ? library.lessons.flatMap((item) => item.words.map((word) => ({ ...word, date: item.date })))
    : []
  const due = all
    .filter((word) => records[word.id]?.due <= today)
    .sort(
      (a, b) =>
        (attempts[a.id] || 0) - (attempts[b.id] || 0) ||
        records[a.id].due.localeCompare(records[b.id].due),
    )
  const unlearned = lesson ? lesson.words.filter((word) => !records[word.id]) : []
  const queueIds = sessionQueue ?? unlearned.map((word) => word.id)
  const current = mode === 'review' ? due[0] : all.find((word) => word.id === queueIds[0])
  const revealed = current ? revealedId === current.id : false
  const result = current && answer?.wordId === current.id ? answer : null
  const options = current ? buildChoices(current, all) : []

  const currentId = current?.id
  const currentWord = current?.word

  // Preload dictionary audio for current word & optional auto-pronounce
  useEffect(() => {
    if (!currentId || !currentWord) return
    preloadWordAudio(currentWord, accent)
    if (autoSpeak) {
      void speakText(currentWord, { accent, targetKey: `learn:${currentId}` })
    }
  }, [currentId, currentWord, accent, autoSpeak])

  function changeMode(next: 'learn' | 'review') {
    setMode(next)
    setSessionQueue(null)
    setRevealedId(null)
    setAnswer(null)
    setFeedback(null)
  }

  function changeLesson(date: string) {
    setSelected(date)
    setSessionQueue(null)
    setRevealedId(null)
    setAnswer(null)
  }

  function notify(message: string, tone: 'success' | 'retry' | 'error') {
    setFeedback((previous) => ({ message, tone, sequence: (previous?.sequence || 0) + 1 }))
  }

  function answerChoice(choiceId: string) {
    if (!current || result) return
    const choice = options.find((option) => option.word.id === choiceId)
    if (!choice) return
    if (!sessionQueue) setSessionQueue(unlearned.map((word) => word.id))
    if (choice.correct) {
      const record = save(current, true, 4)
      if (!record) {
        notify(`${current.word} 未保存，请检查浏览器存储权限后重试。`, 'error')
        return
      }
      setAnswer({ wordId: current.id, kind: 'correct' })
      notify(`${current.word} 记住了！下次复习：${record.due}。`, 'success')
      return
    }
    const record = save(current, false, 1)
    if (!record) {
      notify(`${current.word} 未保存，请检查浏览器存储权限后重试。`, 'error')
      return
    }
    setAnswer({ wordId: current.id, kind: 'wrong', wrongChoiceId: choiceId })
    notify(`${current.word} 答错了，已加入今天的重练队列。`, 'retry')
  }

  function continueAfterAnswer() {
    if (!current || !result) return
    const ids = sessionQueue ?? unlearned.map((word) => word.id)
    setSessionQueue(
      result.kind === 'correct'
        ? ids.filter((id) => id !== current.id)
        : [...ids.slice(1), current.id],
    )
    setRevealedId(null)
    setAnswer(null)
  }

  function rate(quality: ReviewQuality) {
    if (!current || !revealed) return
    const record = save(current, quality >= 4, quality)
    if (!record) {
      notify(`${current.word} 未保存，请检查浏览器存储权限后重试。`, 'error')
      return
    }
    setAttempts((value) => ({ ...value, [current.id]: (value[current.id] || 0) + 1 }))
    setRevealedId(null)
    const label = RATINGS.find((item) => item.quality === quality)?.label
    const sameDay = record.due <= today
    notify(
      quality === 1
        ? `${current.word} 已加入今天的重练队列，稍后再考一次。`
        : sameDay
          ? `${current.word}（${label}）今天已复习过，保持第 ${reviewStage(record)} 档，明天继续。`
          : `${current.word}（${label}）已保存，下次复习：${record.due}，第 ${reviewStage(record)} 档。`,
      'success',
    )
  }

  // Keyboard shortcuts for desktop power learners
  useEffect(() => {
    if (!current) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return

      const key = event.key.toLowerCase()
      if (key === 'r' || key === '0') {
        event.preventDefault()
        void speakText(current.word, { accent, targetKey: `learn:${current.id}` })
        return
      }

      if (key === ' ' || key === 'enter') {
        if (!revealed) {
          event.preventDefault()
          setRevealedId(current.id)
        } else if (mode === 'learn' && result) {
          event.preventDefault()
          continueAfterAnswer()
        }
        return
      }

      if (['1', '2', '3', '4'].includes(key)) {
        const index = Number(key) - 1
        if (mode === 'learn' && revealed && !result && options[index]) {
          event.preventDefault()
          answerChoice(options[index].word.id)
        } else if (mode === 'review' && revealed && RATINGS[index]) {
          event.preventDefault()
          rate(RATINGS[index].quality)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  if (error) {
    return (
      <div role="alert" className="app-card rounded-2xl p-8 text-center text-red-600 dark:text-red-400">
        {error}。请刷新重试。
      </div>
    )
  }

  if (!library || !lesson) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="app-card h-44 animate-pulse rounded-3xl" />
        <div className="app-card h-80 animate-pulse rounded-3xl" />
      </div>
    )
  }

  const completedToday = all.filter(
    (word) => records[word.id]?.reviewed.includes(today) && records[word.id].interval > 0,
  ).length
  const forecast = Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(today, offset)
    return { date, count: all.filter((word) => records[word.id]?.due === date).length }
  })
  const maxForecast = Math.max(10, ...forecast.map((f) => f.count))
  const totalLessonWords = lesson.words.length
  const remainingInLearn = queueIds.length
  const sessionDonePct =
    mode === 'learn'
      ? Math.round(((totalLessonWords - remainingInLearn) / Math.max(1, totalLessonWords)) * 100)
      : due.length === 0
        ? 100
        : Math.min(95, Math.round((Object.keys(attempts).length / (Object.keys(attempts).length + due.length)) * 100))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Hero Banner */}
      <header className="app-hero rounded-3xl p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-xs">
            <Sparkles size={13} className="app-hero-badge" aria-hidden="true" />
            <span className="app-hero-badge">四选一释义排除 + 艾宾浩斯递增记忆</span>
          </span>
          <Link
            to="/daily"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/20"
          >
            <BookOpen size={13} aria-hidden="true" />
            查看词表、配图与讲义
          </Link>
        </div>

        <h1 className="headword-font mt-3.5 text-2xl font-bold sm:text-3xl">词汇特训与间隔复习</h1>
        <p className="mt-2 text-sm leading-6 text-white/80">
          递增档位：{REVIEW_INTERVALS.join(' → ')} 天。「记得」进下一档，「很熟」跳一档，「有点难」保档，「忘记」当日重练。
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs">
            <p className="text-xs text-white/70">本期待学</p>
            <p className="mt-0.5 text-xl font-bold">{unlearned.length} 词</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs">
            <p className="text-xs text-white/70">到期复习</p>
            <p className="mt-0.5 text-xl font-bold">{due.length} 词</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs">
            <p className="text-xs text-white/70">今日记住</p>
            <p className="mt-0.5 text-xl font-bold">{completedToday} 词</p>
          </div>
        </div>
      </header>

      {storageError && (
        <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
          {storageError}
        </p>
      )}

      {/* Control Toolbar */}
      <div className="app-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changeMode('learn')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              mode === 'learn' ? 'app-accent-solid shadow-xs' : 'app-muted-pill'
            }`}
          >
            学习新词（{unlearned.length}）
          </button>
          <button
            type="button"
            onClick={() => changeMode('review')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              mode === 'review' ? 'app-accent-solid shadow-xs' : 'app-muted-pill'
            }`}
          >
            到期复习（{due.length}）
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoSpeak(!autoSpeak)}
            aria-pressed={autoSpeak}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
              autoSpeak
                ? 'app-accent-soft border-[var(--accent-soft-border)] font-semibold'
                : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
            }`}
          >
            <Volume2 size={14} aria-hidden="true" />
            自动朗读：{autoSpeak ? '开启' : '关闭'}
          </button>
        </div>

        {mode === 'learn' && (
          <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="vocabulary-lesson" className="text-xs font-medium text-[var(--text-secondary)]">
                训练期次
              </label>
              <select
                id="vocabulary-lesson"
                value={lesson.date}
                onChange={(event) => changeLesson(event.target.value)}
                className="app-input rounded-xl px-3 py-2 text-sm font-medium"
              >
                {library.lessons.map((item, idx) => (
                  <option key={item.date} value={item.date}>
                    {item.date} · 第 {library.lessons.length - idx} 期（{item.words.length} 词）
                  </option>
                ))}
              </select>
            </div>
            {lesson.date !== today && (
              <span className="text-xs text-amber-700 dark:text-amber-300">
                历史期次（{lesson.date}）
              </span>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <LearningFeedback
          key={feedback.sequence}
          message={feedback.message}
          tone={feedback.tone}
          onDismiss={() => setFeedback(null)}
        />
      )}

      {/* Active Study Card */}
      {current ? (
        <article
          key={current.id}
          className="app-card feedback-enter overflow-hidden rounded-3xl"
        >
          {/* Top Progress Strip */}
          <div className="h-1.5 w-full bg-[var(--bg-muted)]">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${Math.max(4, sessionDonePct)}%` }}
            />
          </div>

          <div className="p-6 md:p-8">
            {/* Meta Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
              <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1 font-medium text-[var(--text-secondary)]">
                {current.id.split(':')[0]} · {current.group}
              </span>
              <span>
                {mode === 'review'
                  ? `待复习剩余 ${due.length} 词`
                  : `本轮剩余 ${queueIds.length} 词`}
              </span>
            </div>

            {/* Word & Pronunciation Hero Row */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="headword-font break-words text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                  {current.word}
                </h2>
                <p className="phonetic-font mt-2 text-base text-[var(--text-muted)]">
                  {current.phonetic}
                </p>
              </div>
              <SpeakButton
                text={current.word}
                targetKey={`learn:${current.id}`}
                variant="hero"
                showAccentLabel
              />
            </div>

            {mode === 'review' && records[current.id] && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/12 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                <CalendarClock size={14} aria-hidden="true" />
                计划复习日：{records[current.id].due} · 当前第 {reviewStage(records[current.id])} 档
              </p>
            )}

            {/* Learn Mode: Step 1 - Recall */}
            {mode === 'learn' && !revealed && (
              <button
                type="button"
                className="app-accent-soft mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-base font-semibold hover:opacity-95"
                onClick={() => setRevealedId(current.id)}
              >
                <Eye size={18} aria-hidden="true" />
                先在脑海回想词义，点击展开四个选项
              </button>
            )}

            {/* Learn Mode: Step 2 - 4-Choice Selection */}
            {mode === 'learn' && revealed && !result && (
              <div className="mt-7 space-y-3">
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  选出最匹配的中文释义（支持数字键 1-4 选择）：
                </p>
                <div className="grid gap-3">
                  {options.map((option, idx) => (
                    <button
                      key={option.word.id}
                      type="button"
                      onClick={() => answerChoice(option.word.id)}
                      className="group flex items-center gap-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-3.5 text-left text-sm leading-6 text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-secondary)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent-text)]">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 font-medium">
                        {summarizeDefinition(option.word.definition_cn)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Learn Mode: Step 3 - Answer Explanation */}
            {mode === 'learn' && result && (
              <div className="mt-6 space-y-4">
                <div
                  className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3.5 text-sm leading-6 ${
                    result.kind === 'correct'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  {result.kind === 'correct' ? (
                    <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  ) : (
                    <XCircle size={19} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  )}
                  <span>
                    {result.kind === 'correct'
                      ? '回答正确！该词已正式纳入艾宾浩斯复习计划。'
                      : `选错了，核心释义是「${summarizeDefinition(current.definition_cn)}」。本轮稍后会再次抽考巩固。`}
                  </span>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 sm:p-5 space-y-3">
                  <p className="text-base font-semibold leading-7 text-[var(--text-primary)]">
                    {current.definition_cn}
                  </p>
                  <div className="space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm leading-6 text-[var(--text-primary)]">
                        {plainText(current.example_en)}
                      </p>
                      <SpeakButton
                        text={plainText(current.example_en)}
                        targetKey={`learn-ex:${current.id}`}
                        variant="sentence"
                      />
                    </div>
                    <p className="text-xs leading-5 text-[var(--text-secondary)]">{current.example_cn}</p>
                  </div>
                </div>

                {current.memory && (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-7 text-[var(--text-primary)]">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <Lightbulb size={14} aria-hidden="true" />
                      <span>词根画面与辨析提示</span>
                    </div>
                    <p>{current.memory}</p>
                  </div>
                )}

                <button
                  type="button"
                  className="app-accent-solid flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-semibold shadow-sm"
                  onClick={continueAfterAnswer}
                >
                  <span>继续下一个</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Review Mode: Step 1 - Recall */}
            {mode === 'review' && !revealed && (
              <button
                type="button"
                className="app-accent-soft mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-base font-semibold hover:opacity-95"
                onClick={() => setRevealedId(current.id)}
              >
                <Eye size={18} aria-hidden="true" />
                先回忆词义与搭配，再点击检验记忆强度
              </button>
            )}

            {/* Review Mode: Step 2 - Self Rating */}
            {mode === 'review' && revealed && (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 sm:p-5 space-y-3">
                  <p className="text-base font-semibold leading-7 text-[var(--text-primary)]">
                    {current.definition_cn}
                  </p>
                  <div className="space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm leading-6 text-[var(--text-primary)]">
                        {plainText(current.example_en)}
                      </p>
                      <SpeakButton
                        text={plainText(current.example_en)}
                        targetKey={`rev-ex:${current.id}`}
                        variant="sentence"
                      />
                    </div>
                    <p className="text-xs leading-5 text-[var(--text-secondary)]">{current.example_cn}</p>
                  </div>
                </div>

                {current.memory && (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-7 text-[var(--text-primary)]">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <Lightbulb size={14} aria-hidden="true" />
                      <span>词根画面与辨析提示</span>
                    </div>
                    <p>{current.memory}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                  {RATINGS.map((rating) => (
                    <button
                      key={rating.quality}
                      type="button"
                      onClick={() => rate(rating.quality)}
                      className={`rounded-2xl px-4 py-3 text-white shadow-xs transition-all ${rating.color}`}
                    >
                      <span className="block text-sm font-semibold">
                        {rating.keyHint}. {rating.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] opacity-90">{rating.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subtle Desktop Shortcut Footer */}
            <div className="mt-6 hidden items-center justify-center gap-4 border-t border-[var(--border-subtle)] pt-4 text-[11px] text-[var(--text-muted)] sm:flex">
              <span className="inline-flex items-center gap-1">
                <Keyboard size={13} aria-hidden="true" />
                快捷键：
              </span>
              <span>R 朗读单词</span>
              <span>空格 / 回车 展开或继续</span>
              <span>数字 1-4 作答评级</span>
            </div>
          </div>
        </article>
      ) : (
        <div className="app-card rounded-3xl p-8 text-center">
          <div className="app-accent-soft mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border">
            <CheckCircle2 size={24} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {mode === 'review' ? '今日到期词汇已全部复习完毕！' : '本期新词已全部完成特训！'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            {mode === 'review'
              ? '只有你亲手学过的词才会进入复习队列；可以切换到「学习新词」解锁更多期次。'
              : '你可以上方切换其他历史期次继续学习，或者进入「到期复习」巩固记忆。'}
          </p>
        </div>
      )}

      {/* 7-Day Review Forecast */}
      <section className="app-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[var(--text-primary)]">未来 7 天复习量预测</h2>
          {due.length > 0 && (
            <span className="rounded-full bg-amber-500/12 px-3 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
              今日及逾期：{due.length} 词
            </span>
          )}
        </div>

        <ul className="mt-4 space-y-2.5 text-sm">
          {forecast.map((item) => {
            const barPct = item.count === 0 ? 0 : Math.max(6, Math.round((item.count / maxForecast) * 100))
            return (
              <li key={item.date} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs font-medium text-[var(--text-secondary)]">
                  {item.date === today ? '今天' : item.date.slice(5)}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${barPct}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs font-semibold text-[var(--text-primary)]">
                  {item.count} 词
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
