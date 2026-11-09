import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { writingApi, type WritingPrompt } from '../api/writing'
import { PenTool, Loader2, Star } from 'lucide-react'

const typeLabels: Record<string, string> = {
  argumentative: '议论文',
  expository: '说明文',
  letter: '书信',
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
        <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">写作练习</h1>
        <p className="text-gray-500 dark:text-slate-400">选择题目开始写作，AI 将为你提供批改反馈</p>
      </div>

      {prompts.length === 0 ? (
        <div className="text-center py-20 text-gray-500 dark:text-slate-400">暂无写作题目</div>
      ) : (
        <div className="grid gap-4">
          {prompts.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/writing/${p.id}`)}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4"
            >
              <div className="bg-pink-100 dark:bg-pink-950 p-3 rounded-lg">
                <PenTool size={24} className="text-pink-600 dark:text-pink-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">{p.title}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {p.essay_type && <span>{typeLabels[p.essay_type] || p.essay_type}</span>}
                  {p.word_limit && <span>字数: {p.word_limit} 词</span>}
                  <span className="flex items-center gap-1">
                    <Star size={14} />
                    难度 {p.difficulty}/5
                  </span>
                </div>
              </div>
              <div className="text-pink-600 dark:text-pink-300 text-sm font-medium">开始写作 &rarr;</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
