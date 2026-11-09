import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { vocabApi } from '../api/vocabulary'
import { Loader2, Trophy } from 'lucide-react'

interface QuizQuestion {
  word_id: number
  word: string
  phonetic: string | null
  part_of_speech: string | null
  question_type: string
  prompt: string
  options: string[]
  correct_answer: string
}

export default function VocabularyTest() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    vocabApi
      .startQuiz(10)
      .then(({ data }) => {
        setQuestions(data.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={32} />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-slate-400 mb-4">词汇量不足，无法开始测验</p>
        <button onClick={() => navigate('/vocabulary/learn')} className="text-blue-600 dark:text-blue-400 hover:underline">
          先去学习新词
        </button>
      </div>
    )
  }

  if (finished) {
    const percent = Math.round((correctCount / questions.length) * 100)
    return (
      <div className="text-center py-20">
        <Trophy className="mx-auto text-yellow-500 dark:text-yellow-400 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">测验完成！</h2>
        <p className="text-lg text-gray-600 dark:text-slate-300 mb-4">
          答对 {correctCount}/{questions.length} 题 ({percent}%)
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            再来一次
          </button>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const current = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1

  const handleSelect = (option: string) => {
    if (isAnswered) return
    setSelected(option)
    setIsAnswered(true)
    if (option === current.correct_answer) {
      setCorrectCount(correctCount + 1)
    }
  }

  const handleNext = () => {
    if (isLast) {
      setFinished(true)
    } else {
      setCurrentIndex(currentIndex + 1)
      setSelected(null)
      setIsAnswered(false)
    }
  }

  const getOptionStyle = (option: string) => {
    if (!isAnswered) return 'bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950 border-gray-200 dark:border-slate-700'
    if (option === current.correct_answer) return 'bg-green-50 dark:bg-green-950 border-green-500 text-green-700 dark:text-green-300'
    if (option === selected) return 'bg-red-50 dark:bg-red-950 border-red-500 text-red-700 dark:text-red-300'
    return 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-700 opacity-50'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">词汇测验</h1>
        <p className="text-gray-500 dark:text-slate-400">选择正确的释义</p>
      </div>

      <div className="flex justify-between text-sm text-gray-600 dark:text-slate-300">
        <span>第 {currentIndex + 1}/{questions.length} 题</span>
        <span>答对: {correctCount}</span>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          {current.question_type === 'meaning' ? (
            <>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">{current.prompt}</h2>
              {current.phonetic && <p className="text-gray-500 dark:text-slate-400">{current.phonetic}</p>}
              {current.part_of_speech && (
                <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm mt-2">
                  {current.part_of_speech}
                </span>
              )}
              <p className="text-gray-400 dark:text-slate-500 mt-4">选择正确的中文释义</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">{current.prompt}</h2>
              <p className="text-gray-400 dark:text-slate-500 mt-2">选择对应的英文单词</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {current.options.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${getOptionStyle(option)}`}
              disabled={isAnswered}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {isAnswered && (
        <div className="text-center">
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            {isLast ? '查看结果' : '下一题'}
          </button>
        </div>
      )}
    </div>
  )
}
