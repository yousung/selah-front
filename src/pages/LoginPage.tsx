import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.access_token, data.user)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(typeof msg === 'string' ? msg : '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--surface-0)' }}
    >
      {/* Brand mark */}
      <div className="mb-12 text-center animate-fade-up">
        <div
          className="inline-flex items-center justify-center mb-4"
          style={{
            width: 72,
            height: 72,
            background: 'var(--primary-50)',
            borderRadius: 24,
            border: '1px solid var(--primary-100)',
          }}
        >
          <span className="text-3xl">🌿</span>
        </div>
        <h1 className="serif text-2xl font-medium" style={{ color: 'var(--ink-0)' }}>Selah</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>잠시 멈추어, 듣다</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-1)' }}>이메일</label>
          <input
            type="email"
            className="input-field"
            placeholder="이메일을 입력하세요"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-1)' }}>비밀번호</label>
          <input
            type="password"
            className="input-field"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: 'var(--error)' }}>{error}</p>
        )}

        <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              로그인 중...
            </span>
          ) : '로그인'}
        </button>
      </form>

      <p className="text-xs mt-8 text-center animate-fade-up" style={{ color: 'var(--ink-3)', animationDelay: '0.2s' }}>
        교회 관리자에게 계정을 문의하세요
      </p>
    </div>
  )
}
