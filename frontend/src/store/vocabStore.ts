import { create } from 'zustand'
import { vocabApi } from '../api/vocabulary'
import type { WordProgress, VocabProgressStats } from '../types/vocabulary'

interface VocabState {
  newWords: WordProgress[]
  reviewWords: WordProgress[]
  progress: VocabProgressStats | null
  currentLearnIndex: number
  currentReviewIndex: number
  isFlipped: boolean

  fetchNewWords: (count?: number) => Promise<void>
  fetchReviewWords: () => Promise<void>
  fetchProgress: () => Promise<void>
  startLearning: (wordIds: number[]) => Promise<void>
  submitReview: (wordId: number, quality: number) => Promise<void>
  setFlipped: (flipped: boolean) => void
  nextLearn: () => void
  nextReview: () => void
  reset: () => void
}

export const useVocabStore = create<VocabState>((set, get) => ({
  newWords: [],
  reviewWords: [],
  progress: null,
  currentLearnIndex: 0,
  currentReviewIndex: 0,
  isFlipped: false,

  fetchNewWords: async (count) => {
    const { data } = await vocabApi.getNewWords(count)
    set({ newWords: data.data || [], currentLearnIndex: 0, isFlipped: false })
  },

  fetchReviewWords: async () => {
    const { data } = await vocabApi.getReviewWords()
    set({ reviewWords: data.data || [], currentReviewIndex: 0, isFlipped: false })
  },

  fetchProgress: async () => {
    const { data } = await vocabApi.getProgress()
    set({ progress: data.data })
  },

  startLearning: async (wordIds) => {
    await vocabApi.startLearning(wordIds)
    // Remove started words from newWords
    const { newWords } = get()
    set({ newWords: newWords.filter((w) => !wordIds.includes(w.word_id)) })
  },

  submitReview: async (wordId, quality) => {
    await vocabApi.submitReview(wordId, quality)
    const { reviewWords, currentReviewIndex } = get()
    if (currentReviewIndex < reviewWords.length - 1) {
      set({ currentReviewIndex: currentReviewIndex + 1, isFlipped: false })
    } else {
      // Review session complete
      set({ reviewWords: [] })
    }
  },

  setFlipped: (flipped) => set({ isFlipped: flipped }),

  nextLearn: () => {
    const { currentLearnIndex, newWords } = get()
    if (currentLearnIndex < newWords.length - 1) {
      set({ currentLearnIndex: currentLearnIndex + 1, isFlipped: false })
    }
  },

  nextReview: () => {
    const { currentReviewIndex, reviewWords } = get()
    if (currentReviewIndex < reviewWords.length - 1) {
      set({ currentReviewIndex: currentReviewIndex + 1, isFlipped: false })
    }
  },

  reset: () =>
    set({
      newWords: [],
      reviewWords: [],
      currentLearnIndex: 0,
      currentReviewIndex: 0,
      isFlipped: false,
    }),
}))
