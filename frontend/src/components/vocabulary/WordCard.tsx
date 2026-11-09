import { Volume2 } from 'lucide-react'
import type { VocabularyWord } from '../../types/vocabulary'
import { plainText } from '../../lib/text'

interface WordCardProps {
  word: VocabularyWord
  isFlipped: boolean
  onFlip: () => void
}

export default function WordCard({ word, isFlipped, onFlip }: WordCardProps) {
  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (word.audio_url) {
      new Audio(word.audio_url).play()
    }
  }

  return (
    <div className="flip-card w-full max-w-md mx-auto h-80 cursor-pointer" onClick={onFlip}>
      <div className={`flip-card-inner w-full h-full ${isFlipped ? 'flipped' : ''}`}>
        {/* Front */}
        <div className="flip-card-front bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{word.word}</h2>
            {word.audio_url && (
              <button onClick={playAudio} className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-400">
                <Volume2 size={24} />
              </button>
            )}
          </div>
          {word.phonetic && <p className="text-gray-500 dark:text-slate-400 text-lg mb-2">{word.phonetic}</p>}
          {word.part_of_speech && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">{word.part_of_speech}</span>
          )}
          <p className="text-gray-400 dark:text-slate-500 mt-6 text-sm">点击翻转查看释义</p>
        </div>

        {/* Back */}
        <div className="flip-card-back bg-blue-600 rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center text-white">
          <h3 className="text-2xl font-bold mb-4">{word.definition_cn}</h3>
          {word.definition_en && <p className="text-blue-100 mb-4 text-center">{word.definition_en}</p>}
          {word.example_en && (
            <div className="mt-4 text-left w-full">
              <p className="text-blue-100 italic text-sm">"{plainText(word.example_en)}"</p>
              {word.example_cn && <p className="text-blue-200 text-sm mt-1">{word.example_cn}</p>}
            </div>
          )}
          <p className="text-blue-200 mt-6 text-sm">点击翻回</p>
        </div>
      </div>
    </div>
  )
}
