import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { examApi, type ExamPaper } from '../api/exam'
import type { LucideIcon } from 'lucide-react'
import { BookOpen, Headphones, PenTool, Languages, Loader2, ArrowLeft } from 'lucide-react'

const sectionInfo: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  reading: { icon: BookOpen, label: '阅读理解', color: 'bg-blue-500' },
  listening: { icon: Headphones, label: '听力理解', color: 'bg-orange-500' },
  writing: { icon: PenTool, label: '写作', color: 'bg-pink-500' },
  translation: { icon: Languages, label: '翻译', color: 'bg-green-500' },
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
        <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={32} />
      </div>
    )
  }

  if (!paper) {
    return <div className="text-center py-20 text-gray-500 dark:text-slate-400">试卷未找到</div>
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
      <button onClick={() => navigate('/exams')} className="flex items-center gap-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100">
        <ArrowLeft size={20} />
        返回列表
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">{paper.title}</h1>
        <p className="text-gray-500 dark:text-slate-400">
          {paper.exam_date && `考试日期: ${paper.exam_date} | `}
          满分: {paper.total_score}
        </p>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">选择练习板块</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(paper.sections || {}).map(([section, count]) => {
          const info = sectionInfo[section] || { icon: BookOpen, label: section, color: 'bg-gray-500' }
          const Icon = info.icon
          return (
            <button
              key={section}
              onClick={() => handleStart(section)}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 text-left"
            >
              <div className={`${info.color} p-3 rounded-lg text-white`}>
                <Icon size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">{info.label}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">{String(count)} 道题</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
