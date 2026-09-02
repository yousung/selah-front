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

- `theme` 변경 시 `ThemeApplicator`(App.tsx)가 `document.documentElement` 에 `dark` class 토글

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
| `<id>-audio` | 사용 중 — 오디오 모드 오프라인 저장 |
| `<id>-video` | **더 이상 생성되지 않음.** 비디오 모드가 DASH 스트림 전용이 되며 폐기 |

비디오 모드는 DASH(여러 트랙을 MSE로 합성)라 저장할 단일 파일이 없어 오프라인 저장을
하지 않는다. 남아 있던 `-video` 엔트리는 앱 부팅 시 `reconcileMediaStore()`(`mediaStore.ts`)가
파일과 함께 제거한다.

액션: `refresh()` — IDB에서 완료 엔트리를 다시 읽어 `cachedIds` 갱신

## adminAuthStore (`admin-auth`)

파일: `src/store/adminAuthStore.ts`

```ts
interface AdminUser { id, email, name: string | null, role: string }
interface AdminAuthState { accessToken: string | null; user: AdminUser | null }
```

액션: `setAuth(token, user)`, `clearAuth()`, `isAuthenticated()→boolean`

JWT accessToken 저장. `adminApi.ts` 인터셉터가 직접 localStorage 읽어 주입.
