import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { examApi, type ExamQuestion } from '../api/exam'
import Timer from '../components/exam/Timer'
import { ArrowLeft, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'

export default function ExamPractice() {
  const { id, section } = useParams()
  const [searchParams] = useSearchParams()
  const attemptId = searchParams.get('attempt')
  const navigate = useNavigate()

  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [startTime] = useState(() => new Date().toISOString())

  useEffect(() => {
    if (!id || !section || !attemptId) {
      if (!attemptId) navigate(`/exams/${id}`)
      return
    }
    examApi
      .getSection(Number(id), section)
      .then(({ data }) => setQuestions(data.data || []))
      .finally(() => setLoading(false))
  }, [id, section, attemptId, navigate])

  if (!attemptId) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={32} />
      </div>
    )
  }

  if (questions.length === 0) {
    return <div className="text-center py-20 text-gray-500 dark:text-slate-400">暂无题目</div>
  }

  const current = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const answeredCount = Object.keys(answers).length

  const handleSelect = (option: string) => {
    setAnswers({ ...answers, [current.id]: option })
    if (attemptId) {
      examApi.submitAnswer(Number(attemptId), current.id, option).catch(() => {})
    }
  }

  const handleSubmit = async () => {
    if (!attemptId) return
    if (!confirm('确定要提交试卷吗？')) return

    setSubmitting(true)
    try {
      await examApi.submitExam(Number(attemptId))
      navigate(`/exams/attempt/${attemptId}/result`)
    } catch {
      setSubmitting(false)
    }
  }

  const isWritingOrTranslation = section === 'writing' || section === 'translation'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/exams/${id}`)}
          className="flex items-center gap-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100"
        >
          <ArrowLeft size={20} />
          返回
        </button>
        <Timer startTime={startTime} />
      </div>

      <div className="flex flex-wrap gap-2">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(idx)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              idx === currentIndex
                ? 'bg-blue-600 text-white'
                : answers[q.id]
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            {q.question_num}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500 dark:text-slate-400">
            第 {current.question_num} 题 ({current.points} 分)
          </span>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {answeredCount}/{questions.length} 已答
          </span>
        </div>

        {current.content && (
          <div className="text-gray-900 dark:text-slate-100 mb-6 whitespace-pre-wrap leading-relaxed">{current.content}</div>
        )}

        {isWritingOrTranslation ? (
          <div>
            <textarea
              value={answers[current.id] || ''}
              onChange={(e) => handleSelect(e.target.value)}
              className="w-full h-48 p-4 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none resize-none"
              placeholder="在此输入你的答案..."
            />
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
              字数: {(answers[current.id] || '').length}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {current.options.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx)
              const isSelected = answers[current.id] === letter
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(letter)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-950'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 disabled:opacity-30"
        >
          <ArrowLeft size={18} />
          上一题
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle size={18} />
            {submitting ? '提交中...' : '提交试卷'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            下一题
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
