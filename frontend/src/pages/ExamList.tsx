import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { examApi, type ExamPaper } from '../api/exam'
import { FileText, Loader2, Calendar, HelpCircle } from 'lucide-react'

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
        <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">真题练习</h1>
        <p className="text-gray-500 dark:text-slate-400">选择一套真题开始练习</p>
      </div>

      {papers.length === 0 ? (
        <div className="text-center py-20 text-gray-500 dark:text-slate-400">暂无真题数据</div>
      ) : (
        <div className="grid gap-4">
          {papers.map((paper) => (
            <div
              key={paper.id}
              onClick={() => navigate(`/exams/${paper.id}`)}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4"
            >
              <div className="bg-purple-100 dark:bg-purple-950 p-3 rounded-lg">
                <FileText size={24} className="text-purple-600 dark:text-purple-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">{paper.title}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {paper.exam_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {paper.exam_date}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <HelpCircle size={14} />
                    {paper.question_count} 题
                  </span>
                  <span>满分 {paper.total_score}</span>
                </div>
              </div>
              <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">开始练习 &rarr;</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
