import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import type { AxiosError } from 'axios'

interface Playlist { id: string; title: string; createdAt: string; videoCount?: number }

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-playlist', id],
    queryFn: async () => (await adminApi.get<Playlist>(`/admin/thelc/playlists/${id}`)).data,
  })

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.delete(`/admin/thelc/playlists/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-playlists'] })
      navigate('/admin/thelc/playlists')
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      setConfirmOpen(false)
      const msg = err.response?.data?.message
      if (msg?.includes('foreign key') || msg?.includes('연결') || (err.response?.status ?? 0) >= 400) {
        setDeleteError('연결된 영상이 있어 삭제할 수 없습니다. 먼저 영상을 제거해 주세요.')
      } else {
        setDeleteError('삭제에 실패했습니다.')
      }
    },
  })

  if (isLoading) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>불러오는 중...</p>
  if (!data) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>찾을 수 없습니다.</p>

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--ink-0)' }}>플레이리스트 상세</h1>
      <div className="rounded-2xl p-5 space-y-3 mb-6" style={{ background: 'var(--surface-0)', border: '1px solid var(--divider)' }}>
        <Row label="제목" value={data.title} />
        <Row label="영상 수" value={String(data.videoCount ?? 0)} />
        <Row label="생성일" value={new Date(data.createdAt).toLocaleString('ko-KR')} />
      </div>
      {deleteError && (
        <p className="text-xs mb-4 px-3 py-2 rounded-xl" style={{ color: '#B85450', background: 'rgba(184,84,80,0.08)' }}>
          {deleteError}
        </p>
      )}
      <div className="flex gap-2">
        <button onClick={() => navigate('/admin/thelc/playlists')}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-1)' }}>목록으로</button>
        <button onClick={() => navigate(`/admin/thelc/playlists/${id}/edit`)}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>수정</button>
        <button onClick={() => { setDeleteError(null); setConfirmOpen(true) }}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(184,84,80,0.1)', color: '#B85450' }}>삭제</button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="플레이리스트 삭제"
        message={`"${data.title}"를 삭제하시겠습니까?`}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-xs w-20 flex-shrink-0 pt-0.5" style={{ color: 'var(--ink-2)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--ink-0)' }}>{value}</span>
    </div>
  )
}
