import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../lib/auth'
import { useImpersonation } from './ImpersonationContext'
import type { UserRole } from '../types/auth'

type ProtectedRouteProps = {
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation()
  const { effectiveRole } = useImpersonation()

  if (!isAuthenticated()) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (allowedRoles?.length) {
    // Admin always bypasses role restrictions
    if (!effectiveRole || (effectiveRole !== 'admin' && !allowedRoles.includes(effectiveRole as UserRole))) {
      return <Navigate replace to="/" />
    }
  }

  return <Outlet />
}
