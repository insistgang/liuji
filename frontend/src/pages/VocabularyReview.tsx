import { useEffect, useState } from 'react'
import { useVocabStore } from '../store/vocabStore'
import WordCard from '../components/vocabulary/WordCard'
import ProgressBar from '../components/vocabulary/ProgressBar'
import { CheckCircle, Loader2 } from 'lucide-react'

const qualityButtons = [
  { quality: 1, label: '忘记了', color: 'bg-red-500 hover:bg-red-600' },
  { quality: 3, label: '有点难', color: 'bg-orange-500 hover:bg-orange-600' },
  { quality: 4, label: '记得', color: 'bg-blue-500 hover:bg-blue-600' },
  { quality: 5, label: '很熟', color: 'bg-green-500 hover:bg-green-600' },
]

export default function VocabularyReview() {
  const { reviewWords, currentReviewIndex, isFlipped, fetchReviewWords, submitReview, setFlipped } =
    useVocabStore()
  const [reviewed, setReviewed] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReviewWords().finally(() => setLoading(false))
  }, [fetchReviewWords])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    )
  }

  if (reviewWords.length === 0) {
    return (
      <div className="text-center py-20">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {reviewed > 0 ? '今日复习已完成！' : '暂无待复习词汇'}
        </h2>
        <p className="text-gray-500">
          {reviewed > 0 ? `共复习了 ${reviewed} 个单词` : '去学习新词吧'}
        </p>
      </div>
    )
  }

  const current = reviewWords[currentReviewIndex]

  const handleQuality = async (quality: number) => {
    try {
      await submitReview(current.word_id, quality)
      setReviewed((r) => r + 1)
    } catch {
      // API failed, don't advance
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">词汇复习</h1>
        <p className="text-gray-500">根据记忆程度选择评分，系统会自动安排下次复习</p>
      </div>

      <ProgressBar current={currentReviewIndex + 1} total={reviewWords.length} label="复习进度" />

      <WordCard word={current.word} isFlipped={isFlipped} onFlip={() => setFlipped(!isFlipped)} />

      {isFlipped && (
        <div className="flex justify-center gap-3 flex-wrap">
          {qualityButtons.map(({ quality, label, color }) => (
            <button
              key={quality}
              onClick={() => handleQuality(quality)}
              className={`px-5 py-2.5 text-white rounded-lg font-medium transition-colors ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {!isFlipped && (
        <p className="text-center text-gray-400 text-sm">点击卡片翻转后选择记忆程度</p>
      )}
    </div>
  )
}
