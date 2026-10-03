import { useEffect, useState } from 'react'
import { useVocabStore } from '../store/vocabStore'
import WordCard from '../components/vocabulary/WordCard'
import ProgressBar from '../components/vocabulary/ProgressBar'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function VocabularyLearn() {
  const { newWords, currentLearnIndex, isFlipped, fetchNewWords, startLearning, nextLearn, setFlipped } =
    useVocabStore()
  const [known, setKnown] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNewWords().finally(() => setLoading(false))
  }, [fetchNewWords])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    )
  }

  if (newWords.length === 0) {
    return (
      <div className="text-center py-20">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">今日新词已全部学完！</h2>
        <p className="text-gray-500">去复习页面巩固已学词汇吧</p>
      </div>
    )
  }

  const current = newWords[currentLearnIndex]
  const isLast = currentLearnIndex === newWords.length - 1

  const handleKnow = () => {
    setKnown([...known, current.word_id])
    if (isLast) {
      startLearning([...known, current.word_id])
    } else {
      nextLearn()
    }
  }

  const handleDontKnow = () => {
    if (isLast) {
      startLearning(known)
    } else {
      nextLearn()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">学习新词</h1>
        <p className="text-gray-500">认识的词加入复习计划，不认识的词稍后再学</p>
      </div>

      <ProgressBar current={currentLearnIndex + 1} total={newWords.length} label="学习进度" />

      <WordCard word={current.word} isFlipped={isFlipped} onFlip={() => setFlipped(!isFlipped)} />

      <div className="flex justify-center gap-4">
        <button
          onClick={handleDontKnow}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
        >
          <XCircle size={20} />
          不认识
        </button>
        <button
          onClick={handleKnow}
          className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
        >
          <CheckCircle size={20} />
          认识
        </button>
      </div>
    </div>
  )
}
