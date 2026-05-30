import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'

export default function LyricFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({ youtubeId: '', hymnTitle: '', reference: '', chapter: '', verseCount: '', verse1: '', verse2: '', verse3: '', verse4: '', verse5: '', verse6: '', verse7: '', verse8: '', verse9: '', verse10: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    adminApi.get(`/admin/thelc/lyrics/${id}`).then((r) => {
      const d = r.data
      setForm({
        youtubeId: d.youtubeId ?? '', hymnTitle: d.hymnTitle ?? '', reference: d.reference ?? '',
        chapter: String(d.chapter ?? ''), verseCount: String(d.verseCount ?? ''),
        verse1: d.verse1 ?? '', verse2: d.verse2 ?? '', verse3: d.verse3 ?? '',
        verse4: d.verse4 ?? '', verse5: d.verse5 ?? '', verse6: d.verse6 ?? '',
        verse7: d.verse7 ?? '', verse8: d.verse8 ?? '', verse9: d.verse9 ?? '',
        verse10: d.verse10 ?? '',
      })
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
      hymnTitle: form.hymnTitle || undefined,
      reference: form.reference || undefined,
      chapter: form.chapter ? Number(form.chapter) : undefined,
      verseCount: form.verseCount ? Number(form.verseCount) : undefined,
      verse1: form.verse1 || undefined, verse2: form.verse2 || undefined,
      verse3: form.verse3 || undefined, verse4: form.verse4 || undefined,
      verse5: form.verse5 || undefined, verse6: form.verse6 || undefined,
      verse7: form.verse7 || undefined, verse8: form.verse8 || undefined,
      verse9: form.verse9 || undefined, verse10: form.verse10 || undefined,
    }
    try {
      if (isEdit) {
        await adminApi.patch(`/admin/thelc/lyrics/${id}`, body)
        qc.invalidateQueries({ queryKey: ['admin-lyric', id] })
        navigate(`/admin/thelc/lyrics/${id}`)
      } else {
        await adminApi.post('/admin/thelc/lyrics', body)
        navigate('/admin/thelc/lyrics')
      }
      qc.invalidateQueries({ queryKey: ['admin-lyrics'] })
    } catch {
      setError(isEdit ? '수정에 실패했습니다.' : '추가에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>불러오는 중...</p>

  const inputStyle = { border: '1px solid var(--divider)', background: 'var(--surface-1)', color: 'var(--ink-0)', width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.75rem', fontSize: '0.875rem', outline: 'none' }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--ink-0)' }}>가사 {isEdit ? '수정' : '추가'}</h1>
      <form onSubmit={handleSubmit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--divider)' }}>
        {[
          { key: 'youtubeId', label: 'YouTube ID *', required: true, placeholder: 'dQw4w9WgXcQ' },
          { key: 'hymnTitle', label: '찬송 제목', placeholder: '주 하나님 지으신 모든 세계' },
          { key: 'reference', label: '출처', placeholder: '찬송가 1장' },
          { key: 'chapter', label: '챕터 번호', placeholder: '1', type: 'number' },
          { key: 'verseCount', label: '총 절 수', placeholder: '4', type: 'number' },
        ].map(({ key, label, required, placeholder, type }) => (
          <div key={key}>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>{label}</label>
            <input type={type || 'text'} style={inputStyle} value={(form as any)[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} required={required} />
          </div>
        ))}
        <p className="text-xs font-medium pt-1" style={{ color: 'var(--ink-1)' }}>가사 내용</p>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <div key={n}>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{n}절</label>
            <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={(form as any)[`verse${n}`]} onChange={(e) => set(`verse${n}`, e.target.value)} placeholder={`${n}절 가사`} />
          </div>
        ))}
        {error && <p className="text-xs" style={{ color: '#B85450' }}>{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => navigate(isEdit ? `/admin/thelc/lyrics/${id}` : '/admin/thelc/lyrics')}
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
