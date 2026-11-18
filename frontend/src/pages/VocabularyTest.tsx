import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Keyboard, Loader2, RotateCcw, Trophy } from 'lucide-react'
import { vocabApi } from '../api/vocabulary'
import SpeakButton from '../components/vocabulary/SpeakButton'
import ProgressBar from '../components/vocabulary/ProgressBar'
import { speakText, useSpeechPreferences } from '../lib/speech'

interface QuizQuestion {
  word_id: number
  word: string
  phonetic: string | null
  part_of_speech: string | null
  question_type: string
  prompt: string
  options: string[]
  correct_answer: string
}

export default function VocabularyTest() {
  const navigate = useNavigate()
  const { accent } = useSpeechPreferences()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)

  const fetchQuiz = useCallback(() => {
    return vocabApi
      .startQuiz(10)
      .then(({ data }) => {
        setQuestions(data.data || [])
        setCurrentIndex(0)
        setSelected(null)
        setIsAnswered(false)
        setCorrectCount(0)
        setFinished(false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void fetchQuiz()
  }, [fetchQuiz])

  const handleRestart = () => {
    setLoading(true)
    void fetchQuiz()
  }

  const current = !loading && !finished && questions[currentIndex] ? questions[currentIndex] : null
  const activeListeningWord = current?.question_type === 'listening' && !isAnswered ? current.word : ''
  const activeTargetKey = current ? `quiz:${currentIndex}:${current.word_id}` : ''

  useEffect(() => {
    if (!activeListeningWord) return
    void speakText(activeListeningWord, { accent, targetKey: activeTargetKey })
  }, [activeListeningWord, activeTargetKey, accent])

  const isLast = currentIndex === questions.length - 1

  const handleSelect = (option: string) => {
    if (!current || isAnswered) return
    setSelected(option)
    setIsAnswered(true)
    if (option === current.correct_answer) {
      setCorrectCount((count) => count + 1)
    }
  }

  const handleNext = () => {
    if (isLast) {
      setFinished(true)
    } else {
      setCurrentIndex((index) => index + 1)
      setSelected(null)
      setIsAnswered(false)
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

      if (!isAnswered && ['1', '2', '3', '4'].includes(key)) {
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
        <div className="app-card mx-auto max-w-lg rounded-3xl p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
            <Trophy size={36} />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">词汇测验完成！</h2>
          <p className="text-lg text-[var(--text-secondary)] mb-6">
            答对 <strong className="text-[var(--accent-text)]">{correctCount}</strong> / {questions.length} 题（正确率 {percent}%）
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleRestart}
              className="app-accent-solid inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
            >
              <RotateCcw size={16} />
              再来一组
            </button>
            <button
              type="button"
              onClick={() => navigate('/daily')}
              className="app-muted-pill rounded-xl px-6 py-3 text-sm font-semibold"
            >
              返回词表
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="app-card rounded-3xl p-10 text-center">
        <p className="mb-4 text-[var(--text-secondary)]">已学词汇量不足，暂无法生成随机测验</p>
        <button
          type="button"
          onClick={() => navigate('/vocabulary/learn')}
          className="app-accent-solid rounded-xl px-5 py-2.5 text-sm font-semibold"
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">词汇随堂测验</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">检验词汇英译中、中译英与听音辨义综合能力</p>
        </div>
        <span className="app-accent-soft rounded-full border px-3.5 py-1 text-xs font-semibold">
          当前答对：{correctCount} 题
        </span>
      </div>

      <ProgressBar current={currentIndex + 1} total={questions.length} label="答题进度" />

      <div className="app-card rounded-3xl p-6 sm:p-8">
        <div className="mb-7 text-center">
          {current.question_type === 'listening' ? (
            <>
              <div className="flex flex-col items-center gap-3">
                <SpeakButton
                  text={current.word}
                  targetKey={activeTargetKey}
                  variant="hero"
                  showAccentLabel
                />
                <p className="text-xs text-[var(--text-muted)]">
                  {isAnswered ? '听音辨义（点击上方喇叭可重播）' : '请听发音，选择正确的中文释义（按 R 重播）'}
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
              <div className="flex items-center justify-center gap-3">
                <h2 className="headword-font text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
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
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{current.prompt}</h2>
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {current.options.map((option, idx) => (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left text-sm transition-all ${getOptionStyle(option)}`}
              disabled={isAnswered}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-muted)]">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{option}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 hidden items-center justify-center gap-4 border-t border-[var(--border-subtle)] pt-4 text-[11px] text-[var(--text-muted)] sm:flex">
          <span className="inline-flex items-center gap-1">
            <Keyboard size={13} aria-hidden="true" />
            快捷键：
          </span>
          {(current.question_type !== 'word' || isAnswered) && <span>R 重播发音</span>}
          <span>数字 1-4 作答</span>
          <span>空格 / 回车 下一题</span>
        </div>
      </div>

      {isAnswered && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleNext}
            className="app-accent-solid inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-semibold shadow-sm"
          >
            <span>{isLast ? '查看测验结果' : '下一题'}</span>
            <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  )
}
