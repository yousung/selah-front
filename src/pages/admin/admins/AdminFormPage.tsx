import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'

export default function AdminFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({ email: '', name: '', phone: '', password: '', role: 'ADMIN' as 'ADMIN' | 'SUPER' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    adminApi.get(`/admin/thelc/users/${id}`).then(r => {
      const d = r.data
      setForm({ email: d.email ?? '', name: d.name ?? '', phone: d.phone ?? '', password: '', role: d.role === 'SUPER' ? 'SUPER' : 'ADMIN' })
      setFetching(false)
    })
  }, [id, isEdit])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isEdit) {
        await adminApi.patch(`/admin/thelc/admins/${id}`, {
          name: form.name || undefined,
          phone: form.phone || undefined,
          role: form.role,
        })
        qc.invalidateQueries({ queryKey: ['admin-admins'] })
        qc.invalidateQueries({ queryKey: ['admin-admin-detail', id] })
        navigate(`/admin/thelc/admins/${id}`)
      } else {
        await adminApi.post('/admin/thelc/admins', {
          email: form.email,
          name: form.name || undefined,
          phone: form.phone || undefined,
          password: form.password,
          role: form.role,
        })
        qc.invalidateQueries({ queryKey: ['admin-admins'] })
        navigate('/admin/thelc/admins')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || (isEdit ? '수정에 실패했습니다.' : '추가에 실패했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>불러오는 중...</div>

  return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #dee2e6' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#343a40' }}>관리자 {isEdit ? '수정' : '추가'}</h3>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isEdit && (
            <Field label="이메일 *">
              <input type="email" style={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="admin@example.com" required />
            </Field>
          )}
          <Field label="이름">
            <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="홍길동" />
          </Field>
          <Field label="전화번호">
            <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="010-0000-0000" />
          </Field>
          {!isEdit && (
            <Field label="비밀번호 *">
              <input type="password" style={inp} value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required minLength={6} />
            </Field>
          )}
          <Field label="역할">
            <select style={inp} value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER">SUPER</option>
            </select>
          </Field>
          {error && (
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8d7da', color: '#721c24', fontSize: '13px' }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
            <button type="button" onClick={() => navigate(isEdit ? `/admin/thelc/admins/${id}` : '/admin/thelc/admins')}
              style={{ border: '1px solid #dee2e6', borderRadius: '4px', padding: '7px 16px', fontSize: '13px', background: '#fff', cursor: 'pointer', color: '#495057' }}>
              취소
            </button>
            <button type="submit" disabled={loading}
              style={{ border: 'none', borderRadius: '4px', padding: '7px 20px', fontSize: '13px', background: '#007bff', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontWeight: 500 }}>
              {loading ? '저장 중...' : (isEdit ? '수정' : '추가')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { border: '1px solid #ced4da', borderRadius: '4px', padding: '7px 10px', fontSize: '14px', width: '100%', outline: 'none', boxSizing: 'border-box' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#495057', marginBottom: '5px' }}>{label}</label>
      {children}
    </div>
  )
}
