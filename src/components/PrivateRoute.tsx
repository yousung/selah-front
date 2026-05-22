import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
