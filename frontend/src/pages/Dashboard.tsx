import { useEffect, useState } from 'react'
import { BookOpen, FileText, Headphones, PenTool, Flame, Target, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { userApi } from '../api/user'
import { dashboardApi, type DailyPlan } from '../api/dashboard'
import { isStaticMode } from '../api/runtime'

const taskCards = [
  { icon: BookOpen, label: '背单词', desc: '学习今日新词', to: '/vocabulary/learn', color: 'bg-blue-500' },
  { icon: BookOpen, label: '复习', desc: '复习待复习词汇', to: '/vocabulary/review', color: 'bg-green-500' },
  { icon: FileText, label: '真题练习', desc: '做一套真题', to: '/exams', color: 'bg-purple-500' },
  { icon: Headphones, label: '听力训练', desc: '练习听力', to: '/listening', color: 'bg-orange-500' },
  { icon: PenTool, label: '写作练习', desc: '写一篇作文', to: '/writing', color: 'bg-pink-500' },
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
    dashboardApi.getDailyPlan().then(({ data }: { data: { data: DailyPlan | null } }) => {
      if (data.data) setPlan(data.data)
    }).catch(() => {})
    if (!isStaticMode) {
      userApi.getStats().then(({ data }) => {
        if (data.data) setStats(data.data)
      }).catch(() => {})
    }
  }, [])

  const learned = plan?.new_words_learned_today ?? 0
  const target = plan?.daily_new_target ?? 20
  const percent = Math.min(100, Math.round((learned / target) * 100))
  const remaining = plan?.new_words_remaining ?? target

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">学习仪表盘</h1>
          <p className="text-gray-500 mt-1">
            {isStaticMode ? '离线模式：进度保存在当前浏览器' : '坚持每天学习，攻克六级！'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full">
          <Flame size={20} className="text-orange-500" />
          <span className="font-semibold text-orange-600">连续 {plan?.streak_days ?? 0} 天</span>
        </div>
      </div>

      <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-100">
              <Target size={20} />
              <span className="text-sm font-medium">今日单词计划</span>
            </div>
            <div>
              <span className="text-5xl font-bold">{learned}</span>
              <span className="ml-2 text-xl text-blue-100">/ {target} 词</span>
            </div>
            <div className="h-3 w-full max-w-md overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-sm text-blue-100">
              {remaining > 0 ? `还差 ${remaining} 个新词完成今日目标` : '今日新词目标已完成'}
              {plan?.due_reviews ? ` · 另有 ${plan.due_reviews} 个词待复习` : ''}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            {plan?.completed && (
              <span className="flex items-center gap-2 rounded-full bg-green-400/20 px-3 py-1 text-sm text-green-100">
                <CheckCircle2 size={18} /> 今日任务完成
              </span>
            )}
            <Link
              to="/vocabulary/learn"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 shadow transition hover:bg-blue-50"
            >
              {learned > 0 && remaining > 0 ? '继续背词' : '开始背 20 个单词'}
            </Link>
            <span className="text-xs text-blue-200">今日已复习 {plan?.reviews_done_today ?? 0} 词</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {taskCards.map(({ icon: Icon, label, desc, to, color }) => (
          <Link
            key={label}
            to={to}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4"
          >
            <div className={`${color} p-3 rounded-lg text-white`}>
              <Icon size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{label}</h3>
              <p className="text-sm text-gray-500 mt-1">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">学习统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '已学词汇', value: isStaticMode ? (plan?.total_learned ?? 0) : stats.vocab_learned },
            { label: '已掌握', value: isStaticMode ? (plan?.mastered ?? 0) : stats.vocab_mastered },
            { label: '已做真题', value: stats.exams_completed },
            { label: '写作提交', value: stats.writings_submitted },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold text-blue-600">{value}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
