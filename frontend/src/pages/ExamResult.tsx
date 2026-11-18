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
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    )
  }

  if (!result) {
    return <div className="app-card rounded-2xl py-16 text-center text-sm text-[var(--text-muted)]">结果未找到</div>
  }

  const percent = result.total_score > 0 ? Math.round((result.score / result.total_score) * 100) : 0
  const correctCount = result.questions.filter((q) => q.is_correct).length
  const minutes = Math.floor(result.time_spent / 60)
  const seconds = result.time_spent % 60

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

      <div className="app-card rounded-3xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
          <Trophy size={32} />
        </div>
        <h1 className="headword-font text-2xl font-bold text-[var(--text-primary)]">{result.paper_title}</h1>

        <div className="mt-5">
          <div className="text-5xl font-bold text-[var(--accent-text)]">{result.score}</div>
          <div className="mt-1 text-sm text-[var(--text-muted)]">
            / {result.total_score} 分（得分率 {percent}%）
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-6 text-xs font-medium text-[var(--text-secondary)]">
          <div className="inline-flex items-center gap-1.5">
            <CheckCircle size={15} className="text-emerald-500" />
            答对 {correctCount}/{result.questions.length} 题
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Clock size={15} />
            用时 {minutes}分{seconds}秒
          </div>
        </div>
      </div>

      {Object.keys(result.section_scores).length > 0 && (
        <div className="app-card rounded-2xl p-6">
          <h2 className="mb-4 text-base font-bold text-[var(--text-primary)]">各板块得分</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(result.section_scores).map(([section, score]) => (
              <div key={section} className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-4 text-center">
                <div className="text-2xl font-bold text-[var(--accent-text)]">{score}</div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{section}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="app-card rounded-2xl p-6">
        <h2 className="mb-4 text-base font-bold text-[var(--text-primary)]">逐题解析</h2>
        <div className="space-y-3.5">
          {result.questions.map((q) => (
            <div
              key={q.question_id}
              className={`rounded-2xl border p-4 ${
                q.is_correct
                  ? 'border-emerald-500/30 bg-emerald-500/8'
                  : 'border-rose-500/30 bg-rose-500/8'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    第 {q.question_num} 题（{q.points} 分）
                  </span>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--text-primary)]">{q.content}</p>
                </div>
                {q.is_correct ? (
                  <CheckCircle size={19} className="shrink-0 text-emerald-500" />
                ) : (
                  <XCircle size={19} className="shrink-0 text-rose-500" />
                )}
              </div>
              {!q.is_correct && (
                <div className="mt-2 flex flex-wrap gap-4 text-xs font-medium">
                  <span className="text-rose-600 dark:text-rose-400">你的答案：{q.user_answer || '未作答'}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">正确答案：{q.correct_answer}</span>
                </div>
              )}
              {q.explanation && (
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">解析：{q.explanation}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => navigate('/exams')}
          className="app-accent-solid rounded-2xl px-6 py-3 text-sm font-semibold"
        >
          返回真题列表
        </button>
      </div>
    </div>
  )
}
