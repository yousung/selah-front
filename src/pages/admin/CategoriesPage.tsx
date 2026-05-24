import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Playlist { id: string; title: string; createdAt?: string }

export default function CategoriesPage() {
  const qc = useQueryClient()

  const { data: playlists, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => (await api.get<Playlist[]>('/playlists?limit=50')).data,
  })

  // 추가 모달
  const [showAdd, setShowAdd] = useState(false)
  const [addTitle, setAddTitle] = useState('')

  // 수정 모달
  const [editItem, setEditItem] = useState<Playlist | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const addMutation = useMutation({
    mutationFn: (body: { title: string }) => api.post('/playlists', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] })
      setShowAdd(false)
      setAddTitle('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.patch(`/playlists/${id}`, { title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] })
      setEditItem(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/playlists/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] })
      setEditItem(null)
    },
  })

  const handleEditOpen = (pl: Playlist) => {
    setEditItem(pl)
    setEditTitle(pl.title)
  }

  return (
    <div className="animate-fade-in">
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <h1 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>카테고리 관리</h1>
        <button
          onClick={() => { setShowAdd(true); setAddTitle('') }}
          className="px-3 py-1.5 rounded-lg text-sm text-white transition-colors"
          style={{ background: 'var(--primary-700)' }}
        >
          카테고리 추가
        </button>
      </header>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>카테고리 목록</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            {playlists?.length ?? 0}
          </span>
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--ink-2)' }}>로딩 중...</p>
        ) : !playlists?.length ? (
          <p style={{ color: 'var(--ink-2)' }}>카테고리가 없습니다.</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                  {['이름', '생성일'].map((h) => (
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
                {playlists.map((pl) => (
                  <tr
                    key={pl.id}
                    onClick={() => handleEditOpen(pl)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    style={{ borderBottom: '1px solid var(--divider)' }}
                  >
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--ink-0)' }}>
                      {pl.title}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-2)' }}>
                      {pl.createdAt ? new Date(pl.createdAt).toLocaleDateString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 추가 모달 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="card rounded-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ink-0)' }}>새 카테고리 추가</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>이름 *</label>
                <input
                  className="input-field"
                  placeholder="카테고리 이름"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  disabled={addMutation.isPending}
                  autoFocus
                />
              </div>
              {addMutation.isError && (
                <p className="text-xs" style={{ color: 'var(--error)' }}>
                  {(addMutation.error as any)?.response?.data?.message || '추가에 실패했습니다.'}
                </p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm border rounded-lg"
                  style={{ color: 'var(--ink-1)', borderColor: 'var(--divider)' }}
                >
                  취소
                </button>
                <button
                  onClick={() => addMutation.mutate({ title: addTitle.trim() })}
                  disabled={addMutation.isPending || !addTitle.trim()}
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

      {/* 수정 모달 */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditItem(null)}>
          <div className="card rounded-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ink-0)' }}>카테고리 수정</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>이름 *</label>
                <input
                  className="input-field"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={updateMutation.isPending}
                  autoFocus
                />
              </div>
              {updateMutation.isError && (
                <p className="text-xs" style={{ color: 'var(--error)' }}>수정에 실패했습니다.</p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => {
                    if (confirm(`'${editItem.title}' 카테고리를 삭제할까요?`)) {
                      deleteMutation.mutate(editItem.id)
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm rounded-lg mr-auto disabled:opacity-50"
                  style={{ color: 'var(--error)', background: 'rgba(184,84,80,0.08)' }}
                >
                  삭제
                </button>
                <button
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 text-sm border rounded-lg"
                  style={{ color: 'var(--ink-1)', borderColor: 'var(--divider)' }}
                >
                  취소
                </button>
                <button
                  onClick={() => updateMutation.mutate({ id: editItem.id, title: editTitle.trim() })}
                  disabled={updateMutation.isPending || !editTitle.trim()}
                  className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
                  style={{ background: 'var(--primary-700)' }}
                >
                  {updateMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
