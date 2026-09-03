# API Layer

파일: `src/lib/`

## api.ts — 공개 API

```ts
export const api = axios.create({
  baseURL: VITE_API_BASE_URL || 'https://e41cinm9d8.execute-api.ap-northeast-2.amazonaws.com/prod',
  timeout: 10000,
})
```

인증 없음. 사용자 앱 전용.

## adminApi.ts — 관리자 API

```ts
export const adminApi = axios.create({
  baseURL: 같은 VITE_API_BASE_URL,
  timeout: 15000,
  withCredentials: true,  // refresh cookie
})
```

**Request 인터셉터**: localStorage `admin-auth` 에서 `state.accessToken` 읽어 `Authorization: Bearer <token>` 주입.

**Response 인터셉터 (401 처리)**:
1. `/admin/thelc/auth/` URL → 즉시 login 리디렉션
2. 그 외 401 → `POST /admin/thelc/auth/refresh` (httpOnly cookie 사용)
3. 성공 시 새 token을 localStorage 업데이트 후 원 요청 재시도
4. 여러 동시 요청: `failedQueue` 패턴으로 한 번만 refresh
5. refresh 실패 → `admin-auth` 제거 + login 리디렉션

## 미디어 재생 엔드포인트 소비

백엔드는 미디어 바이트를 절대 프록시하지 않는다 — 항상 작은 JSON만 준다.
실제 바이트는 클라이언트가 그 CDN/Invidious URL로 직접 받는다.

| 엔드포인트 | 응답 | 소비처 |
|-----------|------|--------|
| `GET /audios/:id/stream?quality=` | `{ url, bitrate, encoding?, duration? }` | `AudioContext` → `<audio>.src` |
| `GET /audios/:id/download?quality=high` | `{ url, bitrate?, duration?, mimeType? }` | `PlayerPage.handleDownload` → `downloadMedia()` |
| `GET /videos/:id/manifest` | `{ manifest, duration, mimeType }` | `AudioContext` → `dashPlayer.loadDash()` |

`/videos/:id/manifest`는 DASH MPD **전문**을 문자열로 준다(`Cache-Control: no-store`).
모든 `<BaseURL>`이 백엔드에서 이미 절대 URL(`https://youtube.lovizu.com:443/videoplayback?...`)로
치환돼 있으므로 **프론트에서 추가 치환하지 않는다.** blob URL로 만들어 shaka에 넘긴다.

`/videos/:id/stream`(단일 progressive URL)은 더 이상 재생에 쓰지 않는다 — YouTube가 muxed
포맷 제공을 끊어 오디오 폴백만 오기 때문(화면이 회색). `/videos/:id/download`도 비디오
오프라인 저장 제거와 함께 소비처가 없다.

`/videos/:id/manifest`는 **비디오 모드 전용이 아니다.** Safari 계열은 오디오 모드에서도 이걸
받아 `<audio>`에 DASH로 로드한다(fragmented MP4를 progressive로 못 읽는 문제 — `audio.md`).

## dashPlayer.ts — shaka 래퍼

```ts
isDashSupported(): Promise<boolean>                                  // MSE/MMS 가능 여부(+shaka 지연 로드)
ensureDashPlayer(el: HTMLMediaElement, onError): Promise<void>       // 싱글턴 Player를 el에 attach
loadDash(manifest: string, mimeType: string, startTime?): Promise<void>
unloadDash(): Promise<void>                                          // 재생만 내림(attach 유지)
destroyDash(): Promise<void>                                         // detach + Player 파괴
isDashAttached(el: HTMLMediaElement | null | undefined): boolean
isDashAbortError(err): boolean                                       // 7000/7001 = 정상 흐름
```

- `el`은 `<video>`와 `<audio>` **둘 다** 받는다. 싱글턴이 두 엘리먼트 사이를 오갈 수 있으므로
  `ensureDashPlayer`는 다른 엘리먼트에 붙어 있으면 먼저 `detach()`한다. detach가 이전
  엘리먼트의 MediaSource·`<source>` 자식·`disableRemotePlayback`을 정리하기 때문에,
  그 엘리먼트에 다시 `src`를 쓰는 progressive 경로가 살아난다.
- attach 직후 `configure({ manifest: { disableVideo: el.nodeName === 'AUDIO' } })`로
  오디오 전용을 명시한다(실측: 오디오 재생 중 네트워크 요청은 `itag=140`뿐,
  video itag 136/134/160 요청 0건).
- **`isDashAttached(el)`가 참이면 밖에서 `el.src`를 쓰면 안 된다.** `unload()`는 src를 비우되
  attach는 유지하므로 src 유무로는 판별할 수 없다. `<audio>`에서 progressive로 돌아가려면
  `destroyDash()`까지 해야 한다.

