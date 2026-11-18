import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { writingApi, type WritingPrompt } from '../api/writing'
import { PenTool, Loader2, Star, ChevronRight } from 'lucide-react'

const typeLabels: Record<string, string> = {
  argumentative: '议论文',
  expository: '说明文',
  letter: '应用书信',
}

export default function WritingList() {
  const navigate = useNavigate()
  const [prompts, setPrompts] = useState<WritingPrompt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    writingApi
      .listPrompts()
      .then(({ data }) => setPrompts(data.data || []))
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
        <h1 className="headword-font text-2xl font-bold text-[var(--text-primary)]">写作批改</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">精选六级高频作文母题，支持 AI 智能打分、语法纠错与高级词汇替换</p>
      </div>

      {prompts.length === 0 ? (
        <div className="app-card rounded-2xl py-16 text-center text-sm text-[var(--text-muted)]">暂无写作题目</div>
      ) : (
        <div className="grid gap-4">
          {prompts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/writing/${p.id}`)}
              className="app-card-interactive flex w-full items-center gap-4 rounded-2xl p-5 text-left"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/12 text-rose-600 dark:text-rose-300">
                <PenTool size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-[var(--text-primary)]">{p.title}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                  {p.essay_type && <span>{typeLabels[p.essay_type] || p.essay_type}</span>}
                  {p.word_limit && <span>词数：{p.word_limit} 词</span>}
                  <span className="inline-flex items-center gap-1">
                    <Star size={13} />
                    难度 {p.difficulty}/5
                  </span>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--accent-text)]">
                开始写作 <ChevronRight size={15} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
