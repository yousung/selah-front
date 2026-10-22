import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useQueueStore } from '@/store/queueStore'
import { isPlayableInQueue, openLiveVideoInNewTab } from '@/lib/liveVideo'
import { setSelahMenu } from '@/lib/selahMenu'
import { getReadingCategories, getReadingCategory, getReadingLatest } from '@/lib/api'

// 독서 조회 훅. 백엔드 미배포/빈 응답은 화면에서 "준비 중"으로 처리하므로 retry는 끈다.
export const READING_LATEST_LIMIT = 1
export const READING_LATEST_DAYS = 7

export function useReadingCategories() {
  return useQuery({ queryKey: ['reading', 'categories'], queryFn: getReadingCategories, retry: false })
}

export function useReadingCategory(id: string | undefined) {
  return useQuery({
    queryKey: ['reading', 'category', id],
    queryFn: () => getReadingCategory(id!),
    enabled: !!id,
    retry: false,
  })
}

export function useReadingLatest() {
  return useQuery({
    queryKey: ['reading', 'latest'],
    queryFn: () => getReadingLatest({ limit: READING_LATEST_LIMIT, days: READING_LATEST_DAYS }),
    retry: false,
  })
}

/** 책 표지(세로 5:7). 상대경로(/books/..)는 사이트 루트(BASE_URL) 기준으로 푼다. 없으면 fallback(첫 회차 16:9 썸네일) */
export function readingCover(thumbnail?: string | null, fallback?: string | null): string | null {
  const t = thumbnail || fallback
  if (!t) return null
  if (/^(https?:)?\/\/|^data:/.test(t)) return t
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${t.replace(/^\//, '')}`
}

export function fmtReadingDuration(s?: number | null) {
  if (!s || s <= 0) return null
  const total = Math.floor(s)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

interface ReadingQueueVideo {
  id: string
  youtubeId?: string | null
  title: string
  thumbnail: string | null
  tag?: string | null
  duration?: number | null
  isSecret?: boolean | null
  isLive?: boolean | null
}

/**
 * 독서 회차 재생. 큐 = 넘겨준 목록 중 재생 가능 항목, 탭한 회차부터.
 * 플레이어는 설교와 같은 장문 오디오 동작(이어듣기·배속)을 쓰도록 type을 'SERMON'으로 싣고, 경로만 /reading/player 로 분리한다.
 * categoryId/Title(=책)은 라우터 state로 넘겨 새로고침 시 PlayerPage가 책 단위로 큐를 복원한다.
 */
export function usePlayReading() {
  const navigate = useNavigate()
  const setQueue = useQueueStore((s) => s.setQueue)
  return (videos: ReadingQueueVideo[], video: ReadingQueueVideo, category: { id: string; title: string }) => {
    if (openLiveVideoInNewTab(video)) return
    const playable = videos.filter(isPlayableInQueue)
    const ids = playable.map((v) => v.id)
    const metas = playable.map((v) => ({
      id: v.id,
      youtubeId: v.youtubeId,
      title: v.title,
      thumbnail: v.thumbnail,
      tag: v.tag ?? null,
      type: 'SERMON',
      hymnTitle: v.title,
      duration: v.duration ?? null,
      playerPath: `/reading/player/${v.id}`,
      isSecret: v.isSecret ?? null,
      isLive: v.isLive ?? null,
      categoryId: category.id,
      categoryTitle: category.title,
    }))
    setSelahMenu('/reading')
    setQueue(ids, Math.max(0, ids.indexOf(video.id)), metas)
    navigate(`/reading/player/${video.id}`, { state: { categoryId: category.id, categoryTitle: category.title } })
  }
}
