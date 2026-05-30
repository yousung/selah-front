import { Navigate } from 'react-router-dom'
import { useAdminAuthStore } from '@/store/adminAuthStore'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated())
  if (!isAuthenticated) return <Navigate to="/admin/thelc/login" replace />
  return <>{children}</>
}
