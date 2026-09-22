import { apiClient } from './apiClient'
import type { Session } from '../types/auth'

export function loginWithCredentials(email: string, password: string): Promise<Session> {
  return apiClient.post<Session, { email: string; password: string }>('/api/auth/login', {
    email,
    password,
  })
}
