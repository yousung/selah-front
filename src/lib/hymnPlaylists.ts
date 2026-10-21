import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, getFestival, getFestivals, type FestivalDetail } from '@/lib/api'
import { setSelahMenu } from '@/lib/selahMenu'
import { useSettingsStore } from '@/store/settingsStore'
import { useQueueStore } from '@/store/queueStore'
import { useAudio } from '@/contexts/AudioContext'
import { isPlayableInQueue, openLiveVideoInNewTab } from '@/lib/liveVideo'

// 찬송 플레이리스트 조회·재생 — HymnPage와 홈 HomeHymnTile이 같은 queryKey/캐시/재생 순서를 쓰도록 공유

export interface HymnVideo {
  id: string
  youtubeId?: string | null
  title: string
  thumbnail: string | null
  tag: string | null
  chapter?: number | null
  hymnTitle?: string | null
  publishedAt?: string | null
  createdAt?: string | null
  duration?: number | null
  isSecret?: boolean | null
  isTemp?: boolean | null
  isLive?: boolean | null
}

interface PlaylistMeta {
  id: string
  youtubeId?: string | null
  title: string
  thumbnail: string | null
  tag: string | null
  duration?: number | null
  isTemp?: boolean | null
  isSecret?: boolean | null
  isLive?: boolean | null
}

export interface HymnPlaylist {
  id: string
  title: string
  videos: HymnVideo[]
  playlists?: PlaylistMeta[]
}

const HOME_PLAYLISTS_CACHE_KEY = 'home-playlists-cache-v2'
const HOME_RECENT_CACHE_KEY = 'home-recent-playlist-cache-v2'

function getCachedHomeData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data?: T }
    return parsed.data ?? null
  } catch {
    return null
  }
}

function setCachedHomeData<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }))
  } catch {}
}

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

async function withHomeCache<T>(key: string, loader: () => Promise<T>, offlineFallback: T): Promise<T> {
  const cached = getCachedHomeData<T>(key)
  if (isBrowserOffline()) return cached ?? offlineFallback

  try {
    const data = await loader()
    setCachedHomeData(key, data)
    return data
  } catch (err) {
    if (cached != null) return cached
    throw err
  }
}

/** 화면 폭별 플레이리스트당 영상 수(4/6/8). usePlaylists queryKey에 들어가므로 호출부마다 같은 값을 써야 캐시가 공유된다 */
export function useGridLimit() {
  const [limit, setLimit] = useState(() => {
    const w = window.innerWidth
    if (w >= 1024) return 8
    if (w >= 768) return 6
    return 4
  })
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1024) setLimit(8)
      else if (w >= 768) setLimit(6)
      else setLimit(4)
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return limit
}

export function usePlaylists(limit: number, excludeTemp: boolean) {
  const cacheKey = `${HOME_PLAYLISTS_CACHE_KEY}-${excludeTemp ? 'our-church' : 'all'}`
  return useQuery({
    queryKey: ['playlists', limit, excludeTemp],
    queryFn: () => withHomeCache(cacheKey, async () => {
      const { data } = await api.get<HymnPlaylist[]>('/playlists', { params: { limit, excludeTemp } })
      return data
    }, []),
    initialData: () => getCachedHomeData<HymnPlaylist[]>(cacheKey) ?? undefined,
    networkMode: 'always',
  })
}

export function useRecentPlaylist(limit: number, excludeTemp: boolean) {
  const cacheKey = `${HOME_RECENT_CACHE_KEY}-${excludeTemp ? 'our-church' : 'all'}`
  return useQuery<HymnPlaylist | null>({
    queryKey: ['playlists-recent', limit, excludeTemp],
    queryFn: () => withHomeCache(cacheKey, async () => {
      const { data } = await api.get<HymnPlaylist>('/playlists/recent', { params: { limit, excludeTemp } })
      return data
    }, null),
    initialData: () => getCachedHomeData<HymnPlaylist>(cacheKey) ?? undefined,
    networkMode: 'always',
  })
}

/**
 * 찬송 재생 핸들러. playlist를 넘기면 그 플레이리스트(재생 가능 항목)로 큐를 채우고,
 * 생략하면(검색 결과) 큐를 건드리지 않고 단건 재생한다. 라이브는 새 탭, 이미 재생 중이면 플레이어로 이동만.
 */
export function usePlayHymn() {
  const navigate = useNavigate()
  const { playVideo, currentVideo } = useAudio()
  const autoPlayOnDetail = useSettingsStore((s) => s.autoPlayOnDetail)
  const setQueue = useQueueStore((s) => s.setQueue)

  return (v: HymnVideo, playlist?: HymnPlaylist) => {
    if (openLiveVideoInNewTab(v)) return
    setSelahMenu('/hymn')
    if (currentVideo?.id === v.id) {
      navigate(`/player/${v.id}`)
      return
    }
    if (playlist) {
      const visibleIds = new Set(playlist.videos.map((item) => item.id))
      const allItems = (playlist.playlists ?? [])
        .filter(isPlayableInQueue)
        .filter((item) => playlist.id !== 'recent' || visibleIds.has(item.id))
      const allIds = allItems.map(p => p.id)
      const idx = allIds.indexOf(v.id)
      const allVideos = allItems.map(p => ({
        id: p.id,
        youtubeId: p.youtubeId,
        title: p.title,
        thumbnail: p.thumbnail,
        tag: p.tag,
        hymnTitle: null as string | null,
        duration: p.duration,
        isSecret: p.isSecret,
        isLive: p.isLive,
      }))
      setQueue(allIds, idx, allVideos)
    }
    playVideo(
      { id: v.id, youtubeId: v.youtubeId, title: v.title, thumbnail: v.thumbnail, tag: v.tag, chapter: v.chapter, hymnTitle: v.hymnTitle, duration: v.duration, isSecret: v.isSecret, isLive: v.isLive },
      { autoPlay: autoPlayOnDetail },
    )
    navigate(`/player/${v.id}`)
  }
}

export function useFestivals() {
  return useQuery({ queryKey: ['festivals'], queryFn: getFestivals })
}

export function useFestival(year: number | undefined) {
  return useQuery({
    queryKey: ['festivals', year],
    queryFn: () => getFestival(year!),
    enabled: year != null,
  })
}

/**
 * 시편 찬송 모임 연도 → usePlayHymn용 임시 플레이리스트. 큐는 그해 영상만(응답 순서 그대로).
 * 카드에는 팀명(festivalTeam)을 메인 라벨로, "{year} 시편 찬송 모임"을 서브로 보이도록 hymnTitle/title을 바꿔 넣는다.
 */
export function toFestivalPlaylist(festival: FestivalDetail): HymnPlaylist {
  // 출품 영상은 시편찬송 장이 없다(DB 기본값 0) — "0장" 배지가 안 뜨게 chapter를 비운다
  const queue = festival.videos.map((v) => ({ ...v, chapter: null }))
  const videos = queue.map((v) => ({
    ...v,
    hymnTitle: v.festivalTeam || v.title,
    title: `${festival.year} 시편 찬송 모임`,
  }))
  return {
    id: `festival-${festival.year}`,
    title: `${festival.year} 시편 찬송 모임`,
    videos,
    playlists: queue,
  }
}
