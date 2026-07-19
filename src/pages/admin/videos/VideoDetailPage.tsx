import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import type { AxiosError } from 'axios'

interface Video { id: string; title: string; youtubeId: string; tag: string; chapter?: number; description?: string; playlistId?: string; isLive?: boolean; createdAt: string }

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-video', id],
    queryFn: async () => (await adminApi.get<Video>(`/admin/thelc/videos/${id}`)).data,
  })

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.delete(`/admin/thelc/videos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-videos'] })
      navigate('/admin/thelc/videos')
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      setConfirmOpen(false)
      setDeleteError('삭제에 실패했습니다: ' + (err.response?.data?.message ?? err.message))
    },
  })

  if (isLoading) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>불러오는 중...</p>
  if (!data) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>찾을 수 없습니다.</p>

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--ink-0)' }}>영상 상세</h1>
      <div className="rounded-2xl p-5 space-y-3 mb-6" style={{ background: 'var(--surface-0)', border: '1px solid var(--divider)' }}>
        <Row label="제목" value={data.title || '-'} />
        <Row label="YouTube ID" value={data.youtubeId} />
        <Row label="태그" value={data.tag} />
        <Row label="챕터" value={String(data.chapter ?? '-')} />
        <Row label="플레이리스트" value={data.playlistId ?? '-'} />
        <Row label="방송중" value={data.isLive ? '예' : '아니오'} />
        <Row label="생성일" value={new Date(data.createdAt).toLocaleString('ko-KR')} />
        {data.description && <Row label="설명" value={data.description} />}
      </div>
      {deleteError && <p className="text-xs mb-4 px-3 py-2 rounded-xl" style={{ color: '#B85450', background: 'rgba(184,84,80,0.08)' }}>{deleteError}</p>}
      <div className="flex gap-2">
        <button onClick={() => navigate('/admin/thelc/videos')} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--surface-2)', color: 'var(--ink-1)' }}>목록으로</button>
        <button onClick={() => navigate(`/admin/thelc/videos/${id}/edit`)} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>수정</button>
        <button onClick={() => { setDeleteError(null); setConfirmOpen(true) }} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(184,84,80,0.1)', color: '#B85450' }}>삭제</button>
      </div>
      <ConfirmDialog open={confirmOpen} title="영상 삭제" message={`"${data.title || data.youtubeId}"를 삭제하시겠습니까?`}
        onConfirm={() => deleteMutation.mutate()} onCancel={() => setConfirmOpen(false)} loading={deleteMutation.isPending} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-xs w-24 flex-shrink-0 pt-0.5" style={{ color: 'var(--ink-2)' }}>{label}</span>
      <span className="text-sm break-all" style={{ color: 'var(--ink-0)' }}>{value}</span>
    </div>
  )
}
