import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { examApi, type ExamPaper } from '../api/exam'
import type { LucideIcon } from 'lucide-react'
import { BookOpen, Headphones, PenTool, Languages, Loader2, ArrowLeft, ChevronRight } from 'lucide-react'

const sectionInfo: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  reading: { icon: BookOpen, label: '阅读理解', color: 'bg-blue-600' },
  listening: { icon: Headphones, label: '听力理解', color: 'bg-amber-600' },
  writing: { icon: PenTool, label: '写作', color: 'bg-rose-600' },
  translation: { icon: Languages, label: '段落翻译', color: 'bg-emerald-600' },
}

export default function ExamDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [paper, setPaper] = useState<(ExamPaper & { sections: Record<string, number> }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    examApi
      .getPaper(Number(id))
      .then(({ data }) => setPaper(data.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    )
  }

  if (!paper) {
    return <div className="app-card rounded-2xl py-16 text-center text-sm text-[var(--text-muted)]">试卷未找到</div>
  }

  const handleStart = async (section: string) => {
    try {
      const { data } = await examApi.start(paper.id)
      const attemptId = data.data?.id
      navigate(`/exams/${paper.id}/${section}?attempt=${attemptId}`)
    } catch {
      alert('开始考试失败，请重试')
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/exams')}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={18} />
        返回列表
      </button>

      <div className="app-hero rounded-3xl p-6 md:p-8">
        <h1 className="headword-font text-2xl font-bold">{paper.title}</h1>
        <p className="mt-2 text-sm text-white/80">
          {paper.exam_date && `考试日期：${paper.exam_date} · `}满分：{paper.total_score} 分
        </p>
      </div>

      <h2 className="text-base font-bold text-[var(--text-primary)]">选择练习板块</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Object.entries(paper.sections || {}).map(([section, count]) => {
          const info = sectionInfo[section] || { icon: BookOpen, label: section, color: 'bg-slate-600' }
          const Icon = info.icon
          return (
            <button
              key={section}
              type="button"
              onClick={() => handleStart(section)}
              className="app-card-interactive flex items-center gap-4 rounded-2xl p-5 text-left"
            >
              <div className={`${info.color} flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-xs`}>
                <Icon size={22} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--text-primary)]">{info.label}</h3>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">共 {String(count)} 道题</p>
              </div>
              <ChevronRight size={17} className="text-[var(--text-muted)]" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
