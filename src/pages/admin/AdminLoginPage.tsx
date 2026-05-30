import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAdminAuthStore } from '@/store/adminAuthStore'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://e41cinm9d8.execute-api.ap-northeast-2.amazonaws.com/prod'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const setAuth = useAdminAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setError(null)
    setLoading(true)
    try {
      const res = await axios.post(
        `${apiBaseUrl}/admin/thelc/auth/login`,
        { email: email.trim(), password },
        { withCredentials: true },
      )
      setAuth(res.data.accessToken, res.data.user)
      navigate('/admin/thelc')
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-1)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8 shadow-md" style={{ background: 'var(--surface-0)' }}>
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--primary-700)' }}>thelc 관리자</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-2)' }}>관리자 계정으로 로그인하세요</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>이메일</label>
            <input
              type="email"
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2"
              style={{ border: '1px solid var(--divider)', background: 'var(--surface-1)', color: 'var(--ink-0)' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>비밀번호</label>
            <input
              type="password"
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
              style={{ border: '1px solid var(--divider)', background: 'var(--surface-1)', color: 'var(--ink-0)' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-xs" style={{ color: '#B85450' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: 'var(--primary-700)', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
