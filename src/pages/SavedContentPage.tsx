import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { deleteMedia, setMediaMeta, storageInfo } from '@/lib/mediaStore'
import type { FileEntry, SavedMediaMeta } from '@/lib/mediaStore'
import { useCachedMediaStore } from '@/store/cachedMediaStore'
import { useAudio } from '@/contexts/AudioContext'
import { fs } from '@/lib/fontScale'
import { thumbUrl } from '@/lib/thumb'

interface VideoLite {
  title: string
  thumbnail: string | null
  type?: string | null
}

function splitKey(cacheKey: string): { id: string; kind: 'audio' | 'video' } {
  const kind = cacheKey.endsWith('-video') ? 'video' : 'audio'
  return { id: cacheKey.slice(0, -(kind.length + 1)), kind }
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function kindLabel(type?: string | null): string {
  if (type === 'SERMON') return '설교'
  if (type === 'READING') return '독서'
  return '찬송'
}

function playerPathFor(id: string, type?: string | null): string {
  if (type === 'SERMON') return `/sermon/player/${id}`
  if (type === 'READING') return `/reading/player/${id}`
  return `/player/${id}`
}

export default function SavedContentPage() {
  const navigate = useNavigate()
  const { currentVideo } = useAudio()
  const [entries, setEntries] = useState<FileEntry[] | null>(null)
  const [pendingDelete, setPendingDelete] = useState<FileEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const info = await storageInfo()
      setEntries([...info.entries].sort((a, b) => b.downloadedAt - a.downloadedAt))
    } catch {
      setEntries([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  // 메타가 저장돼 있지 않은 항목만 서버에서 조회(항목별 캐시 쿼리). 성공하면 IDB에 기록해 오프라인에서도 제목을 보인다.
  const queries = useQueries({
    queries: (entries ?? []).map((e) => {
      const { id } = splitKey(e.id)
      return {
        queryKey: ['video', id],
        queryFn: async () => (await api.get<VideoLite>(`/videos/${id}`)).data,
        enabled: !e.meta,
        staleTime: 5 * 60_000,
        retry: false,
      }
    }),
  })

  const fetched = queries.map((q) => q.data)
  const fetchedKey = fetched.map((v) => v?.title ?? '').join('\u0001')
  useEffect(() => {
    if (!entries) return
    entries.forEach((e, i) => {
      const v = fetched[i]
      if (!e.meta && v) {
        setMediaMeta(e.id, { title: v.title, thumbnail: v.thumbnail ?? null, type: v.type ?? null }).catch(() => {})
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, fetchedKey])

  const rows = useMemo(
    () =>
      (entries ?? []).map((e, i) => {
        const v = fetched[i]
        const meta: SavedMediaMeta | null = e.meta ?? (v ? { title: v.title, thumbnail: v.thumbnail ?? null, type: v.type ?? null } : null)
        return { entry: e, meta, ...splitKey(e.id) }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, fetchedKey],
  )

  const totalBytes = rows.reduce((sum, r) => sum + r.entry.size, 0)

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    try {
      const { id, kind } = splitKey(pendingDelete.id)
      await deleteMedia(id, kind)
      await useCachedMediaStore.getState().refresh()
      await load()
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  const pendingMeta = pendingDelete ? rows.find((r) => r.entry.id === pendingDelete.id)?.meta : null

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}>
        <div style={{ minHeight: 56, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로가기"
            style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--ink-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 style={{ fontSize: fs(18), fontWeight: 700, color: 'var(--ink-0)' }}>저장된 컨텐츠</h1>
        </div>
      </header>

      <main style={{ padding: '16px 16px 96px' }}>
        <section style={{ maxWidth: 720, margin: '0 auto' }}>
          {entries && entries.length > 0 && (
            <p data-testid="saved-total" style={{ fontSize: fs(13), color: 'var(--ink-2)', marginBottom: 12 }}>
              총 {rows.length}개 · {formatSize(totalBytes)} 사용 중
            </p>
          )}

          {entries && entries.length === 0 && (
            <p style={{ fontSize: fs(14), color: 'var(--ink-3)', textAlign: 'center', padding: '64px 0' }}>
              저장된 컨텐츠가 없습니다.
            </p>
          )}

          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
            {rows.map(({ entry, meta, id }) => {
              const playing = currentVideo?.id === id
              const thumb = thumbUrl(meta?.thumbnail, 'mqdefault')
              return (
                <li
                  key={entry.id}
                  data-testid="saved-row"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-1)', border: '1px solid var(--divider)', borderRadius: 12, padding: 8, minHeight: 72 }}
                >
                  <button
                    type="button"
                    onClick={() => navigate(playerPathFor(id, meta?.type))}
                    style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
                  >
                    <div style={{ width: 64, height: 48, borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)', flexShrink: 0 }}>
                      {thumb && <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: fs(14), fontWeight: 600, color: 'var(--ink-0)', lineHeight: 1.35, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {meta?.title ?? '제목 불러오는 중...'}
                      </p>
                      <p style={{ fontSize: fs(12), color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4 }}>
                        {kindLabel(meta?.type)} · {formatSize(entry.size)} · {formatDate(entry.downloadedAt)}
                        {playing ? ' · 재생 중' : ''}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label="삭제"
                    data-testid="saved-delete"
                    disabled={playing}
                    onClick={() => setPendingDelete(entry)}
                    style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'transparent', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: playing ? 'default' : 'pointer', opacity: playing ? 0.3 : 1, flexShrink: 0 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </main>

      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="saved-confirm"
          onClick={() => !deleting && setPendingDelete(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, maxHeight: '90dvh', overflowY: 'auto', background: 'var(--surface-0)', borderRadius: 16, padding: 20 }}
          >
            <p style={{ fontSize: fs(16), fontWeight: 700, color: 'var(--ink-0)' }}>저장된 컨텐츠 삭제</p>
            <p style={{ fontSize: fs(13), color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {pendingMeta?.title ? `"${pendingMeta.title}"을(를) ` : ''}기기에서 삭제할까요? 다시 들으려면 스트리밍하거나 새로 저장해야 합니다.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                style={{ flex: 1, minHeight: 44, borderRadius: 10, border: '1px solid var(--divider)', background: 'transparent', color: 'var(--ink-1)', fontSize: fs(14), fontWeight: 600, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                type="button"
                data-testid="saved-confirm-ok"
                onClick={confirmDelete}
                disabled={deleting}
                style={{ flex: 1, minHeight: 44, borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontSize: fs(14), fontWeight: 600, cursor: 'pointer' }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
