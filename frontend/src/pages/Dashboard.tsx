import { useEffect, useState } from 'react'
import {
  Brain,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Flame,
  Headphones,
  PenTool,
  RotateCcw,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { userApi } from '../api/user'
import { dashboardApi, type DailyPlan } from '../api/dashboard'
import { isStaticMode } from '../api/runtime'

const taskCards = [
  { icon: CalendarCheck, label: '每日 20 词', desc: '场景配图与词根精读', to: '/daily', color: 'bg-teal-600' },
  { icon: Brain, label: '词汇特训', desc: '四选一释义排除记忆', to: '/vocabulary/learn', color: 'bg-blue-600' },
  { icon: RotateCcw, label: '间隔复习', desc: '巩固今日到期词汇', to: '/vocabulary/review', color: 'bg-emerald-600' },
  { icon: FileText, label: '真题练习', desc: '阅读 · 翻译 · 套卷演练', to: '/exams', color: 'bg-violet-600' },
  { icon: Headphones, label: '听力训练', desc: '精听音频与题目自测', to: '/listening', color: 'bg-amber-600' },
  { icon: PenTool, label: '写作练习', desc: 'AI 智能评分与逐句润色', to: '/writing', color: 'bg-rose-600' },
]

export default function Dashboard() {
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [stats, setStats] = useState({
    vocab_learned: 0,
    vocab_mastered: 0,
    exams_completed: 0,
    writings_submitted: 0,
  })

  useEffect(() => {
    dashboardApi
      .getDailyPlan()
      .then(({ data }: { data: { data: DailyPlan | null } }) => {
        if (data.data) setPlan(data.data)
      })
      .catch(() => {})
    if (!isStaticMode) {
      userApi
        .getStats()
        .then(({ data }) => {
          if (data.data) setStats(data.data)
        })
        .catch(() => {})
    }
  }, [])

  const learned = plan?.new_words_learned_today ?? 0
  const target = plan?.daily_new_target ?? 20
  const percent = Math.min(100, Math.round((learned / Math.max(1, target)) * 100))
  const remaining = plan?.new_words_remaining ?? target

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="headword-font text-2xl font-bold text-[var(--text-primary)]">学习仪表盘</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {isStaticMode ? '离线模式：学习进度安全保存在本地浏览器' : '每日稳步推进，高效攻克大学英语六级'}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/12 px-4 py-2">
          <Flame size={18} className="text-amber-500" aria-hidden="true" />
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            连续 {plan?.streak_days ?? 0} 天
          </span>
        </div>
      </div>

      <section className="app-hero rounded-3xl p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-xs">
              <Target size={15} className="app-hero-badge" aria-hidden="true" />
              <span className="app-hero-badge">今日单词计划</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight">{learned}</span>
              <span className="text-lg text-white/75">/ {target} 词</span>
            </div>
            <div className="h-2.5 w-full max-w-md overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-sm text-white/80">
              {remaining > 0 ? `还差 ${remaining} 个新词完成今日目标` : '今日新词目标已完成'}
              {plan?.due_reviews ? ` · 另有 ${plan.due_reviews} 个词待复习` : ''}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            {plan?.completed && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-medium text-emerald-100">
                <CheckCircle2 size={16} /> 今日任务已达成
              </span>
            )}
            <Link
              to="/vocabulary/learn"
              className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-md hover:bg-white/95"
            >
              {learned > 0 && remaining > 0 ? '继续今日背词' : '开始背 20 个单词'}
            </Link>
            <span className="text-xs text-white/70">今日已复习 {plan?.reviews_done_today ?? 0} 词</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {taskCards.map(({ icon: Icon, label, desc, to, color }) => (
          <Link
            key={label}
            to={to}
            className="app-card-interactive flex items-start gap-4 rounded-2xl p-5"
          >
            <div className={`${color} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs`}>
              <Icon size={21} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)]">{label}</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="app-card rounded-2xl p-6">
        <h2 className="mb-4 text-base font-bold text-[var(--text-primary)]">累计学习统计</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: '已学词汇', value: isStaticMode ? (plan?.total_learned ?? 0) : stats.vocab_learned },
            { label: '已掌握词汇', value: isStaticMode ? (plan?.mastered ?? 0) : stats.vocab_mastered },
            { label: '完成真题', value: stats.exams_completed },
            { label: '写作批改', value: stats.writings_submitted },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-4 text-center">
              <div className="text-3xl font-bold text-[var(--accent-text)]">{value}</div>
              <div className="mt-1 text-xs font-medium text-[var(--text-muted)]">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
