import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import { Pagination } from '@/components/admin/Pagination'

interface User { id: string; email: string; name: string | null; phone: string | null; role: string; createdAt: string }
interface UserRes { data: User[]; total: number }

const PAGE_SIZE = 20

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  SUPER: { bg: '#fff3cd', color: '#856404' },
  ADMIN: { bg: '#d4edda', color: '#155724' },
  USER:  { bg: '#e2e3e5', color: '#495057' },
}

export default function UsersListPage() {
  const [page, setPage] = useState(1)
  const currentUser = useAdminAuthStore((s) => s.user)
  const isSuper = currentUser?.role === 'SUPER'
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () =>
      adminApi.get<UserRes>(`/admin/thelc/users?skip=${(page - 1) * PAGE_SIZE}&take=${PAGE_SIZE}`).then(r => r.data),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.patch(`/admin/thelc/users/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rows = data?.data ?? []

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#343a40' }}>회원관리</h3>
          <span style={{ fontSize: '13px', color: '#6c757d' }}>총 {total}명</span>
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
                  <th style={th}>전화번호</th>
                  <th style={th}>역할</th>
                  <th style={th}>가입일</th>
                  {isSuper && <th style={th}>관리</th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={isSuper ? 7 : 6} style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>회원이 없습니다.</td></tr>
                ) : rows.map((u, i) => {
                  const rowNum = total - ((page - 1) * PAGE_SIZE + i)
                  const badge = ROLE_BADGE[u.role] ?? { bg: '#e2e3e5', color: '#495057' }
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ ...td, width: '60px', color: '#6c757d' }}>{rowNum}</td>
                      <td style={{ ...td, fontWeight: 500 }}>{u.name || '-'}</td>
                      <td style={{ ...td, color: '#6c757d' }}>{u.email}</td>
                      <td style={{ ...td, color: '#6c757d' }}>{u.phone || '-'}</td>
                      <td style={{ ...td, width: '90px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: badge.bg, color: badge.color }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ ...td, width: '110px', color: '#6c757d' }}>
                        {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      {isSuper && (
                        <td style={{ ...td, width: '80px' }}>
                          {u.role !== 'ADMIN' && u.role !== 'SUPER' && (
                            <button onClick={() => approveMutation.mutate(u.id)} disabled={approveMutation.isPending}
                              style={{ border: '1px solid #28a745', borderRadius: '4px', padding: '3px 10px', fontSize: '12px', background: '#fff', color: '#28a745', cursor: 'pointer' }}>
                              승인
                            </button>
                          )}
                        </td>
                      )}
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
