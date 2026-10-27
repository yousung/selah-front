# Zustand Stores

모든 스토어 `zustand/middleware` `persist` 사용 → localStorage 저장.

## settingsStore (`selah-settings`)

파일: `src/store/settingsStore.ts`

| 상태 | 타입 | 기본값 |
|------|------|--------|
| `theme` | `'light' \| 'dark'` | `'light'` |
| `quality` | `'high' \| 'medium' \| 'low'` | `'high'` |
| `mediaMode` | `'audio' \| 'video'` | `'audio'` |
| `autoPlayOnDetail` | `boolean` | `true` |
| `autoNextDelay` | `'immediate' \| '3s' \| '5s' \| 'off'` | `'3s'` |
| `playMode` | `'single' \| 'playlist' \| 'repeat' \| 'loop'` | `'playlist'` |
| `playbackRate` | `number` | `1` |
| `videoDownloadQuality` | `'360p' \| '720p'` | `'360p'` |
| `fontScale` | `1 \| 1.5 \| 2` | `1` |
| `occupation` | `'worker' \| 'homemaker' \| 'student' \| 'pastor' \| null` | `null` |

- `theme` 변경 시 `ThemeApplicator`(App.tsx)가 `document.documentElement` 에 `dark` class 토글
- `fontScale`은 `Layout` 사용자 영역의 `--font-scale`로 전달되어 본문·내비게이션·하위 오버레이에 적용된다. 관리자 UI는 별도 영역이다.
- `occupation`(설정 → 표시 → 직업, 라벨 맵 `OCCUPATION_LABELS`: 직장인/주부/학생/목사)은 로컬 전용이며 `lib/currentPrayer.ts`의 일과 기도 하위 기도 선택에만 쓴다. `null`(미설정)은 직장인으로 취급하고 설정 화면에서도 직장인이 선택된 것으로 보인다.
- `videoDownloadQuality`(설정 → 저장 · 데이터 → 비디오 저장 화질)는 비디오 모드 저장 시 `/videos/:id/download?quality=`로 넘기는 화질 상한이다. 480p는 av01 전용(iOS 불가)이라 선택지에 없다. 버전 올림 없이 추가했다(persist가 저장값을 기본값 위에 얕게 병합).
- persist `version: 2` — `migrate`가 기존 필드를 그대로 두고 `occupation: null`을 채우며, v2에서 제거된 `autoDownload`(UI 없던 토글 — 재생 시 자동 저장은 토글 없이 항상 동작, `audio.md` 참조)는 옛 저장값에서 버린다.

## queueStore (`selah-queue`)

파일: `src/store/queueStore.ts`

현재 재생 큐 (서버 플레이리스트 기반).

```ts
interface VideoMeta {
  id: string; title: string; thumbnail: string | null
  tag: string | null; hymnTitle?: string | null
  duration?: number | null; chapter?: number | null
}
interface QueueState {
  ids: string[]     // 재생 순서 id 배열
  videos: VideoMeta[] // 메타데이터 캐시
  index: number      // 현재 재생 위치 (-1 = 없음)
}
```

액션: `setQueue(ids, index, videos?)`, `clearQueue()`

## playlistStore (`selah-playlists`)

파일: `src/store/playlistStore.ts`

사용자가 직접 만든 재생목록 (서버 독립적, localStorage only).

```ts
interface PlaylistVideo { id, title, thumbnail, tag, hymnTitle?, duration? }
interface UserPlaylist { id: string; name: string; videos: PlaylistVideo[] }
```

액션: `addPlaylist(name)→id`, `removePlaylist(id)`, `renamePlaylist(id, name)`,
`addVideoToPlaylists(video, playlistIds)`, `removeVideoFromPlaylist(videoId, playlistId)`,
`reorderVideos(playlistId, videos)`, `isInAnyPlaylist(videoId)`,
`isInPlaylist(videoId, playlistId)`, `getPlaylistsForVideo(videoId)`

