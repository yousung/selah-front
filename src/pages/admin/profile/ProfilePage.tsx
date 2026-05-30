import { useState, FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import { useAdminAuthStore } from '@/store/adminAuthStore'

export default function ProfilePage() {
  const { user, setAuth } = useAdminAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState('')
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const infoMutation = useMutation({
    mutationFn: () => adminApi.patch(`/admin/thelc/admins/${user?.id}`, { name: name || undefined, phone: phone || undefined }),
    onSuccess: (r) => {
      setInfoMsg('저장되었습니다.')
      if (user) setAuth(useAdminAuthStore.getState().accessToken!, { ...user, name: r.data.name })
    },
    onError: () => setInfoMsg('저장에 실패했습니다.'),
  })

  const pwMutation = useMutation({
    mutationFn: () => adminApi.patch(`/admin/thelc/admins/${user?.id}/password`, { currentPassword: curPw, newPassword: newPw }),
    onSuccess: () => {
      setPwMsg({ type: 'ok', text: '비밀번호가 변경되었습니다.' })
      setCurPw(''); setNewPw(''); setConfirmPw('')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setPwMsg({ type: 'err', text: e.response?.data?.message || '비밀번호 변경에 실패했습니다.' })
    },
  })

  const handleInfoSubmit = (e: FormEvent) => {
    e.preventDefault()
    setInfoMsg(null)
    infoMutation.mutate()
  }

  const handlePwSubmit = (e: FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (newPw !== confirmPw) { setPwMsg({ type: 'err', text: '새 비밀번호가 일치하지 않습니다.' }); return }
    if (newPw.length < 6) { setPwMsg({ type: 'err', text: '새 비밀번호는 6자 이상이어야 합니다.' }); return }
    pwMutation.mutate()
  }

  return (
    <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 내 정보 */}
      <div style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #dee2e6' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#343a40' }}>내 정보</h3>
        </div>
        <form onSubmit={handleInfoSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>이메일</label>
            <input style={{ ...inp, background: '#f8f9fa', color: '#6c757d' }} value={user?.email || ''} disabled />
          </div>
          <div>
            <label style={lbl}>역할</label>
            <input style={{ ...inp, background: '#f8f9fa', color: '#6c757d' }} value={user?.role || ''} disabled />
          </div>
          <div>
            <label style={lbl}>이름</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="이름 입력" />
          </div>
          <div>
            <label style={lbl}>전화번호</label>
            <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" />
          </div>
          {infoMsg && <div style={{ fontSize: '13px', color: infoMutation.isError ? '#721c24' : '#155724' }}>{infoMsg}</div>}
          <button type="submit" disabled={infoMutation.isPending}
            style={{ border: 'none', borderRadius: '4px', padding: '8px 20px', fontSize: '13px', background: '#007bff', color: '#fff', cursor: 'pointer', fontWeight: 500, opacity: infoMutation.isPending ? 0.7 : 1, alignSelf: 'flex-start' }}>
            {infoMutation.isPending ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>

      {/* 비밀번호 변경 */}
      <div style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #dee2e6' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#343a40' }}>비밀번호 변경</h3>
        </div>
        <form onSubmit={handlePwSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>현재 비밀번호</label>
            <input type="password" style={inp} value={curPw} onChange={e => setCurPw(e.target.value)} required />
          </div>
          <div>
            <label style={lbl}>새 비밀번호</label>
            <input type="password" style={inp} value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={6} />
          </div>
          <div>
            <label style={lbl}>새 비밀번호 확인</label>
            <input type="password" style={inp} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
          </div>
          {pwMsg && (
            <div style={{ padding: '8px 12px', borderRadius: '4px', fontSize: '13px', background: pwMsg.type === 'ok' ? '#d4edda' : '#f8d7da', color: pwMsg.type === 'ok' ? '#155724' : '#721c24' }}>
              {pwMsg.text}
            </div>
          )}
          <button type="submit" disabled={pwMutation.isPending}
            style={{ border: 'none', borderRadius: '4px', padding: '8px 20px', fontSize: '13px', background: '#28a745', color: '#fff', cursor: 'pointer', fontWeight: 500, opacity: pwMutation.isPending ? 0.7 : 1, alignSelf: 'flex-start' }}>
            {pwMutation.isPending ? '변경 중...' : '변경'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { border: '1px solid #ced4da', borderRadius: '4px', padding: '7px 10px', fontSize: '14px', width: '100%', outline: 'none', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 500, color: '#495057', marginBottom: '5px' }
