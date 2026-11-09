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
        <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={32} />
      </div>
    )
  }

  if (!detail) {
    return <div className="text-center py-20 text-gray-500 dark:text-slate-400">材料未找到</div>
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

  const correctCount = exercises.filter(
    (e) => answers[e.id] === e.correct_answer
  ).length

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/listening')}
        className="flex items-center gap-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100"
      >
        <ArrowLeft size={20} />
        返回列表
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">{material.title}</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm">
          {material.source && `来源: ${material.source}`}
          {material.duration > 0 && ` | 时长: ${Math.floor(material.duration / 60)}:${(material.duration % 60).toString().padStart(2, '0')}`}
        </p>
      </div>

      {/* Audio player */}
      {material.audio_url ? (
        <AudioPlayer audioUrl={material.audio_url} />
      ) : (
        <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-4 text-orange-700 dark:text-orange-300 text-sm">
          音频文件暂未配置，请先阅读文稿进行练习
        </div>
      )}

      {/* Transcript toggle */}
      {material.transcript && (
        <div>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 text-sm"
          >
            {showTranscript ? <EyeOff size={16} /> : <Eye size={16} />}
            {showTranscript ? '隐藏文稿' : '显示文稿'}
          </button>
          {showTranscript && (
            <div className="mt-3 bg-gray-50 dark:bg-slate-950 rounded-xl p-4 text-gray-700 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {material.transcript}
            </div>
          )}
        </div>
      )}

      {/* Exercises */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">练习题目</h2>

        {exercises.map((exercise, idx) => (
          <div key={exercise.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5">
            <p className="font-medium text-gray-900 dark:text-slate-100 mb-3">
              {idx + 1}. {exercise.question_text}
            </p>
            <div className="space-y-2">
              {exercise.options.map((option) => {
                const letter = option.charAt(0)
                const isSelected = answers[exercise.id] === letter
                const isCorrect = letter === exercise.correct_answer

                let style = 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-950'
                if (showResults) {
                  if (isCorrect) style = 'bg-green-50 dark:bg-green-950 border-green-500 text-green-700 dark:text-green-300'
                  else if (isSelected) style = 'bg-red-50 dark:bg-red-950 border-red-500 text-red-700 dark:text-red-300'
                  else style = 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-700 opacity-50'
                } else if (isSelected) {
                  style = 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300'
                }

                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(exercise.id, option)}
                    className={`w-full p-3 rounded-lg border-2 text-left text-sm transition-colors ${style}`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {showResults && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm">
                  {answers[exercise.id] === exercise.correct_answer ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle size={16} /> 正确
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                      <XCircle size={16} /> 错误 (正确答案: {exercise.correct_answer})
                    </span>
                  )}
                </div>
                {exercise.explanation && (
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-2">解析: {exercise.explanation}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit / Results */}
      <div className="text-center">
        {!showResults ? (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length === 0}
            className="px-8 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            提交答案
          </button>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 inline-block">
            <CheckCircle className="mx-auto text-green-500 dark:text-green-400 mb-2" size={32} />
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              答对 {correctCount}/{exercises.length} 题
            </p>
            <p className="text-gray-500 dark:text-slate-400 mt-1">
              正确率: {exercises.length > 0 ? Math.round((correctCount / exercises.length) * 100) : 0}%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
