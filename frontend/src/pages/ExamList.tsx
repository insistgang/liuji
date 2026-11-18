import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { examApi, type ExamPaper } from '../api/exam'
import { FileText, Loader2, Calendar, HelpCircle, ChevronRight } from 'lucide-react'

export default function ExamList() {
  const navigate = useNavigate()
  const [papers, setPapers] = useState<ExamPaper[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    examApi
      .list()
      .then(({ data }) => setPapers(data.data || []))
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
        <h1 className="headword-font text-2xl font-bold text-[var(--text-primary)]">真题练习</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">选择历年真题或全真模拟套卷开始限时训练</p>
      </div>

      {papers.length === 0 ? (
        <div className="app-card rounded-2xl py-16 text-center text-sm text-[var(--text-muted)]">暂无真题数据</div>
      ) : (
        <div className="grid gap-4">
          {papers.map((paper) => (
            <button
              key={paper.id}
              type="button"
              onClick={() => navigate(`/exams/${paper.id}`)}
              className="app-card-interactive flex w-full items-center gap-4 rounded-2xl p-5 text-left"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-600 dark:text-violet-300">
                <FileText size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-[var(--text-primary)]">{paper.title}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                  {paper.exam_date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={13} />
                      {paper.exam_date}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <HelpCircle size={13} />
                    {paper.question_count} 题
                  </span>
                  <span>满分 {paper.total_score}</span>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--accent-text)]">
                开始练习 <ChevronRight size={15} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
