import { Volume2, Loader2 } from 'lucide-react'
import { speakText, useSpeechPreferences, useSpeechStatus, type Accent } from '../../lib/speech'

interface SpeakButtonProps {
  text: string
  audioUrl?: string | null
  accent?: Accent
  targetKey?: string
  variant?: 'word' | 'hero' | 'sentence' | 'inline'
  showAccentLabel?: boolean
  label?: string
  className?: string
}

export default function SpeakButton({
  text,
  audioUrl,
  accent: forcedAccent,
  targetKey,
  variant = 'word',
  showAccentLabel = false,
  label,
  className = '',
}: SpeakButtonProps) {
  const { accent: prefAccent } = useSpeechPreferences()
  const activeAccent = forcedAccent ?? prefAccent
  const key = targetKey ?? `${activeAccent}:${text}`
  const status = useSpeechStatus(key)
  const isPlaying = status === 'playing'
  const isLoading = status === 'loading'

  const ariaLabel = label ?? `朗读 ${text}（${activeAccent === 'uk' ? '英音' : '美音'}）`

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    void speakText(text, { accent: activeAccent, audioUrl, targetKey: key })
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium align-middle transition-all ${
          isPlaying
            ? 'app-accent-solid shadow-sm ring-2 ring-[var(--accent-ring)]'
            : 'app-accent-soft hover:opacity-90'
        } ${className}`}
      >
        {isLoading ? (
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        ) : (
          <Volume2 size={13} className={isPlaying ? 'animate-pulse' : ''} aria-hidden="true" />
        )}
        {showAccentLabel && <span>{activeAccent === 'uk' ? '英' : '美'}</span>}
      </button>
    )
  }

  if (variant === 'sentence') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        title="朗读例句"
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${
          isPlaying
            ? 'app-accent-solid border-transparent shadow-sm ring-2 ring-[var(--accent-ring)]'
            : 'border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent-text)]'
        } ${className}`}
      >
        {isLoading ? (
          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
        ) : (
          <Volume2 size={14} className={isPlaying ? 'animate-pulse' : ''} aria-hidden="true" />
        )}
      </button>
    )
  }

  if (variant === 'hero') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-all ${
          isPlaying
            ? 'app-accent-solid shadow-md ring-4 ring-[var(--accent-ring)]'
            : 'app-accent-soft border border-[var(--accent-soft-border)] hover:border-[var(--accent)]'
        } ${className}`}
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Volume2 size={18} className={isPlaying ? 'animate-pulse' : ''} aria-hidden="true" />
        )}
        <span>{isPlaying ? '正在朗读' : showAccentLabel ? `${activeAccent === 'uk' ? '英音' : '美音'}朗读` : '发音'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border transition-all ${
        showAccentLabel ? 'h-9 px-3 text-xs font-medium' : 'h-9 w-9'
      } ${
        isPlaying
          ? 'app-accent-solid border-transparent shadow-sm ring-3 ring-[var(--accent-ring)]'
          : 'border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--accent-text)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]'
      } ${className}`}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <Volume2 size={17} className={isPlaying ? 'animate-pulse' : ''} aria-hidden="true" />
      )}
      {showAccentLabel && <span>{activeAccent === 'uk' ? '英' : '美'}</span>}
    </button>
  )
}
