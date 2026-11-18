import { useEffect, useEffectEvent } from 'react'
import { CheckCircle2, RotateCcw, X, AlertCircle } from 'lucide-react'

export default function LearningFeedback({
  message,
  tone,
  onDismiss,
}: {
  message: string
  tone: 'success' | 'retry' | 'error'
  onDismiss: () => void
}) {
  const dismiss = useEffectEvent(onDismiss)
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(), 2600)
    return () => window.clearTimeout(timer)
  }, [])

  const Icon = tone === 'success' ? CheckCircle2 : tone === 'retry' ? RotateCcw : AlertCircle
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-500/35 bg-[var(--bg-surface)] text-[var(--text-primary)]'
      : tone === 'retry'
        ? 'border-amber-500/40 bg-[var(--bg-surface)] text-[var(--text-primary)]'
        : 'border-rose-500/45 bg-[var(--bg-surface)] text-rose-700 dark:text-rose-300'
  const iconColor =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'retry'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400'

  return (
    <div
      className={`feedback-enter bottom-toast-safe fixed left-3.5 right-3.5 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-xl backdrop-blur-md sm:left-4 sm:right-4 ${toneClasses}`}
    >
      <Icon size={20} className={`shrink-0 ${iconColor}`} aria-hidden="true" />
      <p role={tone === 'error' ? 'alert' : 'status'} className="min-w-0 flex-1 break-words text-sm font-medium leading-5">
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="关闭操作反馈"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
