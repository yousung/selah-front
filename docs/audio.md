# AudioContext

파일: `src/contexts/AudioContext.tsx`  
Provider: `<AudioProvider>` — `App.tsx` 최상단에서 전체를 감싼다.

## 역할

전역 오디오/영상 재생 상태 관리. `useAudio()` 훅으로 모든 컴포넌트에서 접근.

## 두 가지 재생 모드

| 모드 | 내부 구현 | 전환 |
|------|----------|------|
| `audio` | `HTMLAudioElement` (audioRef) | `settingsStore.mediaMode` |
| `video` | `<video>` element (reactPlayerRef) | 동일 |

`mediaMode` 변경 시 현재 재생 중단 + 상태 초기화.

## Context Value 인터페이스

```ts
{
  // 상태
  currentVideo: VideoInfo | null
  isPlaying: boolean
  isLoading: boolean
  isEnded: boolean
  position: number          // 현재 재생 위치 (초)
  duration: number          // 총 길이 (초)
  autoNextProgress: number | null  // 자동다음 진행률 0~1
  error: string | null
  volume: number
  videoUrl: string | null
  
  // refs (video 모드용 DOM 연결)
  reactPlayerRef: RefObject<HTMLVideoElement | null>
  videoSlotRef: RefObject<HTMLDivElement | null>
  
  // 액션
  playVideo(video, options?): Promise<void>
  stop(): void
  togglePlay(): void
  seek(seconds): void
  seekBy(delta): void        // 상대 이동
  cancelAutoNext(): void
  setVolume(v): void
  
  // video element 이벤트 핸들러 (PlayerPage에서 <video>에 연결)
  onVideoPlay / onVideoPause / onVideoWaiting / onVideoCanPlay
  onVideoTimeUpdate / onVideoLoadedMetadata / onVideoDurationChange
  onVideoEnded / onVideoError
}
```

## 큐 연동

`queueStore` 구독 → `playMode`, `autoNextDelay` 따라 자동 다음 곡 재생.

| playMode | 동작 |
|----------|------|
| `single` | 끝나면 멈춤 |
| `playlist` | 다음 곡으로 이동 |
| `repeat` | 현재 곡 반복 |
| `loop` | 큐 끝나면 처음으로 |

랜덤 재생: `queueStore`에서 `ids` 순서 셔플 후 `setQueue` 호출.

## Duration 처리

1. API 응답의 DB duration 값 (`normalizeDbDuration`)
2. 실제 재생 중 확인한 값으로 `hasAuthoritativeDurationRef` 업데이트
3. `durationStore`에 저장 → 다음 로드 시 즉시 표시

## MediaSession API

재생 시작 시 `navigator.mediaSession.metadata` 업데이트 (잠금화면, 알림바 표시).  
`hymnTitle` 우선, 없으면 `title`에서 `[...]` 제거한 값 사용.

## 주의

- `playVideo()` 호출 시 `api.get('/videos/:id')` 로 영상 URL 조회
- audio 모드: `audioRef.current.src` 직접 설정
- video 모드: `videoUrl` state 업데이트 → PlayerPage의 `<video src={videoUrl}>` 렌더
- `autoNextProgress`: 자동 다음 곡 카운트다운 (0→1). null이면 비활성
- 설교 캐시 미스: 스트림 즉시 재생, 실제 `playing` 상태 확인 후 다운로드 시작
- 설교 `seek`/`seekBy`/`seekFraction`: 다운로드 완료 후 로컬 파일로 전환된 경우만 동작
