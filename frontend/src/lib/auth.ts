import type { Session, UserRole } from '../types/auth'

const SESSION_KEY = 'equptrack_session'

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as { token?: string; user?: { id?: string; name?: string; email?: string; role?: string } }
    if (parsed?.user?.role === 'foreman') {
      parsed.user.role = 'field'
      localStorage.setItem(SESSION_KEY, JSON.stringify(parsed))
    }

    return parsed as Session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getSession()?.token)
}

export function getCurrentRole(): UserRole | null {
  return getSession()?.user.role ?? null
}
