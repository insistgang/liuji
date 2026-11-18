import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Keyboard,
  Loader2,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react'
import type { QuizMode, QuizOptionDetail } from '../api/offline'
import { vocabApi } from '../api/vocabulary'
import ProgressBar from '../components/vocabulary/ProgressBar'
import SpeakButton from '../components/vocabulary/SpeakButton'
import {
  buildSpellingHint,
  checkSpelling,
  isDesktopFinePointer,
} from '../lib/quiz'
import { speakText, useSpeechPreferences } from '../lib/speech'
import { syncWrongWordsToStorage } from '../store/dailyLibrary'

interface QuizQuestion {
  word_id: number
  word_key?: string
  word: string
  phonetic: string | null
  part_of_speech: string | null
  definition_cn?: string
  question_type: string
  prompt: string
  options: string[]
  correct_answer: string
  option_details?: QuizOptionDetail[]
}

const QUIZ_MODES: { id: QuizMode; label: string }[] = [
  { id: 'mixed', label: '综合抽测' },
  { id: 'choice', label: '四选一' },
  { id: 'spelling', label: '拼写专项' },
]

export default function VocabularyTest() {
  const navigate = useNavigate()
  const { accent } = useSpeechPreferences()
  const [quizMode, setQuizMode] = useState<QuizMode>('mixed')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isCorrectAnswer, setIsCorrectAnswer] = useState<boolean | null>(null)
  const [spellingInput, setSpellingInput] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const spellingInputRef = useRef<HTMLInputElement>(null)

  const fetchQuiz = useCallback((mode: QuizMode) => {
    return vocabApi
      .startQuiz(10, mode)
      .then(({ data }) => {
        setQuestions(data.data || [])
        setCurrentIndex(0)
        setSelected(null)
        setIsAnswered(false)
        setIsCorrectAnswer(null)
        setSpellingInput('')
        setShowHint(false)
        setCorrectCount(0)
        setFinished(false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void fetchQuiz('mixed')
  }, [fetchQuiz])

  const changeQuizMode = (nextMode: QuizMode) => {
    setQuizMode(nextMode)
    setLoading(true)
    void fetchQuiz(nextMode)
  }

  const handleRestart = () => {
    setLoading(true)
    void fetchQuiz(quizMode)
  }

  const current = !loading && !finished && questions[currentIndex] ? questions[currentIndex] : null
  const activeListeningWord =
    current?.question_type === 'listening' && !isAnswered ? current.word : ''
  const activeTargetKey = current ? `quiz:${currentIndex}:${current.word_id}` : ''

  useEffect(() => {
    if (!activeListeningWord) return
    void speakText(activeListeningWord, { accent, targetKey: activeTargetKey })
  }, [activeListeningWord, activeTargetKey, accent])

  useEffect(() => {
    if (
      current?.question_type === 'spelling' &&
      !isAnswered &&
      !finished &&
      isDesktopFinePointer()
    ) {
      spellingInputRef.current?.focus()
    }
  }, [current?.question_type, currentIndex, isAnswered, finished])

  const isLast = currentIndex === questions.length - 1

  const handleSelect = (option: string) => {
    if (!current || isAnswered) return
    const ok = option === current.correct_answer
    setSelected(option)
    setIsAnswered(true)
    setIsCorrectAnswer(ok)
    if (ok) {
      setCorrectCount((count) => count + 1)
    } else {
      const confused = current.option_details?.find((detail) => detail.option === option)
      syncWrongWordsToStorage(current.word_key, confused?.word_key)
    }
  }

  const submitSpelling = (typed: string) => {
    if (!current || isAnswered) return
    const ok = checkSpelling(typed, current.word)
    setSelected(typed)
    setIsAnswered(true)
    setIsCorrectAnswer(ok)
    if (ok) {
      setCorrectCount((count) => count + 1)
    } else {
      syncWrongWordsToStorage(current.word_key, null)
    }
  }

  const handleSpellingFormSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = spellingInput.trim()
    if (!trimmed) return
    submitSpelling(trimmed)
  }

  const handleNext = () => {
    if (isLast) {
      setFinished(true)
    } else {
      setCurrentIndex((index) => index + 1)
      setSelected(null)
      setIsAnswered(false)
      setIsCorrectAnswer(null)
      setSpellingInput('')
      setShowHint(false)
    }
  }

  useEffect(() => {
    if (!current || finished) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return

      const key = event.key.toLowerCase()
      if (key === 'r' || key === '0') {
        if (current.question_type !== 'word' || isAnswered) {
          event.preventDefault()
          void speakText(current.word, { accent, targetKey: activeTargetKey })
        }
        return
      }

      if ((key === 'enter' || key === ' ') && isAnswered) {
        event.preventDefault()
        handleNext()
        return
      }

      if (
        !isAnswered &&
        current.question_type !== 'spelling' &&
        ['1', '2', '3', '4'].includes(key)
      ) {
        const option = current.options[Number(key) - 1]
        if (option) {
          event.preventDefault()
          handleSelect(option)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    )
  }

  if (questions.length === 0 || !current) {
    if (finished && questions.length > 0) {
      const percent = Math.round((correctCount / questions.length) * 100)
      return (
        <div className="app-card mx-auto max-w-lg rounded-3xl p-6 text-center sm:p-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
            <Trophy size={36} />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">词汇测验完成！</h2>
          <p className="text-base text-[var(--text-secondary)] mb-6 sm:text-lg">
            答对 <strong className="text-[var(--accent-text)]">{correctCount}</strong> / {questions.length} 题（正确率 {percent}%）
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
            <button
              type="button"
              onClick={handleRestart}
              className="app-accent-solid inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
            >
              <RotateCcw size={16} />
              再来一组
            </button>
            <button
              type="button"
              onClick={() => navigate('/daily')}
              className="app-muted-pill min-h-11 rounded-xl px-6 py-3 text-sm font-semibold"
            >
              返回词表
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="app-card rounded-3xl p-8 text-center sm:p-10">
        <p className="mb-4 text-[var(--text-secondary)]">已学词汇量不足，暂无法生成随机测验</p>
        <button
          type="button"
          onClick={() => navigate('/vocabulary/learn')}
          className="app-accent-solid min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          先去学习新词
        </button>
      </div>
    )
  }

  const getOptionStyle = (option: string) => {
    if (!isAnswered) {
      return 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]'
    }
    if (option === current.correct_answer) {
      return 'border-emerald-500 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 font-semibold'
    }
    if (option === selected) {
      return 'border-rose-500 bg-rose-500/12 text-rose-800 dark:text-rose-200'
    }
    return 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] opacity-50'
  }

  const confusedDetail =
    isAnswered &&
    isCorrectAnswer === false &&
    current.question_type !== 'spelling' &&
    selected
      ? current.option_details?.find(
          (detail) =>
            detail.option === selected &&
            detail.word.toLowerCase() !== current.word.toLowerCase(),
        )
      : undefined

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">词汇随堂测验</h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)] sm:text-sm">
            英译中、中译英、听音辨义与拼写默写综合评估，错题自动同步待复习
          </p>
        </div>
        <span className="app-accent-soft self-start rounded-full border px-3.5 py-1 text-xs font-semibold sm:self-auto">
          当前答对：{correctCount} 题
        </span>
      </div>

      {/* Quiz Mode Selector */}
      <div className="app-card flex flex-col gap-2.5 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
        <span className="text-xs font-medium text-[var(--text-secondary)]">抽测题型范围</span>
        <div className="grid w-full grid-cols-3 gap-1.5 sm:inline-flex sm:w-auto" role="group" aria-label="测验模式">
          {QUIZ_MODES.map((item) => {
            const active = quizMode === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => changeQuizMode(item.id)}
                className={`min-h-10 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'app-accent-soft border-[var(--accent)] font-semibold'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <ProgressBar current={currentIndex + 1} total={questions.length} label="答题进度" />

      <div className="app-card rounded-3xl p-4 sm:p-8">
        <div className="mb-6 text-center sm:mb-7">
          {current.question_type === 'spelling' ? (
            <>
              <span className="app-accent-soft inline-block rounded-full border px-3 py-0.5 text-xs font-semibold">
                拼写默写题
              </span>
              <h2 className="mt-3 text-lg font-bold leading-7 text-[var(--text-primary)] sm:text-xl">
                {current.prompt}
              </h2>
              {current.phonetic && (
                <p className="phonetic-font mt-1.5 text-sm text-[var(--text-muted)]">{current.phonetic}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <SpeakButton
                  text={current.word}
                  targetKey={activeTargetKey}
                  variant="hero"
                  showAccentLabel
                />
                {!isAnswered && (
                  <button
                    type="button"
                    disabled={showHint}
                    onClick={() => setShowHint(true)}
                    className="app-muted-pill min-h-11 rounded-full px-4 text-xs font-medium disabled:opacity-45"
                  >
                    {showHint ? '已提示首尾' : '提示首尾字母'}
                  </button>
                )}
              </div>
              {!isAnswered && (
                <p className="phonetic-font mt-3 text-sm tracking-wide text-[var(--text-secondary)]">
                  {buildSpellingHint(current.word, showHint)}
                </p>
              )}
            </>
          ) : current.question_type === 'listening' ? (
            <>
              <div className="flex flex-col items-center gap-3">
                <SpeakButton
                  text={current.word}
                  targetKey={activeTargetKey}
                  variant="hero"
                  showAccentLabel
                />
                <p className="text-xs text-[var(--text-muted)]">
                  {isAnswered ? '听音辨义（点击上方喇叭可重播）' : '请听发音，选择正确的中文释义'}
                </p>
              </div>
              {isAnswered && (
                <div className="mt-3 space-y-1">
                  <p className="headword-font text-2xl font-bold text-[var(--accent-text)]">{current.word}</p>
                  {current.phonetic && (
                    <p className="phonetic-font text-sm text-[var(--text-muted)]">{current.phonetic}</p>
                  )}
                </div>
              )}
            </>
          ) : current.question_type === 'meaning' ? (
            <>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <h2 className="headword-font break-words text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
                  {current.prompt}
                </h2>
                <SpeakButton
                  text={current.word}
                  targetKey={activeTargetKey}
                  showAccentLabel
                />
              </div>
              {current.phonetic && (
                <p className="phonetic-font mt-2 text-sm text-[var(--text-muted)]">{current.phonetic}</p>
              )}
              {current.part_of_speech && (
                <span className="app-accent-soft mt-2.5 inline-block rounded-full border px-3 py-0.5 text-xs font-semibold">
                  {current.part_of_speech}
                </span>
              )}
              <p className="mt-4 text-xs text-[var(--text-muted)]">请选择正确的中文释义</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold leading-7 text-[var(--text-primary)] sm:text-xl">
                {current.prompt}
              </h2>
              <p className="mt-2 text-xs text-[var(--text-muted)]">请选择对应的英文单词</p>
              {isAnswered && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="headword-font font-bold text-[var(--accent-text)]">{current.word}</span>
                  <SpeakButton text={current.word} targetKey={`quiz-ans:${current.word_id}`} showAccentLabel />
                </div>
              )}
            </>
          )}
        </div>

        {/* Question Body: Spelling Form vs 4-Choice Options */}
        {current.question_type === 'spelling' ? (
          !isAnswered ? (
            <form onSubmit={handleSpellingFormSubmit} className="mx-auto max-w-lg space-y-3">
              <label htmlFor="quiz-spelling-input" className="sr-only">
                输入英文拼写
              </label>
              <input
                ref={spellingInputRef}
                id="quiz-spelling-input"
                type="text"
                inputMode="text"
                enterKeyHint="done"
                value={spellingInput}
                onChange={(event) => setSpellingInput(event.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="输入完整英文单词或短语…"
                className="app-input headword-font min-h-12 w-full rounded-2xl px-4 py-3 text-center text-base font-medium sm:text-lg"
              />
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="submit"
                  disabled={!spellingInput.trim()}
                  className="app-accent-solid min-h-12 flex-1 rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm disabled:opacity-45"
                >
                  提交拼写
                </button>
                <button
                  type="button"
                  onClick={() => submitSpelling('')}
                  className="app-muted-pill min-h-12 rounded-2xl px-5 py-3 text-sm font-medium"
                >
                  不会写，看答案
                </button>
              </div>
            </form>
          ) : isCorrectAnswer ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>
                拼写正确：<span className="headword-font text-base">{current.word}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-800 dark:text-rose-200">
              <XCircle size={18} className="shrink-0" aria-hidden="true" />
              <span>
                {selected ? `你输入的是「${selected}」，` : ''}正确拼写为{' '}
                <strong className="headword-font text-base">{current.word}</strong>
              </span>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            {current.options.map((option, idx) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`flex min-h-12 items-center gap-3 rounded-2xl border p-3.5 text-left text-sm transition-all sm:p-4 ${getOptionStyle(option)}`}
                disabled={isAnswered}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-muted)]">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{option}</span>
              </button>
            ))}
          </div>
        )}

        {/* Wrong-Answer & Confused-Word Sync Analysis */}
        {isAnswered && isCorrectAnswer === false && (
          <div className="mt-5 space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {confusedDetail ? '错题与易混词同步对照' : '错题同步复习'}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {confusedDetail
                  ? '本题词与误选对应词均已同步加入每日待复习队列'
                  : '本题已同步加入每日待复习队列'}
              </span>
            </div>

            <div className={`grid gap-3 ${confusedDetail ? 'sm:grid-cols-2' : ''}`}>
              <div className="min-w-0 space-y-1 rounded-xl border border-emerald-500/30 bg-[var(--bg-surface)] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    本题目标词
                  </span>
                  <SpeakButton
                    text={current.word}
                    targetKey={`quiz-cmp-t:${currentIndex}`}
                    variant="inline"
                    showAccentLabel
                  />
                </div>
                <p className="headword-font text-base font-bold text-[var(--text-primary)]">{current.word}</p>
                {current.phonetic && (
                  <p className="phonetic-font text-xs text-[var(--text-muted)]">{current.phonetic}</p>
                )}
                <p className="text-xs leading-5 text-[var(--text-secondary)]">
                  {current.definition_cn || current.correct_answer}
                </p>
              </div>

              {confusedDetail && (
                <div className="min-w-0 space-y-1 rounded-xl border border-rose-500/30 bg-[var(--bg-surface)] p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-rose-500/12 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                      误选对应词 · 已同步待复习
                    </span>
                    <SpeakButton
                      text={confusedDetail.word}
                      targetKey={`quiz-cmp-w:${currentIndex}`}
                      variant="inline"
                      showAccentLabel
                    />
                  </div>
                  <p className="headword-font text-base font-bold text-[var(--text-primary)]">
                    {confusedDetail.word}
                  </p>
                  {confusedDetail.phonetic && (
                    <p className="phonetic-font text-xs text-[var(--text-muted)]">{confusedDetail.phonetic}</p>
                  )}
                  <p className="text-xs leading-5 text-[var(--text-secondary)]">{confusedDetail.definition_cn}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 hidden items-center justify-center gap-4 border-t border-[var(--border-subtle)] pt-4 text-[11px] text-[var(--text-muted)] sm:flex">
          <span className="inline-flex items-center gap-1">
            <Keyboard size={13} aria-hidden="true" />
            快捷键：
          </span>
          {(current.question_type !== 'word' || isAnswered) && <span>R 重播发音</span>}
          {current.question_type !== 'spelling' ? (
            <span>数字 1-4 作答</span>
          ) : (
            <span>输入框回车提交</span>
          )}
          <span>空格 / 回车 下一题</span>
        </div>
      </div>

      {isAnswered && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleNext}
            className="app-accent-solid inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-semibold shadow-sm sm:w-auto"
          >
            <span>{isLast ? '查看测验结果' : '下一题'}</span>
            <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  )
}
