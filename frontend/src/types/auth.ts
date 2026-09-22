export type UserRole = 'admin' | 'field' | 'maintenance'

export type AuthUser = {
  id: string
  name: string
  role: UserRole
  email: string
  avatarUrl?: string
  isAvatarIcon?: boolean
}

export type Session = {
  token: string
  user: AuthUser
}
