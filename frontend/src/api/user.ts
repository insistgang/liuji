import client from './client'
import type { ApiResponse } from '../types/api'

export interface UserStats {
  vocab_learned: number
  vocab_mastered: number
  exams_completed: number
  writings_submitted: number
}

export const userApi = {
  getStats: () => client.get<ApiResponse<UserStats>>('/user/stats'),
}
