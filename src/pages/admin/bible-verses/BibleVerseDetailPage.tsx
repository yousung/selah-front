import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

interface BibleVerse { id: string; content: string; reference: string }

export default function BibleVerseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bible-verse', id],
    queryFn: async () => (await adminApi.get<BibleVerse>(`/admin/thelc/bible-verses/${id}`)).data,
  })

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.delete(`/admin/thelc/bible-verses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-bible-verses'] }); navigate('/admin/thelc/bible-verses') },
    onError: () => { setConfirmOpen(false); setDeleteError('삭제에 실패했습니다.') },
  })

  if (isLoading) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>불러오는 중...</p>
  if (!data) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>찾을 수 없습니다.</p>

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--ink-0)' }}>성경구절 상세</h1>
      <div className="rounded-2xl p-5 space-y-3 mb-6" style={{ background: 'var(--surface-0)', border: '1px solid var(--divider)' }}>
        <div><p className="text-xs mb-1" style={{ color: 'var(--ink-2)' }}>내용</p><p className="text-sm" style={{ color: 'var(--ink-0)' }}>{data.content}</p></div>
        <div><p className="text-xs mb-1" style={{ color: 'var(--ink-2)' }}>출처</p><p className="text-sm" style={{ color: 'var(--ink-0)' }}>{data.reference}</p></div>
      </div>
      {deleteError && <p className="text-xs mb-4 px-3 py-2 rounded-xl" style={{ color: '#B85450', background: 'rgba(184,84,80,0.08)' }}>{deleteError}</p>}
      <div className="flex gap-2">
        <button onClick={() => navigate('/admin/thelc/bible-verses')} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--surface-2)', color: 'var(--ink-1)' }}>목록으로</button>
        <button onClick={() => navigate(`/admin/thelc/bible-verses/${id}/edit`)} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>수정</button>
        <button onClick={() => { setDeleteError(null); setConfirmOpen(true) }} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(184,84,80,0.1)', color: '#B85450' }}>삭제</button>
      </div>
      <ConfirmDialog open={confirmOpen} title="성경구절 삭제" message="이 성경구절을 삭제하시겠습니까?"
        onConfirm={() => deleteMutation.mutate()} onCancel={() => setConfirmOpen(false)} loading={deleteMutation.isPending} />
    </div>
  )
}
