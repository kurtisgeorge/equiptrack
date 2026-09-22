import type { UserRole } from './auth'

export type User = {
  id: string
  name: string
  email: string
  role: UserRole
  department?: string | null
  phoneNumber?: string | null
  position?: string | null
  avatarUrl?: string | null
  isAvatarIcon?: boolean
}
