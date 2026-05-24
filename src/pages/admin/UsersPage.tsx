import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'admin' | 'user'
  createdAt: string
}

const pageSize = 20

export default function UsersPage() {
  const { user: currentAdmin } = useAuthStore()
  const isSuperAdmin = currentAdmin?.role === 'super'
  const qc = useQueryClient()
  const [page, setPage] = useState(0)

  // 추가 모달
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'user' as 'admin' | 'user' })

  // 상세/수정 모달
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user')

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page],
    queryFn: async () =>
      (await api.get<{ data: User[]; total: number }>('/admin/users', {
        params: { skip: page * pageSize, take: pageSize },
      })).data,
  })

  const addMutation = useMutation({
    mutationFn: (body: { name: string; email: string; password: string; role: string }) =>
      api.post('/admin/users', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowAdd(false)
      setAddForm({ name: '', email: '', password: '', role: 'user' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/admin/users/${id}`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditUser(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditUser(null)
    },
  })

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  const handleEditOpen = (u: User) => {
    setEditUser(u)
    setEditRole(u.role)
  }

  return (
    <div className="animate-fade-in">
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <h1 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>사용자 관리</h1>
        {isSuperAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 rounded-lg text-sm text-white transition-colors"
            style={{ background: 'var(--primary-700)' }}
          >
            사용자 추가
          </button>
        )}
      </header>

      <div className="p-6">
        {isLoading ? (
          <p style={{ color: 'var(--ink-2)' }}>로드 중...</p>
        ) : error ? (
          <p style={{ color: 'var(--error)' }}>사용자를 불러올 수 없습니다.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>사용자 목록</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                {data?.total ?? 0}
              </span>
            </div>
            <div className="card overflow-hidden mb-4">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                    {['이름', '이메일', '전화번호', '역할', '가입일'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                        style={{ color: 'var(--ink-2)', background: 'var(--surface-1)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => handleEditOpen(u)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      style={{ borderBottom: '1px solid var(--divider)' }}
                    >
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--ink-0)' }}>{u.name}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-1)' }}>{u.email}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-2)' }}>{u.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: u.role === 'admin' ? '#FEF3C7' : 'var(--surface-1)',
                            color: u.role === 'admin' ? '#92400E' : 'var(--ink-2)',
                          }}
                        >
                          {u.role === 'admin' ? '관리자' : '사용자'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-2)' }}>
                        {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex gap-2 items-center justify-center">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 transition-colors"
                  style={{ borderColor: 'var(--divider)', color: 'var(--ink-1)' }}
                >
                  이전
                </button>
                <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 transition-colors"
                  style={{ borderColor: 'var(--divider)', color: 'var(--ink-1)' }}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 사용자 추가 모달 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="card rounded-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ink-0)' }}>새 사용자 추가</h3>
            <div className="space-y-3">
              {([
                { label: '이름 *', key: 'name', type: 'text' },
                { label: '이메일 *', key: 'email', type: 'email' },
                { label: '비밀번호 *', key: 'password', type: 'password' },
              ] as const).map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>{label}</label>
                  <input
                    type={type}
                    value={addForm[key]}
                    onChange={(e) => setAddForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="input-field"
                    disabled={addMutation.isPending}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>역할</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value as 'admin' | 'user' }))}
                  className="input-field"
                  style={{ background: 'var(--surface-0)' }}
                  disabled={addMutation.isPending}
                >
                  <option value="user">사용자</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
              {addMutation.isError && (
                <p className="text-xs" style={{ color: 'var(--error)' }}>
                  {(addMutation.error as any)?.response?.data?.message || '추가에 실패했습니다.'}
                </p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border rounded-lg" style={{ color: 'var(--ink-1)', borderColor: 'var(--divider)' }}>취소</button>
                <button
                  onClick={() => addMutation.mutate(addForm)}
                  disabled={addMutation.isPending || !addForm.name || !addForm.email || !addForm.password}
                  className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
                  style={{ background: 'var(--primary-700)' }}
                >
                  {addMutation.isPending ? '추가 중...' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 상세/수정 모달 */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditUser(null)}>
          <div className="card rounded-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--ink-0)' }}>{editUser.name}</h3>
            <p className="text-sm mb-1" style={{ color: 'var(--ink-2)' }}>{editUser.email}</p>
            {editUser.phone && (
              <p className="text-sm mb-3" style={{ color: 'var(--ink-2)' }}>{editUser.phone}</p>
            )}
            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>역할</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'admin' | 'user')}
                  className="input-field"
                  style={{ background: 'var(--surface-0)' }}
                  disabled={updateMutation.isPending || !isSuperAdmin}
                >
                  <option value="user">사용자</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                가입일: {new Date(editUser.createdAt).toLocaleDateString('ko-KR')}
              </p>
              {updateMutation.isError && (
                <p className="text-xs" style={{ color: 'var(--error)' }}>수정에 실패했습니다.</p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm border rounded-lg" style={{ color: 'var(--ink-1)', borderColor: 'var(--divider)' }}>닫기</button>
                {isSuperAdmin && (
                  <>
                    <button
                      onClick={() => { if (confirm(`'${editUser.name}' 사용자를 삭제할까요?`)) deleteMutation.mutate(editUser.id) }}
                      disabled={deleteMutation.isPending}
                      className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
                      style={{ background: 'var(--error)' }}
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => updateMutation.mutate({ id: editUser.id, role: editRole })}
                      disabled={updateMutation.isPending || editRole === editUser.role}
                      className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
                      style={{ background: 'var(--primary-700)' }}
                    >
                      {updateMutation.isPending ? '저장 중...' : '저장'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
