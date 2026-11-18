import { useEffect, useRef, useState } from 'react'
import { Check, Moon, Palette, Sun, Volume2 } from 'lucide-react'
import { getThemeMeta, isDarkTheme, THEMES, useThemeStore, type Theme } from '../../store/themeStore'
import { speakText, useSpeechPreferences } from '../../lib/speech'

export default function ThemeToggle({
  className = '',
  showAccentSwitch = true,
}: {
  className?: string
  showAccentSwitch?: boolean
}) {
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const toggle = useThemeStore((state) => state.toggle)
  const { accent, setAccent } = useSpeechPreferences()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentMeta = getThemeMeta(theme)
  const isDark = isDarkTheme(theme)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const selectStyle = (next: Theme) => {
    setTheme(next)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-2 ${className}`}>
      {showAccentSwitch && (
        <div
          role="group"
          aria-label="单词发音口音"
          className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs shadow-xs"
        >
          <button
            type="button"
            onClick={() => {
              setAccent('us')
              void speakText('vocabulary', { accent: 'us', targetKey: 'preview:us' })
            }}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-all ${
              accent === 'us'
                ? 'app-accent-solid shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="切换为美式发音（点击试听）"
          >
            <Volume2 size={12} aria-hidden="true" />
            美音
          </button>
          <button
            type="button"
            onClick={() => {
              setAccent('uk')
              void speakText('vocabulary', { accent: 'uk', targetKey: 'preview:uk' })
            }}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-all ${
              accent === 'uk'
                ? 'app-accent-solid shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="切换为英式发音（点击试听）"
          >
            英音
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`选择界面风格，当前为${currentMeta.name}`}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] shadow-xs hover:border-[var(--border-strong)]"
      >
        <span
          className="h-3 w-3 rounded-full ring-2 ring-black/10 dark:ring-white/20"
          style={{ backgroundColor: currentMeta.accentPreview }}
          aria-hidden="true"
        />
        <Palette size={14} className="text-[var(--text-secondary)]" aria-hidden="true" />
        <span className="hidden sm:inline">{currentMeta.name}</span>
        <span className="sm:hidden">风格</span>
      </button>

      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? '切换到日间风格' : '切换到夜间风格'}
        title={isDark ? '切换到日间风格' : '切换到夜间风格'}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-xs hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
      >
        {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="选择视觉风格"
          className="feedback-enter absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] sm:w-96 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">界面主题风格</p>
              <p className="text-xs text-[var(--text-muted)]">6 款精选配色与排版质感，自动记忆偏好</p>
            </div>
            <span className="rounded-full bg-[var(--bg-muted)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
              {isDark ? '夜间护眼' : '日间阅读'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {THEMES.map((item) => {
              const active = item.id === theme
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectStyle(item.id)}
                  className={`group flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-all ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent-ring)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div
                    className="flex h-9 w-full items-center justify-between rounded-lg border border-black/10 px-2.5 dark:border-white/10"
                    style={{ backgroundColor: item.canvasPreview }}
                    aria-hidden="true"
                  >
                    <div
                      className="flex items-center gap-1.5 rounded-md px-2 py-1 shadow-2xs"
                      style={{ backgroundColor: item.surfacePreview }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.accentPreview }} />
                      <span
                        className="h-1.5 w-8 rounded-full opacity-50"
                        style={{ backgroundColor: item.mode === 'dark' ? '#cbd5e1' : '#334155' }}
                      />
                    </div>
                    {active && (
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: item.accentPreview }}
                      >
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{item.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {item.mode === 'dark' ? '暗色' : '浅色'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-secondary)]">{item.subtitle}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
