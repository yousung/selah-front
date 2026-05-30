import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'

export default function PlaylistFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    adminApi.get(`/admin/thelc/playlists/${id}`).then((r) => {
      setTitle(r.data.title)
      setFetching(false)
    })
  }, [id, isEdit])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    setLoading(true)
    try {
      if (isEdit) {
        await adminApi.patch(`/admin/thelc/playlists/${id}`, { title: title.trim() })
        qc.invalidateQueries({ queryKey: ['admin-playlist', id] })
        navigate(`/admin/thelc/playlists/${id}`)
      } else {
        await adminApi.post('/admin/thelc/playlists', { title: title.trim() })
        navigate('/admin/thelc/playlists')
      }
      qc.invalidateQueries({ queryKey: ['admin-playlists'] })
    } catch {
      setError(isEdit ? '수정에 실패했습니다.' : '추가에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>불러오는 중...</p>

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--ink-0)' }}>
        플레이리스트 {isEdit ? '수정' : '추가'}
      </h1>
      <form onSubmit={handleSubmit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--divider)' }}>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>제목 *</label>
          <input
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{ border: '1px solid var(--divider)', background: 'var(--surface-1)', color: 'var(--ink-0)' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="플레이리스트 이름"
            required
          />
        </div>
        {error && <p className="text-xs" style={{ color: '#B85450' }}>{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => navigate(isEdit ? `/admin/thelc/playlists/${id}` : '/admin/thelc/playlists')}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--ink-1)' }}>취소</button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--primary-700)', color: '#fff', opacity: loading ? 0.7 : 1 }}>
            {loading ? '저장 중...' : (isEdit ? '수정' : '추가')}
          </button>
        </div>
      </form>
    </div>
  )
}
