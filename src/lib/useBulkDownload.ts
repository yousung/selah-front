import { useCallback, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useSettingsStore } from '@/store/settingsStore'
import { useCachedMediaStore } from '@/store/cachedMediaStore'
import { isPlayableInQueue } from '@/lib/liveVideo'
import { downloadMedia, downloadVideoWithAudio, isOfflineMediaSupported, cancelDownload, deleteMedia } from '@/lib/mediaStore'
import type { VideoDownloadInfo } from '@/lib/mediaStore'

/**
 * 목록 화면(설교 카테고리·찬송·독서 책)의 "선택 → 일괄 다운로드" 공용 훅.
 * 사용자가 직접 고른 항목만 받는다(자동 다운로드 없음). UI는 `components/BulkDownload.tsx`.
 */
export function useBulkDownload() {
  const mediaMode = useSettingsStore((s) => s.mediaMode)
  const offlineStorageMode = useSettingsStore((s) => s.offlineStorageMode)
  const videoDownloadQuality = useSettingsStore((s) => s.videoDownloadQuality)
  const { cachedIds, refresh } = useCachedMediaStore()
  // 오디오 모드는 오디오 파일, 비디오 모드는 영상+소리 두 파일(`downloadVideoWithAudio`)을 저장한다.
  // 절약 모드·미지원 환경에서는 다운로드 UI 자체를 숨긴다.
  const enabled = isOfflineMediaSupported() && offlineStorageMode !== 'thrift'
  const dlType = mediaMode === 'video' ? 'video' as const : 'audio' as const
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  // 벌크(2개 이상) 다운로드 모달 상태 — null이면 모달 없음
  const [bulkState, setBulkState] = useState<{ total: number; done: number } | null>(null)
  const bulkIdsRef = useRef<string[]>([])
  const bulkCancelledRef = useRef(false)

  /** 선택 가능한 항목인가: 방송중·비공개·임시(미공개) 제외, 이미 저장된 것 제외 */
  const pickable = useCallback((v: { id: string; isLive?: boolean | string | null; isSecret?: boolean | string | null; isTemp?: boolean | string | null }) =>
    enabled && isPlayableInQueue(v) && !(v.isTemp === true || v.isTemp === 'true') && !cachedIds.has(`${v.id}-${dlType}`),
  [enabled, cachedIds, dlType])

  const toggleSelect = useCallback((videoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(videoId)) next.delete(videoId)
      else next.add(videoId)
      return next
    })
  }, [])

  /** 전부 선택돼 있으면 해제, 아니면 주어진 id 전체 선택 */
  const selectAll = useCallback((ids: string[]) => {
    setSelected((prev) => (prev.size === ids.length && ids.length > 0 ? new Set() : new Set(ids)))
  }, [])

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelected(new Set())
  }, [])

  const handleBulkDownload = useCallback(async () => {
    if (!enabled) return
    const ids = Array.from(selected).filter((videoId) => !cachedIds.has(`${videoId}-${dlType}`))
    if (ids.length === 0) return
    bulkIdsRef.current = ids
    bulkCancelledRef.current = false
    setDownloadingIds(new Set(ids))
    setBulkState({ total: ids.length, done: 0 })
    setSelectMode(false)
    setSelected(new Set())

    // 한 번에 하나씩(순차) 다운로드. 동시 다운로드는 같은 Invidious 프록시에 부하를 줘
    // throttle/500을 유발하므로 병렬 없이 한 개씩 처리한다.
    // 실패(폴백 스트림 503 등)는 재시도 후 조용히 포기하고 해당 항목만 대기 상태로 돌아간다.
    const CONCURRENCY = 1
    let cursor = 0
    const worker = async () => {
      while (cursor < ids.length && !bulkCancelledRef.current) {
        const videoId = ids[cursor++]
        let success = false
        for (let attempt = 0; attempt < 3 && !success && !bulkCancelledRef.current; attempt++) {
          try {
            if (dlType === 'video') {
              const { data } = await api.get<VideoDownloadInfo>(
                `/videos/${videoId}/download`,
                { params: { quality: videoDownloadQuality } },
              )
              await downloadVideoWithAudio(videoId, data)
            } else {
              const { data } = await api.get<{ url: string; mimeType?: string }>(
                `/audios/${videoId}/download`,
                { params: { quality: 'high' } },
              )
              await downloadMedia(videoId, data.url, { type: dlType, mimeType: data.mimeType })
            }
            refresh()
            success = true
          } catch {
            if (attempt < 2 && !bulkCancelledRef.current) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
          }
        }
        setDownloadingIds((prev) => {
          const next = new Set(prev)
          next.delete(videoId)
          return next
        })
        setBulkState((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker))

    if (!bulkCancelledRef.current) setBulkState(null)
    refresh()
  }, [selected, dlType, enabled, cachedIds, refresh, videoDownloadQuality])

  const handleBulkCancel = useCallback(async () => {
    bulkCancelledRef.current = true
    // 진행 중 다운로드 즉시 중단
    for (const videoId of bulkIdsRef.current) cancelDownload(videoId, dlType)
    // 이번 배치에서 받은 것(완료분 포함) 모두 삭제. 소유권 기반이라 비디오 배치를 취소해도
    // 오디오 모드로 따로 저장해 둔 오디오는 남는다(mediaStore `deleteMedia`).
    await Promise.all(
      bulkIdsRef.current.map((videoId) => deleteMedia(videoId, dlType).catch(() => {})),
    )
    setDownloadingIds(new Set())
    setBulkState(null)
    refresh()
  }, [dlType, refresh])

  return {
    enabled, dlType, cachedIds,
    selectMode, setSelectMode, selected, downloadingIds, bulkState,
    pickable, toggleSelect, selectAll, exitSelectMode, handleBulkDownload, handleBulkCancel,
  }
}

export type BulkDownload = ReturnType<typeof useBulkDownload>
