# AudioContext

파일: `src/contexts/AudioContext.tsx`  
Provider: `<AudioProvider>` — `App.tsx` 최상단에서 전체를 감싼다.

## 역할

전역 오디오/영상 재생 상태 관리. `useAudio()` 훅으로 모든 컴포넌트에서 접근.

## 두 가지 재생 모드

| 모드 | 내부 구현 | 전환 |
|------|----------|------|
| `audio` | Provider DOM에 상시 마운트된 `HTMLAudioElement` (audioRef) | `settingsStore.mediaMode` |
| `video` | `<video>` element (reactPlayerRef) + DASH(shaka-player) — `src/lib/dashPlayer.ts` | 동일 |

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
  
  // refs (video 모드용 DOM 연결)
  reactPlayerRef: RefObject<HTMLVideoElement | null>
  videoSlotRef: RefObject<HTMLDivElement | null>
  
  // 액션
  playVideo(video, options?): Promise<void>
  //   options: { autoPlay?, skipRecentAdd?, seekTo?, resume? }
  //   resume=true 는 "듣던 트랙을 그 위치에서 이어 연다"는 내부 재진입 표시
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

- audio 모드: `/audios/:id/stream`이 준 CDN URL을 `audioRef.current.src`에 직접 설정
- video 모드: `/videos/:id/manifest`의 MPD 전문을 blob URL로 만들어 shaka에 로드.
  **`<video>`의 `src`는 shaka가 소유한다** — React(Layout)에서 `src`를 세팅하면 안 된다.
  YouTube가 muxed 포맷 제공을 끊어 `/videos/:id/stream`(단일 progressive URL)으로는
  화면이 안 나오고 오디오 폴백만 온다.
- `autoNextProgress`: 자동 다음 곡 카운트다운 (0→1). null이면 비활성
- 설교 캐시 미스: 스트림 즉시 재생, 실제 `playing` 상태 확인 후 다운로드 시작
- 설교 `seek`/`seekBy`/`seekFraction`: 오디오 모드에서는 다운로드 완료 후 로컬 파일로
  전환된 경우만 동작. **비디오 모드(DASH)는 저장 파일 없이도 구간 이동이 되므로 제한 없음.**
- 설교를 **새로 열 때**의 이어듣기 위치는 오디오 스트림 분기에서 무시된다(스트림은 구간
  이동 불가). 단 `resume: true`로 들어온 **같은 트랙의 내부 재진입**(다운로드 완료 후
  로컬 전환, 캐시 재생 실패 후 스트림 폴백)은 타입과 무관하게 위치를 존중한다 —
  이게 없으면 설교만 다운로드 완료 시 0초로 되감긴다.
- 모바일 동적 오디오: `src` 설정 후 `load()`, `canplay`에서 보류된 자동재생 재시도
- 모바일 오디오 엘리먼트: `new Audio()` 분리 객체 대신 Provider DOM에 숨김 마운트
- 스트림이 8초 안에 시작되지 않으면 다운로드를 시작해 로컬 재생 복구 경로 유지
- **비디오 모드는 오프라인 저장을 하지 않는다**(DASH는 저장할 단일 파일이 없음).
  다운로드 버튼·자동 다운로드는 `offlineMediaOk`(= `isOfflineMediaSupported() && mediaMode !== 'video'`)
  하나로 꺼진다. 오디오 모드 다운로드는 그대로 유지.
- shaka `error` 이벤트는 `handleDashError`로 기존 에러 UX(`error` state → PlayerPage 배너)에
  연결된다. 로드 취소 코드(7000 LOAD_INTERRUPTED / 7001 OPERATION_ABORTED)는 정상 흐름이라 걸러낸다.
- **비디오 모드에서 `<audio>`의 error는 무시한다.** 재생은 shaka가 `<video>`에서 하므로
  쓰이지 않는 `<audio>`의 error를 배너로 올리면 정상 재생 위에 "재생 오류"가 뜬다.
  `src`가 빈 문자열일 때 나는 error(code 4)도 무시한다 — effect cleanup·모드 전환의
  `audio.src = ''`가 원인이며 실제 재생 실패가 아니다. React StrictMode는 **dev에서만**
  이펙트를 2회 실행해 이 경로를 매 로드마다 밟게 하므로, 이 가드가 없으면 dev에서만
  재생 오류 배너가 뜨고 프로덕션 빌드에서는 안 뜨는 혼란스러운 증상이 된다.
- **duration 권위는 DB 값이다.** MPD의 `mediaPresentationDuration`으로 덮어쓰지 않는다
  (Safari가 일부 AAC를 2배로 디코드하는 문제 때문에 도입된 규칙).

## 앱 강제 업데이트

`SettingsPage`의 `앱 업데이트`는 Cache Storage와 Service Worker 등록을 제거한 뒤,
캐시버스트 URL로 최신 index를 네트워크에서 받아 다시 실행한다. OPFS/IndexedDB 저장
미디어, 설정, 재생목록은 유지한다.
