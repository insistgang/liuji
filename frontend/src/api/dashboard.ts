import client from './client'
import { isStaticMode } from './runtime'
import { offlineApi } from './offline'
import type { ApiResponse } from '../types/api'

export interface DailyPlan {
  date: string
  daily_new_target: number
  new_words_learned_today: number
  new_words_remaining: number
  due_reviews: number
  reviews_done_today: number
  total_learned: number
  mastered: number
  streak_days: number
  completed: boolean
}

export const dashboardApi = {
  getDailyPlan: () => {
    if (isStaticMode) return offlineApi.getDailyPlan()
    return client.get<ApiResponse<DailyPlan>>('/dashboard/daily-plan')
  },
}
