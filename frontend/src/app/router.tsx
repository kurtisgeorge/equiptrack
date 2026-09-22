import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './AppLayout'
import ProtectedRoute from './ProtectedRoute'
import { ImpersonationProvider, useImpersonation } from './ImpersonationContext'
import LoginPage from '../features/auth/LoginPage'
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage'
import AdminEquipmentPage from '../features/admin/pages/AdminEquipmentPage'
import AdminEquipmentDetailPage from '../features/admin/pages/AdminEquipmentDetailPage'
import AdminRentalsPage from '../features/admin/pages/AdminRentalsPage'
import AdminUsersPage from '../features/admin/pages/AdminUsersPage'
import AdminIssuesPage from '../features/admin/pages/AdminIssuesPage'
import FieldDashboardPage from '../features/field/pages/FieldDashboardPage'
import FieldEquipmentPage from '../features/field/pages/FieldEquipmentPage'
import FieldEquipmentDetailPage from '../features/field/pages/FieldEquipmentDetailPage'
import FieldRentalsPage from '../features/field/pages/FieldRentalsPage'
import FieldIssuesPage from '../features/field/pages/FieldIssuesPage'
import FieldRequestPage from '../features/field/pages/FieldRequestPage'
import MaintenanceDashboardPage from '../features/maintenance/pages/MaintenanceDashboardPage'
import MaintenanceEquipmentPage from '../features/maintenance/pages/MaintenanceEquipmentPage'
import MaintenanceEquipmentDetailPage from '../features/maintenance/pages/MaintenanceEquipmentDetailPage'
import MaintenanceAllEquipmentPage from '../features/maintenance/pages/MaintenanceAllEquipmentPage'
import MaintenanceIssuesPage from '../features/maintenance/pages/MaintenanceIssuesPage'
import MaintenanceReportPage from '../features/maintenance/pages/MaintenanceReportPage'
import UserProfilePage from '../features/user/pages/UserProfilePage'
import CalendarPage from '../features/calendar/CalendarPage'
import QRScannerPage from '../features/equipment/pages/QRScannerPage'
import NotFoundPage from './NotFoundPage'

function RootRedirect() {
  const { effectiveRole } = useImpersonation()

  if (effectiveRole === 'admin') return <Navigate replace to="/admin/dashboard" />
  if (effectiveRole === 'field') return <Navigate replace to="/field/dashboard" />
  if (effectiveRole === 'maintenance') return <Navigate replace to="/maintenance/dashboard" />

  return <Navigate replace to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<RootRedirect />} index />
          <Route element={<UserProfilePage />} path="/profile/:id?" />
          <Route element={<CalendarPage />} path="/calendar" />
          <Route element={<QRScannerPage />} path="/scan" />
          <Route element={<FieldRequestPage />} path="/request" />
          <Route element={<MaintenanceReportPage />} path="/report" />

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminDashboardPage />} path="/admin/dashboard" />
            <Route element={<AdminEquipmentPage />} path="/admin/equipment" />
            <Route element={<AdminEquipmentDetailPage />} path="/admin/equipment/:id" />
            <Route element={<AdminRentalsPage />} path="/admin/rentals" />
            <Route element={<AdminUsersPage />} path="/admin/users" />
            <Route element={<AdminIssuesPage />} path="/admin/issues" />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['field']} />}>
            <Route element={<FieldDashboardPage />} path="/field/dashboard" />
            <Route element={<FieldEquipmentPage />} path="/field/equipment" />
            <Route element={<FieldEquipmentDetailPage />} path="/field/equipment/:id" />
            <Route element={<FieldRentalsPage />} path="/field/rentals" />
            <Route element={<FieldIssuesPage />} path="/field/reports" />
            <Route element={<FieldRequestPage />} path="/field/request" />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['maintenance']} />}>
            <Route element={<MaintenanceDashboardPage />} path="/maintenance/dashboard" />
            <Route element={<MaintenanceEquipmentPage />} path="/maintenance/queue" />
            <Route element={<MaintenanceAllEquipmentPage />} path="/maintenance/equipment" />
            <Route element={<MaintenanceEquipmentDetailPage />} path="/maintenance/equipment/:id" />
            <Route element={<MaintenanceIssuesPage />} path="/maintenance/issues" />
            <Route element={<MaintenanceReportPage />} path="/maintenance/report" />
          </Route>
        </Route>
      </Route>

      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  )
}

export default function AppRouter() {
  return (
    <ImpersonationProvider>
      <AppRoutes />
    </ImpersonationProvider>
  )
}
