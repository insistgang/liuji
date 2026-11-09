import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listeningApi, type ListeningMaterial } from '../api/listening'
import { Headphones, Loader2, Clock, Star } from 'lucide-react'

const typeLabels: Record<string, string> = {
  news_report: '新闻报道',
  lecture: '讲座',
  conversation: '对话',
}

export default function ListeningList() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState<ListeningMaterial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listeningApi
      .list()
      .then(({ data }) => setMaterials(data.data || []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">听力训练</h1>
        <p className="text-gray-500 dark:text-slate-400">选择材料开始听力练习</p>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-20 text-gray-500 dark:text-slate-400">暂无听力材料</div>
      ) : (
        <div className="grid gap-4">
          {materials.map((m) => (
            <div
              key={m.id}
              onClick={() => navigate(`/listening/${m.id}`)}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4"
            >
              <div className="bg-orange-100 dark:bg-orange-950 p-3 rounded-lg">
                <Headphones size={24} className="text-orange-600 dark:text-orange-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">{m.title}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-slate-400">
                  <span>{typeLabels[m.section_type] || m.section_type}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {Math.floor(m.duration / 60)}:{(m.duration % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={14} />
                    难度 {m.difficulty}/5
                  </span>
                  <span>{m.exercise_count} 题</span>
                </div>
              </div>
              <div className="text-orange-600 dark:text-orange-300 text-sm font-medium">开始练习 &rarr;</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
