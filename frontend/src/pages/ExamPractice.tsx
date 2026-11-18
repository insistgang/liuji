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
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    )
  }

  if (questions.length === 0) {
    return <div className="app-card rounded-2xl py-16 text-center text-sm text-[var(--text-muted)]">暂无题目</div>
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
          type="button"
          onClick={() => navigate(`/exams/${id}`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={18} />
          返回板块
        </button>
        <Timer startTime={startTime} />
      </div>

      <div className="flex flex-wrap gap-2">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={`h-9 w-9 rounded-xl text-xs font-semibold transition-all ${
              idx === currentIndex
                ? 'app-accent-solid shadow-xs'
                : answers[q.id]
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'app-muted-pill'
            }`}
          >
            {q.question_num}
          </button>
        ))}
      </div>

      <div className="app-card rounded-3xl p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
          <span>
            第 {current.question_num} 题（{current.points} 分）
          </span>
          <span>
            已答 {answeredCount}/{questions.length}
          </span>
        </div>

        {current.content && (
          <div className="mb-6 whitespace-pre-wrap text-sm leading-7 text-[var(--text-primary)]">
            {current.content}
          </div>
        )}

        {isWritingOrTranslation ? (
          <div>
            <textarea
              value={answers[current.id] || ''}
              onChange={(e) => handleSelect(e.target.value)}
              className="app-input h-52 w-full resize-none rounded-2xl p-4 text-sm leading-6"
              placeholder="在此输入你的作答内容..."
            />
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              当前字符数：{(answers[current.id] || '').length}
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
                  type="button"
                  onClick={() => handleSelect(letter)}
                  className={`w-full rounded-2xl border p-4 text-left text-sm transition-all ${
                    isSelected
                      ? 'app-accent-soft border-[var(--accent)] font-semibold'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
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
          type="button"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="app-muted-pill inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-35"
        >
          <ArrowLeft size={16} />
          上一题
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="app-accent-solid inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm disabled:opacity-50"
          >
            <CheckCircle size={17} />
            {submitting ? '提交中...' : '提交试卷'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="app-accent-soft inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold"
          >
            下一题
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