- 버전 마이그레이션: `version: 1`

## recentStore (`selah-recent`)

파일: `src/store/recentStore.ts`

```ts
interface RecentItem { id, title, thumbnail, tag, hymnTitle?, duration?, chapter?, playedAt: number }
```

액션: `add(video)` — 최대 30개 유지, 중복 시 갱신  
액션: `clear()`

## durationStore (`selah-durations`)

파일: `src/store/durationStore.ts`

영상별 실제 재생 시간 캐시 (`byId: Record<string, number>`).  
`AudioContext`가 실제 재생 중 확인한 duration 저장. DB 값과 다를 때 보정용.

액션: `setDuration(id, duration)` — 0 이하·비유한 값 무시

## cachedMediaStore (localStorage 아님 — OPFS/IndexedDB)

파일: `src/store/cachedMediaStore.ts`, 실제 저장은 `src/lib/mediaStore.ts`

오프라인 저장된 미디어의 캐시키 집합(`cachedIds: Set<string>`)을 들고 있다.
캐시키는 `` `${videoId}-${type}` `` 형태다.

| 캐시키 | 상태 |
|--------|------|
| `<id>-audio` | 오디오 모드 저장 파일, 또는 비디오 저장의 짝 소리 파일(audio-only, 공유 가능) |
| `<id>-video` | 비디오 모드 저장 파일(video-only, avc1 mp4). 재생엔 짝 `<id>-audio`가 반드시 필요 |

비디오 모드 저장은 muxed가 없어 **두 파일**(video-only + audio-only)을 받고, 재생할 때
`buildLocalDashManifest()`가 둘을 로컬 DASH로 묶는다(`api.md` mediaStore 절).

`FileEntry` 비디오 저장 필드:
- `track?: { mimeType, init, index, bitrate, width?, height?, duration? }` — SegmentBase 범위 등 로컬 매니페스트 재료. `-video`와 짝 `-audio`에 있다.
- `ownedBy?: ('audio'|'video')[]` — `-audio`를 저장한 주체. 없으면 `['audio']`(이 필드 이전 저장분 포함).
  비디오 저장이 오디오 모드 저장분을 재사용하면 `['audio','video']`, 비디오로만 받았으면 `['video']`.

`cachedIds`에서는 비디오 전용 짝 오디오(`ownedBy: ['video']`)를 뺀다 — 오디오 모드 기준으론 "저장됨"이 아니다
(오디오 모드에서 저장하면 파일은 그대로 두고 'audio' 소유만 더한다).

부팅 시 `reconcileMediaStore()`가 `track` 없는 옛 `-video`, 짝 오디오 없는 `-video`, `-video` 없는 비디오 전용 오디오를 정리한다.

액션: `refresh()` — IDB에서 완료 엔트리를 다시 읽어 `cachedIds` 갱신

`FileEntry.meta?`(`{title, thumbnail, type}`)는 저장 목록(`/settings/saved`) 표시용이다. 다운로드 시점이 아니라
목록 첫 조회 때 `/videos/:id`로 받아 `setMediaMeta()`로 기록하며, 이후엔 오프라인에서도 제목이 보인다.
개별 삭제는 `deleteMedia(id, kind)` 후 `refresh()` — 소유권 기반이라 비디오 행 삭제는 비디오만 쓰던 짝 오디오까지 지우고,
오디오 모드로 따로 저장한 오디오는 남긴다. 저장 목록은 비디오 전용 짝 오디오 행을 숨기고 비디오 행 크기에 합산한다.

## adminAuthStore (`admin-auth`)

파일: `src/store/adminAuthStore.ts`

```ts
interface AdminUser { id, email, name: string | null, role: string }
interface AdminAuthState { accessToken: string | null; user: AdminUser | null }
```

액션: `setAuth(token, user)`, `clearAuth()`, `isAuthenticated()→boolean`

JWT accessToken 저장. `adminApi.ts` 인터셉터가 직접 localStorage 읽어 주입.
