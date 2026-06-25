import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'

interface Playlist { id: string; title: string }

export default function VideoFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({ youtubeId: '', tag: '', playlistId: '', chapter: '', isSecret: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(isEdit)

  const { data: playlists } = useQuery({
    queryKey: ['admin-playlists-select'],
    queryFn: async () => (await adminApi.get<Playlist[]>('/admin/thelc/playlists')).data,
  })

  useEffect(() => {
    if (!isEdit) return
    adminApi.get(`/admin/thelc/videos/${id}`).then((r) => {
      const d = r.data
      setForm({ youtubeId: d.youtubeId ?? '', tag: d.tag ?? 'AR', playlistId: d.playlistId ?? '', chapter: String(d.chapter ?? ''), isSecret: d.isSecret ?? false })
      setFetching(false)
    })
  }, [id, isEdit])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.youtubeId.trim()) return
    setError(null)
    setLoading(true)
    const body = {
      youtubeId: form.youtubeId.trim(),
      tag: form.tag || undefined,
      playlistId: form.playlistId || undefined,
      chapter: form.chapter ? Number(form.chapter) : undefined,
      isSecret: form.isSecret,
    }
    try {
      if (isEdit) {
        await adminApi.patch(`/admin/thelc/videos/${id}`, body)
        qc.invalidateQueries({ queryKey: ['admin-video', id] })
        navigate(`/admin/thelc/videos/${id}`)
      } else {
        await adminApi.post('/admin/thelc/videos', body)
        navigate('/admin/thelc/videos')
      }
      qc.invalidateQueries({ queryKey: ['admin-videos'] })
    } catch {
      setError(isEdit ? '수정에 실패했습니다.' : '추가에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>불러오는 중...</p>

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--ink-0)' }}>영상 {isEdit ? '수정' : '추가'}</h1>
      <form onSubmit={handleSubmit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--divider)' }}>
        <Field label="YouTube ID *">
          <input className="input-sm" style={inputStyle} value={form.youtubeId} onChange={(e) => set('youtubeId', e.target.value)} placeholder="dQw4w9WgXcQ" required />
        </Field>
        <Field label="태그">
          <select className="input-sm" style={inputStyle} value={form.tag} onChange={(e) => set('tag', e.target.value)}>
            <option value="">없음</option>
            <option value="AR">AR</option>
            <option value="MR">MR</option>
          </select>
        </Field>
        <Field label="플레이리스트">
          <select className="input-sm" style={inputStyle} value={form.playlistId} onChange={(e) => set('playlistId', e.target.value)}>
            <option value="">없음</option>
            {playlists?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </Field>
        <Field label="챕터">
          <input type="number" className="input-sm" style={inputStyle} value={form.chapter} onChange={(e) => set('chapter', e.target.value)} placeholder="0" min="0" />
        </Field>
        <Field label="비공개">
          <label className="flex items-center gap-2 cursor-pointer" style={{ paddingTop: 4 }}>
            <input
              type="checkbox"
              checked={form.isSecret}
              onChange={(e) => setForm((f) => ({ ...f, isSecret: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: 'var(--primary-700)', cursor: 'pointer' }}
            />
            <span className="text-sm" style={{ color: 'var(--ink-1)' }}>비공개 (스트리밍 차단)</span>
          </label>
        </Field>
        {error && <p className="text-xs" style={{ color: '#B85450' }}>{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => navigate(isEdit ? `/admin/thelc/videos/${id}` : '/admin/thelc/videos')}
            className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--surface-2)', color: 'var(--ink-1)' }}>취소</button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--primary-700)', color: '#fff', opacity: loading ? 0.7 : 1 }}>
            {loading ? '저장 중...' : (isEdit ? '수정' : '추가')}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputStyle = { border: '1px solid var(--divider)', background: 'var(--surface-1)', color: 'var(--ink-0)', width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.75rem', fontSize: '0.875rem', outline: 'none' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>{label}</label>
      {children}
    </div>
  )
}
