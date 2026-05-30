import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import { Pagination } from '@/components/admin/Pagination'

interface Admin { id: string; email: string; name: string | null; phone: string | null; role: string; createdAt: string }

const PAGE_SIZE = 20
const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  SUPER: { bg: '#fff3cd', color: '#856404' },
  ADMIN: { bg: '#d4edda', color: '#155724' },
}

export default function AdminsListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const currentUser = useAdminAuthStore((s) => s.user)
  const isSuper = currentUser?.role === 'SUPER'

  const { data, isLoading } = useQuery({
    queryKey: ['admin-admins'],
    queryFn: () => adminApi.get<Admin[]>('/admin/thelc/admins').then(r => r.data),
  })

  const total = data?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paged = data?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? []

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#343a40' }}>관리자 계정</h3>
          {isSuper && (
            <button onClick={() => navigate('/admin/thelc/admins/new')}
              style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
              + 추가
            </button>
          )}
        </div>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d', fontSize: '14px' }}>불러오는 중...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={th}>번호</th>
                  <th style={th}>이름</th>
                  <th style={th}>이메일</th>
                  <th style={th}>역할</th>
                  <th style={th}>가입일</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>관리자가 없습니다.</td></tr>
                ) : paged.map((a, i) => {
                  const rowNum = total - ((page - 1) * PAGE_SIZE + i)
                  const badge = ROLE_BADGE[a.role] ?? { bg: '#e2e3e5', color: '#495057' }
                  const isMe = a.id === currentUser?.id
                  return (
                    <tr key={a.id} onClick={() => navigate(`/admin/thelc/admins/${a.id}`)} style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ ...td, width: '60px', color: '#6c757d' }}>{rowNum}</td>
                      <td style={{ ...td, fontWeight: 500 }}>
                        {a.name || '-'}
                        {isMe && <span style={{ marginLeft: '6px', fontSize: '11px', background: '#cce5ff', color: '#004085', padding: '1px 6px', borderRadius: '8px' }}>나</span>}
                      </td>
                      <td style={{ ...td, color: '#6c757d' }}>{a.email}</td>
                      <td style={{ ...td, width: '90px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: badge.bg, color: badge.color }}>{a.role}</span>
                      </td>
                      <td style={{ ...td, width: '110px', color: '#6c757d' }}>{new Date(a.createdAt).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #dee2e6' }}>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', borderBottom: '2px solid #dee2e6', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 16px', verticalAlign: 'middle' }
