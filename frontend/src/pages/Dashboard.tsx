import { useEffect, useState } from 'react'
import { BookOpen, FileText, Headphones, PenTool, Flame } from 'lucide-react'
import { Link } from 'react-router-dom'
import { userApi } from '../api/user'

const taskCards = [
  { icon: BookOpen, label: '背单词', desc: '学习今日新词', to: '/vocabulary/learn', color: 'bg-blue-500' },
  { icon: BookOpen, label: '复习', desc: '复习待复习词汇', to: '/vocabulary/review', color: 'bg-green-500' },
  { icon: FileText, label: '真题练习', desc: '做一套真题', to: '/exams', color: 'bg-purple-500' },
  { icon: Headphones, label: '听力训练', desc: '练习听力', to: '/listening', color: 'bg-orange-500' },
  { icon: PenTool, label: '写作练习', desc: '写一篇作文', to: '/writing', color: 'bg-pink-500' },
]

export default function Dashboard() {
  const [stats, setStats] = useState({
    vocab_learned: 0,
    vocab_mastered: 0,
    exams_completed: 0,
    writings_submitted: 0,
  })

  useEffect(() => {
    userApi
      .getStats()
      .then(({ data }) => {
        if (data.data) setStats(data.data)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">学习仪表盘</h1>
          <p className="text-gray-500 mt-1">坚持每天学习，攻克六级！</p>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full">
          <Flame size={20} className="text-orange-500" />
          <span className="font-semibold text-orange-600">连续 0 天</span>
        </div>
      </div>

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
            { label: '已学词汇', value: stats.vocab_learned },
            { label: '已掌握', value: stats.vocab_mastered },
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
