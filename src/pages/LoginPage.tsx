import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/admin/thelc')
    } catch (err: any) {
      const statusCode = err.status || err.response?.status
      if (statusCode === 401) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else if (statusCode === 403) {
        setError('관리자 접근이 제한되어 있습니다.')
      } else if (statusCode === 500) {
        setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      } else if (!statusCode) {
        setError('네트워크 연결을 확인해주세요.')
      } else {
        setError('로그인 중 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5F5F5' }}>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="mb-8">
          <h1 className="text-lg font-bold" style={{ color: '#111827' }}>The LC</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>관리자 로그인</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>이메일</label>
            <input
              type="email"
              placeholder="이메일을 입력하세요"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>비밀번호</label>
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-xs py-2 px-3 rounded-lg" style={{ color: '#DC2626', background: '#FEF2F2' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-60"
            style={{ background: '#3D6B44' }}
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
