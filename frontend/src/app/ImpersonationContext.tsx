import { createContext, useContext, useState, useCallback } from 'react'
import { getSession } from '../lib/auth'
import type { Session } from '../types/auth'
import type { User } from '../types/user'

export type ImpersonationState = {
  active: boolean
  user: User | null
}

type ImpersonationContextValue = {
  impersonation: ImpersonationState
  effectiveRole: string | null
  effectiveSession: Session | null
  startImpersonation: (user: User) => void
  stopImpersonation: () => void
  notifySessionChanged: () => void
}

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null)

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => getSession())
  const [impersonation, setImpersonation] = useState<ImpersonationState>({ active: false, user: null })

  const notifySessionChanged = useCallback(() => {
    setSessionState(getSession())
    setImpersonation({ active: false, user: null })
  }, [])

  const startImpersonation = useCallback((user: User) => {
    setImpersonation({ active: true, user })
  }, [])

  const stopImpersonation = useCallback(() => {
    setImpersonation({ active: false, user: null })
  }, [])

  const realRole = session?.user?.role ?? null
  const effectiveRole = impersonation.active && impersonation.user ? impersonation.user.role : realRole

  const effectiveSession: Session | null = impersonation.active && impersonation.user && session
    ? { token: session.token, user: { id: impersonation.user.id, name: impersonation.user.name, email: impersonation.user.email, role: impersonation.user.role as any } }
    : session

  return (
    <ImpersonationContext.Provider value={{ impersonation, effectiveRole, effectiveSession, startImpersonation, stopImpersonation, notifySessionChanged }}>
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext)
  if (!ctx) throw new Error('useImpersonation must be used within ImpersonationProvider')
  return ctx
}
