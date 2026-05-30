import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

interface Admin { id: string; email: string; name: string | null; phone: string | null; role: string; createdAt: string }

export default function AdminDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const currentUser = useAdminAuthStore((s) => s.user)
  const isSuper = currentUser?.role === 'SUPER'
  const isMe = id === currentUser?.id
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-admin-detail', id],
    queryFn: () => adminApi.get<Admin>(`/admin/thelc/users/${id}`).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.delete(`/admin/thelc/admins/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-admins'] })
      navigate('/admin/thelc/admins')
    },
    onError: () => {
      setConfirmOpen(false)
      setDeleteError('삭제에 실패했습니다.')
    },
  })

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>불러오는 중...</div>
  if (!data) return <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>찾을 수 없습니다.</div>

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,.1)', marginBottom: '16px' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #dee2e6' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#343a40' }}>관리자 상세</h3>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Row label="이름" value={data.name || '-'} />
          <Row label="이메일" value={data.email} />
          <Row label="전화번호" value={data.phone || '-'} />
          <Row label="역할" value={data.role} />
          <Row label="가입일" value={new Date(data.createdAt).toLocaleString('ko-KR')} />
        </div>
      </div>

      {deleteError && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', borderRadius: '4px', background: '#f8d7da', color: '#721c24', fontSize: '13px' }}>
          {deleteError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/admin/thelc/admins')}
          style={{ border: '1px solid #dee2e6', borderRadius: '4px', padding: '7px 16px', fontSize: '13px', background: '#fff', cursor: 'pointer', color: '#495057' }}>
          목록으로
        </button>
        {isSuper && (
          <button onClick={() => navigate(`/admin/thelc/admins/${id}/edit`)}
            style={{ border: '1px solid #007bff', borderRadius: '4px', padding: '7px 16px', fontSize: '13px', background: '#007bff', color: '#fff', cursor: 'pointer' }}>
            수정
          </button>
        )}
        {isMe && (
          <button onClick={() => navigate('/admin/thelc/profile')}
            style={{ border: '1px solid #6c757d', borderRadius: '4px', padding: '7px 16px', fontSize: '13px', background: '#fff', color: '#6c757d', cursor: 'pointer' }}>
            비밀번호 변경
          </button>
        )}
        {isSuper && !isMe && (
          <button onClick={() => { setDeleteError(null); setConfirmOpen(true) }}
            style={{ border: '1px solid #dc3545', borderRadius: '4px', padding: '7px 16px', fontSize: '13px', background: '#fff', color: '#dc3545', cursor: 'pointer' }}>
            삭제
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="관리자 삭제"
        message={`"${data.name || data.email}"을 삭제하시겠습니까?`}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <span style={{ width: '72px', flexShrink: 0, fontSize: '13px', color: '#6c757d', paddingTop: '1px' }}>{label}</span>
      <span style={{ fontSize: '14px', color: '#343a40', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
