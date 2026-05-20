import { useState, FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Video { id: string; title: string; youtubeId: string; tag: string | null }
interface Playlist { id: string; title: string }

export default function AdminPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'videos' | 'playlists'>('videos')

  const { data: playlists } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => (await api.get<Playlist[]>('/playlists')).data,
  })

  const { data: videos } = useQuery({
    queryKey: ['videos', {}],
    queryFn: async () => (await api.get<Video[]>('/videos')).data,
  })

  const [youtubeId, setYoutubeId] = useState('')
  const [playlistId, setPlaylistId] = useState('')
  const [tag, setTag] = useState<'AR' | 'MR' | ''>('')
  const [playlistTitle, setPlaylistTitle] = useState('')

  const addVideo = useMutation({
    mutationFn: (body: object) => api.post('/videos', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['videos'] })
      setYoutubeId('')
    },
  })

  const deleteVideo = useMutation({
    mutationFn: (id: string) => api.delete(`/videos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['videos'] }),
  })

  const addPlaylist = useMutation({
    mutationFn: (body: object) => api.post('/playlists', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] })
      setPlaylistTitle('')
    },
  })

  const deletePlaylist = useMutation({
    mutationFn: (id: string) => api.delete(`/playlists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playlists'] }),
  })

  const handleAddVideo = (e: FormEvent) => {
    e.preventDefault()
    if (!youtubeId.trim()) return
    addVideo.mutate({ youtubeId: youtubeId.trim(), playlistId: playlistId || undefined, tag: tag || undefined })
  }

  const handleAddPlaylist = (e: FormEvent) => {
    e.preventDefault()
    if (!playlistTitle.trim()) return
    addPlaylist.mutate({ title: playlistTitle.trim() })
  }

  return (
    <div className="animate-fade-in">
      <header
        className="sticky top-0 z-10 flex items-center px-4"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <h1 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>관리자</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--divider)' }}>
        {(['videos', 'playlists'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3 text-sm font-medium transition-colors"
            style={{
              color: tab === t ? 'var(--primary-700)' : 'var(--ink-2)',
              borderBottom: tab === t ? '2px solid var(--primary-700)' : '2px solid transparent',
            }}
          >
            {t === 'videos' ? '영상' : '플레이리스트'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'videos' ? (
          <>
            {/* Add video form */}
            <form onSubmit={handleAddVideo} className="card p-4 mb-4 space-y-3">
              <h2 className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>영상 추가</h2>
              <input
                className="input-field"
                placeholder="YouTube ID (예: dQw4w9WgXcQ)"
                value={youtubeId}
                onChange={(e) => setYoutubeId(e.target.value)}
              />
              <select
                className="input-field"
                value={playlistId}
                onChange={(e) => setPlaylistId(e.target.value)}
                style={{ background: 'var(--white)' }}
              >
                <option value="">플레이리스트 선택</option>
                {playlists?.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.title}</option>
                ))}
              </select>
              <select
                className="input-field"
                value={tag}
                onChange={(e) => setTag(e.target.value as 'AR' | 'MR' | '')}
                style={{ background: 'var(--white)' }}
              >
                <option value="">태그 없음</option>
                <option value="AR">AR (반주+보컬)</option>
                <option value="MR">MR (반주만)</option>
              </select>
              <button type="submit" className="btn-primary w-full" disabled={addVideo.isPending}>
                {addVideo.isPending ? '추가 중...' : '영상 추가'}
              </button>
              {addVideo.isError && (
                <p className="text-xs" style={{ color: 'var(--error)' }}>추가에 실패했습니다.</p>
              )}
            </form>

            {/* Video list */}
            <div className="space-y-2">
              {videos?.map((v) => (
                <div key={v.id} className="card p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--ink-0)' }}>{v.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{v.youtubeId}</p>
                  </div>
                  {v.tag && (
                    <span className={v.tag === 'AR' ? 'tag-ar' : 'tag-mr'}>{v.tag}</span>
                  )}
                  <button
                    onClick={() => { if (confirm('삭제할까요?')) deleteVideo.mutate(v.id) }}
                    className="text-sm px-3 py-1.5 rounded-[8px] transition-colors"
                    style={{ color: 'var(--error)', background: 'rgba(184,84,80,0.08)' }}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Add playlist form */}
            <form onSubmit={handleAddPlaylist} className="card p-4 mb-4 space-y-3">
              <h2 className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>플레이리스트 추가</h2>
              <input
                className="input-field"
                placeholder="플레이리스트 이름"
                value={playlistTitle}
                onChange={(e) => setPlaylistTitle(e.target.value)}
              />
              <button type="submit" className="btn-primary w-full" disabled={addPlaylist.isPending}>
                {addPlaylist.isPending ? '추가 중...' : '플레이리스트 추가'}
              </button>
            </form>

            {/* Playlist list */}
            <div className="space-y-2">
              {playlists?.map((pl) => (
                <div key={pl.id} className="card p-3 flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>{pl.title}</p>
                  <button
                    onClick={() => { if (confirm('삭제할까요?')) deletePlaylist.mutate(pl.id) }}
                    className="text-sm px-3 py-1.5 rounded-[8px] transition-colors"
                    style={{ color: 'var(--error)', background: 'rgba(184,84,80,0.08)' }}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
