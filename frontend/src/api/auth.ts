import client from './client'
import type { ApiResponse } from '../types/api'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserInfo {
  id: string
  username: string
  email: string
  avatar_url: string | null
  created_at: string
}

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<ApiResponse<TokenResponse>>('/auth/login', data),

  register: (data: RegisterRequest) =>
    client.post<ApiResponse<UserInfo>>('/auth/register', data),

  refresh: (refresh_token: string) =>
    client.post<ApiResponse<TokenResponse>>('/auth/refresh', { refresh_token }),

  me: () => client.get<ApiResponse<UserInfo>>('/auth/me'),
}
