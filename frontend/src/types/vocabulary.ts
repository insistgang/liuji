export interface VocabularyWord {
  id: number
  word: string
  phonetic: string
  part_of_speech: string
  definition_cn: string
  definition_en: string
  example_en: string
  example_cn: string
  frequency: number
  tags: string
  audio_url: string | null
}

export interface WordProgress {
  id: number
  word_id: number
  word: VocabularyWord
  status: 'new' | 'learning' | 'review' | 'mastered'
  ease_factor: number
  interval: number
  repetitions: number
  next_review: string
  last_review: string | null
  correct_count: number
  wrong_count: number
}

export interface ReviewSubmit {
  word_id: number
  quality: number // 0-5
}

export interface QuizQuestion {
  word: VocabularyWord
  options: string[]
  question_type: 'meaning' | 'word'
}

export interface VocabProgressStats {
  total_words: number
  new_words: number
  learning_words: number
  review_words: number
  mastered_words: number
  due_today: number
}
