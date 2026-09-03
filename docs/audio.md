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

### 재생 경로는 3-상태다 (모드 2개가 아니다)

같은 `<audio>`라도 progressive(`src=스트림 URL`)와 DASH(shaka가 MediaSource 소유)는 성질이
다르므로, `mediaMode`나 `isVideoPlayback()` 2-상태만으로는 갈라지지 않는다.

| 경로 | 재생 엘리먼트 | 판정 | src 소유 |
|------|--------------|------|---------|
| progressive 오디오 | `<audio>` | 위 둘 다 거짓 | 앱(`audio.src = url`) |
| **DASH 오디오** | `<audio>` | `dashOnAudioRef.current` | **shaka** |
| DASH 비디오 | `<video>` | `isVideoPlayback()` | **shaka** |

- `dashOnAudioRef` — "이번 재생을 DASH 오디오로 하기로 했다"는 **의도** 플래그.
  DASH 분기의 **첫 `await` 이전**에 켠다(로드 성공 후에 켜면 매니페스트 왕복 중에 끼어드는
  `MEDIA_DOWNLOADED` 재진입이 false를 보고 캐시 경로로 들어가 충돌한다).
- `dashPlayer.isDashAttached(el)` — shaka가 실제로 그 엘리먼트를 물고 있는가(**물리 상태**).
  `audio.src`를 쓰는 모든 지점의 가드는 이쪽을 쓴다.

### Safari 계열 오디오는 DASH로 재생한다

Invidious 오디오 스트림(itag 140)은 fragmented MP4라 Safari(AVFoundation)가 progressive로
스트리밍하지 못하고 **파일을 끝까지 받아야** 재생을 시작한다(iOS 실측 27.8초, 데스크탑
Safari도 readyState가 25초간 0). MSE로 먹이면 shaka가 `sidx`로 필요한 레인지만 받는다.

- 게이트: `!isVideoMode && (isIosWebKit() || isDesktopSafari()) && await isDashSupported()`.
  UA 판정을 먼저 평가해야 비-Safari가 shaka 청크(gzip 267KB)를 내려받지 않는다.
  `isDesktopSafari()`가 iPadOS의 데스크탑 UA도 잡는다.
- 실패 시 기존 progressive 경로로 폴백한다(`destroyDash()`로 detach한 뒤 `audio.src`).
- 비디오 트랙은 shaka가 `<audio>`에 붙으면 `manifest.disableVideo`를 자동으로 켜서
  아예 파싱하지 않는다. **`restrictions.maxHeight = 0`을 쓰면 안 된다** — 이 매니페스트는
  audio×video 조합 variant만 있어서 전부 제한되면 `RESTRICTIONS_CANNOT_BE_MET`(4012)이 난다.
- `disableRemotePlayback`은 **손으로 건드리지 않는다.** shaka가 ManagedMediaSource를 만들 때
  true로, destroy할 때 false로 되돌린다(`media_source_engine.js`). JSX에 박아두면
  progressive 경로로 돌아왔을 때도 AirPlay가 죽는다.

### 다운로드 완료 재진입(`MEDIA_DOWNLOADED`)

DASH로 재생 중이면 로컬 파일로 **갈아타지 않는다**(`dashOnAudioRef` 가드). 이 경로의 원래
목적("progressive는 느리고 seek이 안 되니 저장 파일로 바꾼다")이 DASH에서는 이미 해결돼
있고, 갈아타려면 shaka를 내리고 `<audio src>`를 새로 물려야 해서 그 순간 끊긴다.
파일은 저장돼 있으므로 **다음 재생부터** 캐시 경로로 들어간다.

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
  streamSeekable: boolean   // 저장 파일 없이도 구간 이동이 되는가(= DASH/MSE로 재생 중인가)
  
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
- 설교 `seek`/`seekBy`/`seekFraction`: 저장 파일로 재생 중이거나 **DASH/MSE로 재생 중**일 때만
  동작한다. 판정은 `mediaMode`가 아니라 `streamSeekable`(ref+state 한 쌍) 하나로 한다 —
  PlayerPage의 버튼 활성 조건(`canSeek`)과 `isSeekBlocked()`의 실동작이 **같은 값**을 봐야
  어긋나지 않는다. 모드로 갈랐던 예전 판정은 두 경우를 틀리게 답했다: MSE 미지원 기기의
  비디오 모드는 실제로 오디오 스트림 폴백이라 seek이 안 되는데 버튼만 켜져 있었고,
  Safari 오디오는 DASH라 seek이 되는데 버튼이 꺼져 있었다.
  `streamSeekable`은 `playVideo` 진입 시 false로 리셋하고 DASH 로드 성공 분기에서만 켠다.
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
  단 **shaka가 붙어 있을 땐 `src` 속성이 아니라 `currentSrc`로 판정한다** — shaka 5.x는
  MediaSource를 `<source>` 자식으로 붙여서 정상 재생 중에도 `getAttribute('src')`가 null이다
  (실측 확인). 속성으로 걸렀다면 DASH의 진짜 에러를 전부 삼켜 무음만 남았을 것이다.
- **`load()`는 `playbackRate`를 `defaultPlaybackRate`(=1)로 되돌린다.** 스트림 경로는
  `audio.src = url` → `applyPlaybackRate` → `load()` 순서라 설정한 배속이 곧바로 지워졌다
  (2.4.34 실측: 설정 1.5x인데 스트림 재생은 rate=1, 저장 파일 재생만 1.5x). `canplay`에서
  `applyPlaybackRate`를 다시 부르는 것으로 모든 로드 경로를 덮는다(`<video>`의
  `onVideoCanPlay`와 대칭). shaka는 외부 `playbackRate` 변경을 `ratechange`로 받아
  내부 `PlayRateController`에 동기화하므로 리버퍼링 후에도 배속이 보존된다(실측 확인).
- **duration 권위는 DB 값이다.** MPD의 `mediaPresentationDuration`으로 덮어쓰지 않는다
  (Safari가 일부 AAC를 2배로 디코드하는 문제 때문에 도입된 규칙).

## 앱 강제 업데이트

`SettingsPage`의 `앱 업데이트`는 Cache Storage와 Service Worker 등록을 제거한 뒤,
캐시버스트 URL로 최신 index를 네트워크에서 받아 다시 실행한다. OPFS/IndexedDB 저장
미디어, 설정, 재생목록은 유지한다.
