import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listeningApi, type ListeningMaterial } from '../api/listening'
import { Headphones, Loader2, Clock, Star, ChevronRight } from 'lucide-react'

const typeLabels: Record<string, string> = {
  news_report: '新闻报道',
  lecture: '学术讲座',
  conversation: '长对话',
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
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="headword-font text-2xl font-bold text-[var(--text-primary)]">听力训练</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">倍速精听神经语音材料，对照原文攻克六级听力</p>
      </div>

      {materials.length === 0 ? (
        <div className="app-card rounded-2xl py-16 text-center text-sm text-[var(--text-muted)]">暂无听力材料</div>
      ) : (
        <div className="grid gap-4">
          {materials.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => navigate(`/listening/${m.id}`)}
              className="app-card-interactive flex w-full items-center gap-4 rounded-2xl p-5 text-left"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-300">
                <Headphones size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-[var(--text-primary)]">{m.title}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span>{typeLabels[m.section_type] || m.section_type}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} />
                    {Math.floor(m.duration / 60)}:{(m.duration % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star size={13} />
                    难度 {m.difficulty}/5
                  </span>
                  <span>{m.exercise_count} 题</span>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--accent-text)]">
                开始精听 <ChevronRight size={15} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
