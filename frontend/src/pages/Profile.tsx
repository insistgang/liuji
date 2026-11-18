import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, BookOpen, FileText, PenTool, Check, ChevronRight, Volume2 } from 'lucide-react'
import { THEMES, useThemeStore } from '../store/themeStore'
import { speakText, useSpeechPreferences } from '../lib/speech'

export default function Profile() {
  const { user, logout } = useAuthStore()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const { accent, setAccent, autoSpeak, setAutoSpeak } = useSpeechPreferences()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="headword-font text-2xl font-bold text-[var(--text-primary)]">个人中心与偏好</h1>

      {/* User Card */}
      <div className="app-card flex items-center gap-4 rounded-2xl p-6">
        <div className="app-accent-soft flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border">
          <User size={30} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-[var(--text-primary)]">{user.username}</h2>
          <p className="truncate text-sm text-[var(--text-muted)]">{user.email}</p>
        </div>
      </div>

      {/* Pronunciation Preferences */}
      <section className="app-card space-y-4 rounded-2xl p-6">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">单词发音设置</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            采用真人词典原声录音 + 精选自然英语语音双通道兜底
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-4">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">默认发音口音</p>
            <p className="text-xs text-[var(--text-muted)]">切换后点击任意单词喇叭即刻生效</p>
          </div>
          <div className="flex gap-2">
            {(['us', 'uk'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setAccent(item)
                  void speakText('intuitive', { accent: item, targetKey: `prof:${item}` })
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold ${
                  accent === item ? 'app-accent-solid shadow-xs' : 'app-muted-pill'
                }`}
              >
                <Volume2 size={14} aria-hidden="true" />
                {item === 'us' ? '美音 (US)' : '英音 (UK)'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-4">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">词汇特训自动朗读</p>
            <p className="text-xs text-[var(--text-muted)]">进入下一张单词卡时自动播放读音</p>
          </div>
          <button
            type="button"
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold ${
              autoSpeak ? 'app-accent-solid shadow-xs' : 'app-muted-pill'
            }`}
          >
            {autoSpeak ? '已开启' : '已关闭'}
          </button>
        </div>
      </section>

      {/* Visual Style Gallery */}
      <section className="app-card space-y-4 rounded-2xl p-6">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">界面主题风格</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">选择最适合你当前光线环境的阅读配色</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((item) => {
            const active = item.id === theme
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-all ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent-ring)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="h-4 w-4 rounded-full ring-2 ring-black/10 dark:ring-white/20"
                    style={{ backgroundColor: item.accentPreview }}
                  />
                  {active && <Check size={15} className="text-[var(--accent-text)]" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{item.name}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{item.subtitle}</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Navigation Links */}
      <div className="app-card overflow-hidden rounded-2xl divide-y divide-[var(--border-subtle)]">
        {[
          { to: '/vocabulary/test', icon: BookOpen, label: '词汇随堂测验', color: 'text-blue-500' },
          { to: '/exams', icon: FileText, label: '真题练习记录', color: 'text-violet-500' },
          { to: '/writing', icon: PenTool, label: '作文批改记录', color: 'text-rose-500' },
        ].map(({ to, icon: Icon, label, color }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[var(--bg-subtle)]"
          >
            <Icon size={20} className={color} />
            <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
            <ChevronRight size={17} className="ml-auto text-[var(--text-muted)]" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 hover:bg-rose-500/18 dark:text-rose-400"
      >
        <LogOut size={18} />
        退出登录
      </button>
    </div>
  )
}
