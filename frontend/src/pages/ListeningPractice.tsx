import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listeningApi, type ListeningDetail } from '../api/listening'
import AudioPlayer from '../components/listening/AudioPlayer'
import { ArrowLeft, CheckCircle, XCircle, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function ListeningPractice() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ListeningDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTranscript, setShowTranscript] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (!id) return
    listeningApi
      .getDetail(Number(id))
      .then(({ data }) => setDetail(data.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    )
  }

  if (!detail) {
    return <div className="app-card rounded-2xl py-16 text-center text-sm text-[var(--text-muted)]">材料未找到</div>
  }

  const { material, exercises } = detail

  const handleSelect = (exerciseId: number, option: string) => {
    if (showResults) return
    const letter = option.charAt(0)
    setAnswers({ ...answers, [exerciseId]: letter })
  }

  const handleSubmit = () => {
    setShowResults(true)
  }

  const correctCount = exercises.filter((e) => answers[e.id] === e.correct_answer).length

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/listening')}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={18} />
        返回列表
      </button>

      <div className="app-hero rounded-3xl p-6 md:p-8">
        <h1 className="headword-font text-2xl font-bold">{material.title}</h1>
        <p className="mt-2 text-xs text-white/80">
          {material.source && `来源：${material.source}`}
          {material.duration > 0 &&
            ` · 时长：${Math.floor(material.duration / 60)}:${(material.duration % 60).toString().padStart(2, '0')}`}
        </p>
      </div>

      {material.audio_url ? (
        <AudioPlayer audioUrl={material.audio_url} />
      ) : (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
          音频文件暂未配置，可先展开听力原文进行阅读与题目训练
        </div>
      )}

      {material.transcript && (
        <div>
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="app-muted-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
          >
            {showTranscript ? <EyeOff size={15} /> : <Eye size={15} />}
            {showTranscript ? '隐藏听力文稿' : '展开听力文稿'}
          </button>
          {showTranscript && (
            <div className="app-card mt-3 whitespace-pre-wrap rounded-2xl p-5 text-sm leading-7 text-[var(--text-secondary)]">
              {material.transcript}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-base font-bold text-[var(--text-primary)]">配套练习题</h2>

        {exercises.map((exercise, idx) => (
          <div key={exercise.id} className="app-card rounded-2xl p-5 sm:p-6">
            <p className="mb-3.5 font-semibold text-[var(--text-primary)]">
              {idx + 1}. {exercise.question_text}
            </p>
            <div className="space-y-2.5">
              {exercise.options.map((option) => {
                const letter = option.charAt(0)
                const isSelected = answers[exercise.id] === letter
                const isCorrect = letter === exercise.correct_answer

                let style =
                  'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                if (showResults) {
                  if (isCorrect)
                    style = 'border-emerald-500 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 font-semibold'
                  else if (isSelected)
                    style = 'border-rose-500 bg-rose-500/12 text-rose-800 dark:text-rose-200'
                  else style = 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] opacity-50'
                } else if (isSelected) {
                  style = 'app-accent-soft border-[var(--accent)] font-semibold'
                }

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(exercise.id, option)}
                    className={`w-full rounded-xl border p-3.5 text-left text-sm transition-all ${style}`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {showResults && (
              <div className="mt-3.5 border-t border-[var(--border-subtle)] pt-3">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {answers[exercise.id] === exercise.correct_answer ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle size={15} /> 回答正确
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                      <XCircle size={15} /> 回答错误（正确答案：{exercise.correct_answer}）
                    </span>
                  )}
                </div>
                {exercise.explanation && (
                  <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">解析：{exercise.explanation}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        {!showResults ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={Object.keys(answers).length === 0}
            className="app-accent-solid rounded-2xl px-8 py-3.5 text-sm font-semibold shadow-sm disabled:opacity-50"
          >
            提交答案并核对
          </button>
        ) : (
          <div className="app-card inline-block rounded-2xl px-8 py-6">
            <CheckCircle className="mx-auto mb-2 text-emerald-500" size={30} />
            <p className="text-lg font-bold text-[var(--text-primary)]">
              答对 {correctCount}/{exercises.length} 题
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              正确率：{exercises.length > 0 ? Math.round((correctCount / exercises.length) * 100) : 0}%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
