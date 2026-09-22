import { apiClient } from './apiClient'
import type { UserRole } from '../types/auth'
import type { User } from '../types/user'

export type ListUsersParams = {
  role?: UserRole | 'all'
}

export function listUsers(params?: ListUsersParams): Promise<User[]> {
  const searchParams = new URLSearchParams()

  if (params?.role && params.role !== 'all') {
    searchParams.set('role', params.role)
  }

  const queryString = searchParams.toString()
  return apiClient.get<User[]>(`/api/users${queryString ? `?${queryString}` : ''}`)
}

export function getUser(id: string, options?: { silent?: boolean }): Promise<User> {
  return apiClient.get<User>(`/api/users/${id}`, options)
}

export type UpdateUserPayload = {
  phoneNumber?: string | null
  position?: string | null
  avatarUrl?: string | null
  isAvatarIcon?: boolean
}

export function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  return apiClient.put<User, UpdateUserPayload>(`/api/users/${id}`, payload)
}

export function deleteUser(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/users/${id}`)
}

export type CreateUserPayload = {
  name: string
  email: string
  role: UserRole
  password: string
  department?: string
  phoneNumber?: string
  position?: string
}

export function createUser(payload: CreateUserPayload): Promise<User> {
  return apiClient.post<User, CreateUserPayload>('/api/users', payload)
}
