import { type FormEvent, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Keyboard, RotateCcw, X, XCircle } from 'lucide-react'
import SpeakButton from './SpeakButton'
import { buildSpellingHint, checkSpelling, isDesktopFinePointer } from '../../lib/quiz'

interface SpellingPracticeBoxProps {
  word: string
  phonetic?: string
  targetKey: string
  promptLabel?: string
  autoFocusDesktop?: boolean
  onResult?: (isCorrect: boolean, typed: string, usedHint: boolean) => void
  onClose?: () => void
}

export default function SpellingPracticeBox({
  word,
  phonetic,
  targetKey,
  promptLabel = '拼写默写练习',
  autoFocusDesktop = true,
  onResult,
  onClose,
}: SpellingPracticeBoxProps) {
  const [input, setInput] = useState('')
  const [showEdgeHint, setShowEdgeHint] = useState(false)
  const [solved, setSolved] = useState(false)
  const [wrongAttempt, setWrongAttempt] = useState<string | null>(null)
  const [revealedAnswer, setRevealedAnswer] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocusDesktop && isDesktopFinePointer()) {
      inputRef.current?.focus()
    }
  }, [autoFocusDesktop])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    const isCorrect = checkSpelling(trimmed, word)
    if (isCorrect) {
      setSolved(true)
      setWrongAttempt(null)
      setRevealedAnswer(false)
      inputRef.current?.blur()
      onResult?.(true, trimmed, showEdgeHint)
      return
    }
    setWrongAttempt(trimmed)
    setRevealedAnswer(true)
    onResult?.(false, trimmed, showEdgeHint)
    inputRef.current?.select()
  }

  const handleRevealAnswer = () => {
    setRevealedAnswer(true)
    setWrongAttempt(input.trim())
    onResult?.(false, input.trim(), showEdgeHint)
  }

  const handleReset = () => {
    setInput('')
    setSolved(false)
    setWrongAttempt(null)
    setRevealedAnswer(false)
    if (isDesktopFinePointer()) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  return (
    <div className="mt-3.5 space-y-3 rounded-2xl border border-[var(--accent-soft-border)] bg-[var(--bg-subtle)] p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)]">
            <Keyboard size={14} aria-hidden="true" />
            <span>{promptLabel}</span>
          </span>
          {phonetic && (
            <span className="phonetic-font truncate text-xs text-[var(--text-muted)]">{phonetic}</span>
          )}
          <SpeakButton text={word} targetKey={targetKey} variant="inline" showAccentLabel />
        </div>

        <div className="flex items-center gap-1.5">
          {!solved && (
            <button
              type="button"
              disabled={showEdgeHint}
              onClick={() => setShowEdgeHint(true)}
              className="app-muted-pill min-h-8 rounded-lg px-2.5 py-1 text-[11px] font-medium disabled:opacity-45"
            >
              {showEdgeHint ? '已提示首尾' : '首尾提示'}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="收起拼写练习"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {!solved ? (
        <>
          <p className="phonetic-font text-xs tracking-wide text-[var(--text-secondary)]">
            {buildSpellingHint(word, showEdgeHint)}
          </p>

          {(wrongAttempt || revealedAnswer) && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-800 dark:text-rose-200">
              <XCircle size={15} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                {wrongAttempt ? (
                  <span>
                    你输入了「<strong>{wrongAttempt}</strong>」，正确拼写为{' '}
                    <strong className="headword-font">{word}</strong>，可再拼一遍巩固：
                  </span>
                ) : (
                  <span>
                    正确拼写：<strong className="headword-font">{word}</strong>，照着输入一遍加深记忆：
                  </span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`inline-spell-${targetKey}`} className="sr-only">
              默写 {word}
            </label>
            <input
              ref={inputRef}
              id={`inline-spell-${targetKey}`}
              type="text"
              inputMode="text"
              enterKeyHint="done"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="输入英文拼写后按核对…"
              className="app-input headword-font min-h-11 min-w-0 flex-1 rounded-xl px-3.5 py-2 text-base font-medium"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!input.trim()}
                className="app-accent-solid min-h-11 flex-1 rounded-xl px-4 py-2 text-xs font-semibold shadow-2xs disabled:opacity-45 sm:flex-none"
              >
                核对
              </button>
              {!revealedAnswer && (
                <button
                  type="button"
                  onClick={handleRevealAnswer}
                  className="app-muted-pill min-h-11 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  看答案
                </button>
              )}
            </div>
          </form>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-800 dark:text-emerald-200">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            拼写正确：<strong className="headword-font text-sm">{word}</strong>
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-600/25 dark:text-emerald-200"
          >
            <RotateCcw size={12} aria-hidden="true" />
            再拼一次
          </button>
        </div>
      )}
    </div>
  )
}