## mediaUnlock.ts — iOS 제스처 언락

```ts
primeMediaElement(el: HTMLMediaElement | null | undefined): void
```

iOS WebKit은 **엘리먼트마다** "사용자 제스처 처리 중 `play()`가 한 번 호출됐는가"를 요구한다.
`AudioContext.playVideo()`는 스트림 URL/매니페스트를 `await`로 받은 **뒤에** `play()`를 부르므로
그 시점엔 제스처 태스크 밖이라 `NotAllowedError`로 막힌다(첫 탭 무음 → 두 번째 탭부터 재생).

`playVideo()`의 **첫 `await` 이전**(= 아직 제스처 태스크 안)에서 무음 WAV로 `play()`를 한 번 불러
미리 언락한다. 곧바로 `removeAttribute('src')` + `load()`로 되돌리는데, `load()`가 큐잉된
`play`/`loadedmetadata`/`durationchange` 태스크까지 취소하므로 무음 WAV의 길이가 앱 상태에
새어들지 않는다(실측 — Chrome·WebKit 모두 `emptied` 이벤트만 발생, 엘리먼트는 EMPTY로 복귀).

- `isIOS()`(`platform.ts`)로 게이트한다 — Android/데스크탑 크롬은 기존 경로 그대로.
- 옛 `src`를 무음으로 덮으므로 트랙 전환 시 이전 곡이 새어나오지 않는다.
- shaka가 소유(attach)한 엘리먼트는 건드리면 MediaSource가 깨지므로
  `dashPlayer.isDashAttached(el)`로 걸러낸다. attach 상태면 이미 앞선 재생으로 언락돼 있다.
  **`<audio>`에도 같은 가드가 필요하다** — Safari 오디오는 DASH로 재생하므로 가드가 없으면
  두 번째 곡부터 shaka가 붙은 `<audio>`에 무음 WAV를 써서 재생이 죽는다.

⚠️ **이 프라이머가 실기기 증상의 원인을 고친다는 확증은 없다.** iOS 26.5 시뮬레이터 실측에서는
프라이머 없이도 await 후 `play()`가 성공했다(WebKit 16.4+의 transient activation은 약 5초 창이라
수백 ms 갭으로 안 끊긴다). 시뮬레이터가 엘리먼트별 제약을 강제하지 않아 재현이 안 되는 것인지
원인이 딴 데 있는지는 미결이며, 판정은 아래 `PlayAttempt` 실기기 데이터로 한다.

## mediaDiag.ts — `PlayAttempt` (첫 play() 시도 기록)

`setLastPlayAttempt()`가 `playVideo()`의 세 재생 경로(`cache`/`stream`/`dash`)에서
**호출 직전(pending) + settle 후(결과)** 두 번 기록한다. `MediaDebugOverlay`(`?debug=1` 또는
`localStorage['selah-debug']='1'`)와 `toText()` 리포트에 노출된다.

`ok` 3-상태가 핵심이다 — 이걸 구분 못 하면 원인을 못 좁힌다:

| `ok` | 의미 | 다음에 볼 것 |
|---|---|---|
| `false` + `errorName='NotAllowedError'` | 자동재생/제스처 정책에 막힘 | `userActivation`, `primed` |
| **`null` (pending)** | promise가 안 끝남 = **재생이 시작조차 못 함**(정책 문제 아님) | `readyState`, `networkState` |
| `true` | play() 통과. 그래도 무음이면 정책 문제가 아니다 | 출력/버퍼링 쪽 |

`play()`의 promise는 실제 재생이 시작돼야 resolve되므로, 버퍼링에 걸리면 **영원히 pending**이다.
같이 남기는 값: `readyState` `networkState` `mediaErrorCode` `userActivation` `primed`
`isPwa` `iosStandalone`(`navigator.standalone`) `iosVersion`(`platform.iosVersion()` — 진단 전용,
**분기 판정에 쓰지 말 것**).

## selahMenu.ts — 세션 유틸

```ts
// sessionStorage 키: 'selah-menu'
setSelahMenu(path: string)
getSelahMenu(): string | null
clearSelahMenu()
```

현재 메뉴 경로를 세션 스토리지에 임시 저장하는 유틸.

## 주의

- `VITE_API_BASE_URL` 미설정 시 두 클라이언트 모두 동일한 AWS 엔드포인트 사용
- 로컬 개발: Vite proxy `/api` → `http://localhost:3000` (인증 없는 api.ts는 proxy 통해 호출 가능)
- adminApi는 `withCredentials: true` 필수 (refresh token이 httpOnly cookie)
