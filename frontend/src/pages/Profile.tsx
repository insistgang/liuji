import { type ChangeEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  FileText,
  LogOut,
  PenTool,
  Trophy,
  Upload,
  User,
  Volume2,
} from 'lucide-react'
import { isStaticMode } from '../api/runtime'
import {
  applyBackupImport,
  encodeSyncCode,
  parseBackupInput,
  serializeBackupJson,
  type ImportMode,
} from '../lib/progressBackup'
import { speakText, useSpeechPreferences } from '../lib/speech'
import { useAuthStore } from '../store/authStore'
import { day, useDailyLibrary, useDailyRecords } from '../store/dailyLibrary'
import { THEMES, useThemeStore } from '../store/themeStore'

type StatusBanner = { tone: 'success' | 'error'; message: string }

export default function Profile() {
  const { user, logout } = useAuthStore()
  const { library } = useDailyLibrary()
  const { records, storageError } = useDailyRecords()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const { accent, setAccent, autoSpeak, setAutoSpeak } = useSpeechPreferences()
  const navigate = useNavigate()

  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [importText, setImportText] = useState('')
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [banner, setBanner] = useState<StatusBanner | null>(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user && !isStaticMode) return null

  const today = day()
  const recordEntries = Object.values(records)
  const learnedCount = recordEntries.length
  const longTermCount = recordEntries.filter((entry) => entry.interval > 0).length
  const dueTodayCount = recordEntries.filter((entry) => entry.due <= today).length
  const checkInDays = new Set(
    recordEntries.flatMap((entry) => [entry.learned, ...entry.reviewed]),
  ).size

  const handleExportJson = () => {
    try {
      const json = serializeBackupJson(records)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `liuji-progress-${today}.json`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      setBanner({
        tone: 'success',
        message: `已导出 ${learnedCount} 条学习记录及界面/发音偏好设置。`,
      })
    } catch (err) {
      setBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : '导出备份文件失败，请检查现有记录。',
      })
    }
  }

  const handleCopySyncCode = async () => {
    try {
      const code = encodeSyncCode(records)
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code)
        setBanner({
          tone: 'success',
          message: `跨设备同步码已复制到剪贴板（含 ${learnedCount} 条记录），发送到另一台设备粘贴即可恢复。`,
        })
      } else {
        setImportText(code)
        setBanner({
          tone: 'success',
          message: '当前浏览器不支持自动剪贴板，已将同步码填入下方文本框，请全选复制。',
        })
      }
    } catch (err) {
      setBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : '生成同步码失败，请检查现有学习记录。',
      })
    }
  }

  const executeImport = (raw: string, mode: ImportMode) => {
    try {
      const summary = applyBackupImport(raw, mode)
      if (summary.preferences?.theme) setTheme(summary.preferences.theme)
      if (summary.preferences?.accent) setAccent(summary.preferences.accent)
      if (summary.preferences?.autoSpeak !== undefined) {
        setAutoSpeak(summary.preferences.autoSpeak)
      }
      setImportText('')
      setConfirmReplace(false)
      setBanner({
        tone: 'success',
        message:
          mode === 'merge'
            ? `导入成功！新增 ${summary.added} 词，更新 ${summary.updated} 词，当前共 ${summary.total} 条学习记录。`
            : `已完整恢复 ${summary.total} 条学习记录。`,
      })
    } catch (err) {
      setConfirmReplace(false)
      setBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : '导入失败，请检查备份内容格式。',
      })
    }
  }

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const content = await file.text()
      if (importMode === 'replace' && learnedCount > 0) {
        parseBackupInput(content)
        setImportText(content)
        setConfirmReplace(true)
        setBanner(null)
        return
      }
      executeImport(content, importMode)
    } catch (err) {
      setConfirmReplace(false)
      setBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : '读取备份文件失败，未修改当前记录。',
      })
    }
  }

  const handleImportSubmit = () => {
    if (importMode === 'replace' && learnedCount > 0 && !confirmReplace) {
      try {
        parseBackupInput(importText)
        setConfirmReplace(true)
        setBanner(null)
      } catch (err) {
        setBanner({
          tone: 'error',
          message: err instanceof Error ? err.message : '备份内容格式无效，未修改当前记录。',
        })
      }
      return
    }
    executeImport(importText, importMode)
  }

  const quickLinks = isStaticMode
    ? [
        { to: '/daily', icon: CalendarCheck, label: '每日 20 词与完整讲义', color: 'text-teal-500' },
        { to: '/vocabulary/learn', icon: Brain, label: '词汇特训（看词 / 听音 / 默写）', color: 'text-blue-500' },
        { to: '/vocabulary/test', icon: Trophy, label: '词汇随堂测验', color: 'text-amber-500' },
      ]
    : [
        { to: '/vocabulary/test', icon: BookOpen, label: '词汇随堂测验', color: 'text-blue-500' },
        { to: '/exams', icon: FileText, label: '真题练习记录', color: 'text-violet-500' },
        { to: '/writing', icon: PenTool, label: '作文批改记录', color: 'text-rose-500' },
      ]

  const displayName = user?.username || '本地学习者'
  const displaySubtitle = isStaticMode
    ? '离线学习模式 · 记录保存在当前浏览器并支持导出互传'
    : user?.email || ''

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="headword-font text-2xl font-bold text-[var(--text-primary)]">
        {isStaticMode ? '数据备份与偏好设置' : '个人中心与偏好'}
      </h1>

      {/* User Card */}
      <div className="app-card flex items-center gap-4 rounded-2xl p-6">
        <div className="app-accent-soft flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border">
          <User size={30} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-[var(--text-primary)]">{displayName}</h2>
          <p className="truncate text-sm text-[var(--text-muted)]">{displaySubtitle}</p>
        </div>
      </div>

      {/* Learning Data Overview */}
      <section className="app-card space-y-4 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">学习数据概览</h3>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {library
                ? `已覆盖总词库 ${learnedCount} / ${library.total_words} 词`
                : '实时统计本地艾宾浩斯词汇记忆进度'}
            </p>
          </div>
          {dueTodayCount > 0 && (
            <button
              type="button"
              onClick={() => navigate('/vocabulary/learn')}
              className="rounded-full bg-amber-500/12 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
            >
              今日待复习 {dueTodayCount} 词 →
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
            <p className="text-xs text-[var(--text-muted)]">已学词数</p>
            <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{learnedCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
            <p className="text-xs text-[var(--text-muted)]">长效复习中</p>
            <p className="mt-1 text-xl font-bold text-[var(--accent-text)]">{longTermCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
            <p className="text-xs text-[var(--text-muted)]">今日待复习</p>
            <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{dueTodayCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
            <p className="text-xs text-[var(--text-muted)]">累计打卡天数</p>
            <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{checkInDays}</p>
          </div>
        </div>
      </section>

      {/* Progress Backup & Cross-Device Sync */}
      <section id="backup" className="app-card space-y-5 rounded-2xl p-4 sm:p-6">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">学习记录备份与跨设备同步</h3>
          <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
            数据默认保存在当前浏览器本地，换设备或清理缓存前可通过备份文件或同步码在手机与电脑间无损互传。
          </p>
        </div>

        {storageError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300"
          >
            {storageError}
          </div>
        )}

        {banner && (
          <div
            role="status"
            className={`flex items-start gap-2 rounded-xl border p-3.5 text-xs leading-5 ${
              banner.tone === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200'
            }`}
          >
            {banner.tone === 'success' ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <span>{banner.message}</span>
          </div>
        )}

        {/* Export Controls */}
        <div className="grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="app-accent-solid inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xs"
          >
            <Download size={15} aria-hidden="true" />
            导出 JSON 备份
          </button>
          <button
            type="button"
            onClick={() => void handleCopySyncCode()}
            className="app-muted-pill inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
          >
            <Copy size={15} aria-hidden="true" />
            复制跨设备同步码
          </button>
          <label className="app-muted-pill inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold">
            <Upload size={15} aria-hidden="true" />
            <span>从 JSON 文件导入</span>
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(event) => void handleFileImport(event)}
            />
          </label>
        </div>

        {/* Import Mode & Paste Box */}
        <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">导入方式</span>
            <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto" role="group" aria-label="导入方式">
              <button
                type="button"
                onClick={() => {
                  setImportMode('merge')
                  setConfirmReplace(false)
                }}
                className={`min-h-10 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all sm:min-h-0 sm:px-3 ${
                  importMode === 'merge' ? 'app-accent-solid shadow-2xs' : 'app-muted-pill'
                }`}
              >
                智能合并（推荐）
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportMode('replace')
                  setConfirmReplace(false)
                }}
                className={`min-h-10 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all sm:min-h-0 sm:px-3 ${
                  importMode === 'replace' ? 'app-accent-solid shadow-2xs' : 'app-muted-pill'
                }`}
              >
                完整覆盖当前记录
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="sync-import-input" className="sr-only">
              粘贴跨设备同步码或 JSON 备份内容
            </label>
            <textarea
              id="sync-import-input"
              rows={3}
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value)
                setConfirmReplace(false)
              }}
              placeholder="粘贴以 LIUJI1: 开头的同步码，或直接粘贴导出的 JSON 备份内容…"
              className="app-input w-full rounded-xl p-3 font-mono text-xs leading-5"
            />
          </div>

          {confirmReplace ? (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-500/35 bg-amber-500/12 p-3 text-xs text-amber-900 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
              <span>
                确认覆盖本地现有的 <strong>{learnedCount}</strong> 条学习记录？此操作不可撤销。
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => executeImport(importText, 'replace')}
                  className="min-h-10 flex-1 rounded-lg bg-rose-600 px-3.5 py-1.5 font-semibold text-white hover:bg-rose-700 sm:min-h-0 sm:flex-none"
                >
                  确认覆盖导入
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReplace(false)}
                  className="app-muted-pill min-h-10 flex-1 rounded-lg px-3.5 py-1.5 font-medium sm:min-h-0 sm:flex-none"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[11px] leading-4 text-[var(--text-muted)]">
                合并模式会保留双端最早学习日、完整打卡记录与更高复习阶段；校验不通过不会改动原数据。
              </span>
              <button
                type="button"
                disabled={!importText.trim()}
                onClick={handleImportSubmit}
                className="app-accent-solid min-h-11 shrink-0 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-45 sm:min-h-0"
              >
                验证并导入
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Pronunciation Preferences */}
      <section className="app-card space-y-4 rounded-2xl p-6">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">单词发音设置</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            采用真人词典原声录音 + 精选自然英语语音双通道兜底
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4">
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4">
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
        {quickLinks.map(({ to, icon: Icon, label, color }) => (
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

      {!isStaticMode && (
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 hover:bg-rose-500/18 dark:text-rose-400"
        >
          <LogOut size={18} />
          退出登录
        </button>
      )}
    </div>
  )
}
