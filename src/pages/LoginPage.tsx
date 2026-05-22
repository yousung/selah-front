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
      navigate('/admin')
    } catch (err: any) {
      const statusCode = err.status || err.response?.status
      if (statusCode === 401) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else if (statusCode === 403) {
        setError('이 계정은 관리자 접근이 제한되어 있습니다.')
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--surface-0)' }}>
      <div className="card w-full max-w-md p-8">
        <h1 className="text-heading mb-8" style={{ color: 'var(--ink-0)' }}>
          관리자 로그인
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="email"
              placeholder="이메일"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="비밀번호"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--error)', color: 'var(--white)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
