import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Video { id: string; title: string; youtubeId: string; tag: string | null; playlistId: string | null }
interface Playlist { id: string; name: string }
interface Lyrics { hymnTitle: string; reference: string; chapter: string; verseCount: number; verse1?: string; verse2?: string; verse3?: string; verse4?: string; verse5?: string; verse6?: string; verse7?: string; verse8?: string; verse9?: string; verse10?: string; verse11?: string; verse12?: string }

const EMPTY_LYRICS: Lyrics = { hymnTitle: '', reference: '', chapter: '', verseCount: 1, verse1: '', verse2: '', verse3: '', verse4: '', verse5: '', verse6: '', verse7: '', verse8: '', verse9: '', verse10: '', verse11: '', verse12: '' }

export default function VideosPage() {
  const qc = useQueryClient()

  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => (await api.get<Video[]>('/videos')).data,
  })

  const { data: playlists } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => (await api.get<Playlist[]>('/playlists?limit=50')).data,
  })

  // 작성폼 modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ youtubeId: '', playlistId: '', tag: '' as 'AR' | 'MR' | '' })

  // 수정폼 modal
  const [editVideo, setEditVideo] = useState<Video | null>(null)
  const [editForm, setEditForm] = useState({ title: '', playlistId: '', tag: '' as 'AR' | 'MR' | '' })

  // 가사 modal
  const [lyricsVideoId, setLyricsVideoId] = useState<string | null>(null)
  const [lyricsData, setLyricsData] = useState<Lyrics>(EMPTY_LYRICS)
  const [lyricsLoading, setLyricsLoading] = useState(false)

  const addMutation = useMutation({
    mutationFn: (body: { youtubeId: string; playlistId?: string; tag?: string }) =>
      api.post('/videos', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['videos'] })
      setShowAddModal(false)
      setAddForm({ youtubeId: '', playlistId: '', tag: '' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { title?: string; playlistId?: string; tag?: string } }) =>
      api.patch(`/videos/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['videos'] })
      setEditVideo(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/videos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['videos'] }),
  })

  const fetchLyrics = useMutation({
    mutationFn: (id: string) => api.get<Lyrics>(`/videos/${id}/lyrics`),
  })

  const saveLyrics = useMutation({
    mutationFn: (id: string) => api.patch(`/videos/${id}/lyrics`, lyricsData),
    onSuccess: () => {
      setLyricsVideoId(null)
      qc.invalidateQueries({ queryKey: ['videos'] })
    },
  })

  const handleAdd = () => {
    if (!addForm.youtubeId.trim()) return
    addMutation.mutate({
      youtubeId: addForm.youtubeId.trim(),
      playlistId: addForm.playlistId || undefined,
      tag: addForm.tag || undefined,
    })
  }

  const handleEditOpen = (video: Video) => {
    setEditVideo(video)
    setEditForm({ title: video.title, playlistId: video.playlistId || '', tag: (video.tag as 'AR' | 'MR' | '') || '' })
  }

  const handleEditSave = () => {
    if (!editVideo || !editForm.title.trim()) return
    updateMutation.mutate({
      id: editVideo.id,
      body: { title: editForm.title.trim(), playlistId: editForm.playlistId || undefined, tag: editForm.tag || undefined },
    })
  }

  const handleLyricsOpen = async (id: string) => {
    setLyricsVideoId(id)
    setLyricsLoading(true)
    try {
      const { data } = await fetchLyrics.mutateAsync(id)
      setLyricsData(data)
    } catch {
      setLyricsData(EMPTY_LYRICS)
    } finally {
      setLyricsLoading(false)
    }
  }

  const playlistName = (id: string | null) =>
    id ? playlists?.find((p) => p.id === id)?.name ?? '-' : '-'

  return (
    <div className="animate-fade-in">
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <h1 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>영상 관리</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-lg text-sm text-white transition-colors"
          style={{ background: 'var(--primary-700)' }}
        >
          영상 추가
        </button>
      </header>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>영상 목록</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            {videos?.length ?? 0}
          </span>
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--ink-2)' }}>로딩 중...</p>
        ) : !videos?.length ? (
          <p style={{ color: 'var(--ink-2)' }}>영상이 없습니다.</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                  {['제목', 'YouTube ID', '태그', '카테고리', ''].map((h) => (
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
                {videos.map((video) => (
                  <tr key={video.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                    <td className="px-4 py-3 text-sm font-medium max-w-xs" style={{ color: 'var(--ink-0)' }}>
                      <span className="line-clamp-2">{video.title}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--ink-2)' }}>
                      {video.youtubeId}
                    </td>
                    <td className="px-4 py-3">
                      {video.tag ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}
                        >
                          {video.tag}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ink-3)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-2)' }}>
                      {playlistName(video.playlistId)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEditOpen(video)}
                          className="text-xs px-3 py-1.5 rounded-md transition-colors"
                          style={{ color: 'var(--primary-700)', background: 'var(--primary-50)' }}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleLyricsOpen(video.id)}
                          className="text-xs px-3 py-1.5 rounded-md transition-colors"
                          style={{ color: 'var(--primary-700)', background: 'var(--primary-50)' }}
                        >
                          가사
                        </button>
                        <button
                          onClick={() => { if (confirm('삭제할까요?')) deleteMutation.mutate(video.id) }}
                          className="text-xs px-3 py-1.5 rounded-md transition-colors"
                          style={{ color: 'var(--error)', background: 'rgba(184,84,80,0.08)' }}
                          disabled={deleteMutation.isPending}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 작성폼 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="card rounded-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ink-0)' }}>새 영상 추가</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>YouTube ID *</label>
                <input
                  className="input-field"
                  placeholder="예: dQw4w9WgXcQ"
                  value={addForm.youtubeId}
                  onChange={(e) => setAddForm((f) => ({ ...f, youtubeId: e.target.value }))}
                  disabled={addMutation.isPending}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>카테고리</label>
                <select
                  className="input-field"
                  value={addForm.playlistId}
                  onChange={(e) => setAddForm((f) => ({ ...f, playlistId: e.target.value }))}
                  disabled={addMutation.isPending}
                  style={{ background: 'var(--surface-0)' }}
                >
                  <option value="">선택 안함</option>
                  {playlists?.map((pl) => (
                    <option key={pl.id} value={pl.id}>{pl.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>태그</label>
                <select
                  className="input-field"
                  value={addForm.tag}
                  onChange={(e) => setAddForm((f) => ({ ...f, tag: e.target.value as 'AR' | 'MR' | '' }))}
                  disabled={addMutation.isPending}
                  style={{ background: 'var(--surface-0)' }}
                >
                  <option value="">태그 없음</option>
                  <option value="AR">AR (반주+보컬)</option>
                  <option value="MR">MR (반주만)</option>
                </select>
              </div>
              {addMutation.isError && (
                <p className="text-xs" style={{ color: 'var(--error)' }}>
                  {(addMutation.error as any)?.response?.data?.message || '추가에 실패했습니다.'}
                </p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm border rounded-lg"
                  style={{ color: 'var(--ink-1)', borderColor: 'var(--divider)' }}
                >
                  취소
                </button>
                <button
                  onClick={handleAdd}
                  disabled={addMutation.isPending || !addForm.youtubeId.trim()}
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

      {/* 수정폼 모달 */}
      {editVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditVideo(null)}>
          <div className="card rounded-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ink-0)' }}>영상 수정</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>제목</label>
                <input
                  className="input-field"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  disabled={updateMutation.isPending}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>카테고리</label>
                <select
                  className="input-field"
                  value={editForm.playlistId}
                  onChange={(e) => setEditForm((f) => ({ ...f, playlistId: e.target.value }))}
                  disabled={updateMutation.isPending}
                  style={{ background: 'var(--surface-0)' }}
                >
                  <option value="">선택 안함</option>
                  {playlists?.map((pl) => (
                    <option key={pl.id} value={pl.id}>{pl.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-1)' }}>태그</label>
                <select
                  className="input-field"
                  value={editForm.tag}
                  onChange={(e) => setEditForm((f) => ({ ...f, tag: e.target.value as 'AR' | 'MR' | '' }))}
                  disabled={updateMutation.isPending}
                  style={{ background: 'var(--surface-0)' }}
                >
                  <option value="">태그 없음</option>
                  <option value="AR">AR (반주+보컬)</option>
                  <option value="MR">MR (반주만)</option>
                </select>
              </div>
              {updateMutation.isError && (
                <p className="text-xs" style={{ color: 'var(--error)' }}>
                  {(updateMutation.error as any)?.response?.data?.message || '수정에 실패했습니다.'}
                </p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setEditVideo(null)}
                  className="px-4 py-2 text-sm border rounded-lg"
                  style={{ color: 'var(--ink-1)', borderColor: 'var(--divider)' }}
                >
                  취소
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={updateMutation.isPending || !editForm.title.trim()}
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

      {/* 가사 모달 */}
      {lyricsVideoId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div
            className="w-full rounded-t-[16px] p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface-0)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>가사 편집</h2>
              <button onClick={() => setLyricsVideoId(null)} className="text-2xl" style={{ color: 'var(--ink-2)' }}>✕</button>
            </div>

            {lyricsLoading ? (
              <p style={{ color: 'var(--ink-2)' }}>로딩 중...</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--ink-1)' }}>찬송가 제목 *</label>
                  <input className="input-field mt-1" value={lyricsData.hymnTitle} onChange={(e) => setLyricsData({ ...lyricsData, hymnTitle: e.target.value })} disabled={saveLyrics.isPending} />
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--ink-1)' }}>참고 경문</label>
                  <input className="input-field mt-1" value={lyricsData.reference} onChange={(e) => setLyricsData({ ...lyricsData, reference: e.target.value })} placeholder="예: 요한복음 3:16" disabled={saveLyrics.isPending} />
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--ink-1)' }}>장</label>
                  <input className="input-field mt-1" value={lyricsData.chapter} onChange={(e) => setLyricsData({ ...lyricsData, chapter: e.target.value })} disabled={saveLyrics.isPending} />
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--ink-1)' }}>절 수 *</label>
                  <input className="input-field mt-1" type="number" min="1" max="12" value={lyricsData.verseCount} onChange={(e) => setLyricsData({ ...lyricsData, verseCount: parseInt(e.target.value) || 1 })} disabled={saveLyrics.isPending} />
                </div>
                {Array.from({ length: lyricsData.verseCount }, (_, i) => i + 1).map((n) => (
                  <div key={`verse-${n}`}>
                    <label className="text-xs font-medium" style={{ color: 'var(--ink-1)' }}>{n}절</label>
                    <textarea
                      className="input-field mt-1 resize-none"
                      rows={4}
                      value={lyricsData[`verse${n}` as keyof Lyrics] as string || ''}
                      onChange={(e) => setLyricsData({ ...lyricsData, [`verse${n}`]: e.target.value } as Lyrics)}
                      disabled={saveLyrics.isPending}
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => saveLyrics.mutate(lyricsVideoId)}
                    className="flex-1 text-sm px-4 py-2 rounded-[8px] transition-colors text-white disabled:opacity-50"
                    style={{ background: 'var(--primary-700)' }}
                    disabled={saveLyrics.isPending || !lyricsData.hymnTitle.trim()}
                  >
                    {saveLyrics.isPending ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={() => setLyricsVideoId(null)}
                    className="flex-1 text-sm px-4 py-2 rounded-[8px] transition-colors"
                    style={{ color: 'var(--ink-1)', background: 'var(--surface-1)' }}
                    disabled={saveLyrics.isPending}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
