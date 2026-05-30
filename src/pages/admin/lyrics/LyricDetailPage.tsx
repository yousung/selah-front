import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

interface Lyric { id: string; youtubeId: string; chapter?: number | null; reference?: string | null; hymnTitle?: string | null; verseCount?: number | null; verse1?: string | null; verse2?: string | null; verse3?: string | null }

export default function LyricDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-lyric', id],
    queryFn: async () => (await adminApi.get<Lyric>(`/admin/thelc/lyrics/${id}`)).data,
  })

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.delete(`/admin/thelc/lyrics/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-lyrics'] }); navigate('/admin/thelc/lyrics') },
    onError: () => { setConfirmOpen(false); setDeleteError('삭제에 실패했습니다.') },
  })

  if (isLoading) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>불러오는 중...</p>
  if (!data) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>찾을 수 없습니다.</p>

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--ink-0)' }}>가사 상세</h1>
      <div className="rounded-2xl p-5 space-y-3 mb-6" style={{ background: 'var(--surface-0)', border: '1px solid var(--divider)' }}>
        <Row label="YouTube ID" value={data.youtubeId} />
        <Row label="찬송 제목" value={data.hymnTitle ?? '-'} />
        <Row label="출처" value={data.reference ?? '-'} />
        <Row label="챕터" value={String(data.chapter ?? '-')} />
        <Row label="절 수" value={String(data.verseCount ?? '-')} />
        {data.verse1 && <Row label="1절" value={data.verse1} />}
        {data.verse2 && <Row label="2절" value={data.verse2} />}
        {data.verse3 && <Row label="3절" value={data.verse3} />}
      </div>
      {deleteError && <p className="text-xs mb-4 px-3 py-2 rounded-xl" style={{ color: '#B85450', background: 'rgba(184,84,80,0.08)' }}>{deleteError}</p>}
      <div className="flex gap-2">
        <button onClick={() => navigate('/admin/thelc/lyrics')} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--surface-2)', color: 'var(--ink-1)' }}>목록으로</button>
        <button onClick={() => navigate(`/admin/thelc/lyrics/${id}/edit`)} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>수정</button>
        <button onClick={() => { setDeleteError(null); setConfirmOpen(true) }} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(184,84,80,0.1)', color: '#B85450' }}>삭제</button>
      </div>
      <ConfirmDialog open={confirmOpen} title="가사 삭제" message={`"${data.hymnTitle || data.youtubeId}"를 삭제하시겠습니까?`}
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
