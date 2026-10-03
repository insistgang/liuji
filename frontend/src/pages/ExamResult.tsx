import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { examApi, type ExamResult as ExamResultType } from '../api/exam'
import { Trophy, CheckCircle, XCircle, Clock, Loader2, ArrowLeft } from 'lucide-react'

export default function ExamResult() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState<ExamResultType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!attemptId) return
    examApi
      .getResult(Number(attemptId))
      .then(({ data }) => setResult(data.data))
      .finally(() => setLoading(false))
  }, [attemptId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    )
  }

  if (!result) {
    return <div className="text-center py-20 text-gray-500">结果未找到</div>
  }

  const percent = result.total_score > 0 ? Math.round((result.score / result.total_score) * 100) : 0
  const correctCount = result.questions.filter((q) => q.is_correct).length
  const minutes = Math.floor(result.time_spent / 60)
  const seconds = result.time_spent % 60

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/exams')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <ArrowLeft size={20} />
        返回列表
      </button>

      {/* Score card */}
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <Trophy className="mx-auto text-yellow-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{result.paper_title}</h1>

        <div className="mt-6">
          <div className="text-5xl font-bold text-blue-600">{result.score}</div>
          <div className="text-gray-500 mt-1">/ {result.total_score} 分 ({percent}%)</div>
        </div>

        <div className="flex justify-center gap-8 mt-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" />
            答对 {correctCount}/{result.questions.length} 题
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} />
            用时 {minutes}分{seconds}秒
          </div>
        </div>
      </div>

      {/* Section scores */}
      {Object.keys(result.section_scores).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">各板块得分</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(result.section_scores).map(([section, score]) => (
              <div key={section} className="text-center">
                <div className="text-2xl font-bold text-blue-600">{score}</div>
                <div className="text-sm text-gray-500 mt-1">{section}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question details */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">答题详情</h2>
        <div className="space-y-4">
          {result.questions.map((q) => (
            <div
              key={q.question_id}
              className={`p-4 rounded-lg border ${
                q.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className="text-sm text-gray-500">第 {q.question_num} 题 ({q.points}分)</span>
                  <p className="text-gray-900 mt-1 text-sm line-clamp-2">{q.content}</p>
                </div>
                {q.is_correct ? (
                  <CheckCircle size={20} className="text-green-500 flex-shrink-0 ml-2" />
                ) : (
                  <XCircle size={20} className="text-red-500 flex-shrink-0 ml-2" />
                )}
              </div>
              {!q.is_correct && (
                <div className="mt-2 text-sm">
                  <span className="text-red-600">你的答案: {q.user_answer || '未作答'}</span>
                  <span className="text-green-600 ml-4">正确答案: {q.correct_answer}</span>
                </div>
              )}
              {q.explanation && (
                <p className="mt-2 text-sm text-gray-600">解析: {q.explanation}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={() => navigate('/exams')}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
        >
          返回真题列表
        </button>
      </div>
    </div>
  )
}
