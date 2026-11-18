import type { VocabularyWord } from '../../types/vocabulary'
import { plainText } from '../../lib/text'
import SpeakButton from './SpeakButton'

interface WordCardProps {
  word: VocabularyWord
  isFlipped: boolean
  onFlip: () => void
}

export default function WordCard({ word, isFlipped, onFlip }: WordCardProps) {
  const cleanExample = word.example_en ? plainText(word.example_en) : ''

  return (
    <div className="flip-card mx-auto h-80 w-full max-w-md cursor-pointer" onClick={onFlip}>
      <div className={`flip-card-inner h-full w-full ${isFlipped ? 'flipped' : ''}`}>
        {/* Front */}
        <div className="flip-card-front app-card flex flex-col items-center justify-center rounded-3xl p-8">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="headword-font text-3xl font-bold text-[var(--text-primary)]">{word.word}</h2>
            <SpeakButton
              text={word.word}
              audioUrl={word.audio_url}
              targetKey={`flip:${word.id}`}
              showAccentLabel
            />
          </div>
          {word.phonetic && (
            <p className="phonetic-font mb-3 text-base text-[var(--text-muted)]">{word.phonetic}</p>
          )}
          {word.part_of_speech && (
            <span className="app-accent-soft rounded-full border px-3 py-1 text-xs font-semibold">
              {word.part_of_speech}
            </span>
          )}
          <p className="mt-6 text-xs text-[var(--text-muted)]">点击卡片翻转查看释义与例句</p>
        </div>

        {/* Back */}
        <div className="flip-card-back app-hero flex flex-col items-center justify-center rounded-3xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-3 text-center">{word.definition_cn}</h3>
          {word.definition_en && (
            <p className="mb-4 text-center text-sm text-white/80">{word.definition_en}</p>
          )}
          {cleanExample && (
            <div className="mt-2 w-full rounded-2xl bg-white/10 p-3.5 text-left backdrop-blur-xs">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm italic text-white/95">"{cleanExample}"</p>
                <SpeakButton
                  text={cleanExample}
                  targetKey={`flip-ex:${word.id}`}
                  variant="sentence"
                  className="border-white/25 bg-white/15 text-white hover:bg-white/25"
                />
              </div>
              {word.example_cn && <p className="mt-1.5 text-xs text-white/75">{word.example_cn}</p>}
            </div>
          )}
          <p className="mt-5 text-xs text-white/65">点击翻回正面</p>
        </div>
      </div>
    </div>
  )
}
