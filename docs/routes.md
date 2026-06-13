# Routes

HashRouter 기반 (`#/`). `src/App.tsx` 에서 선언.

## 사용자 라우트 (`Layout` 래퍼)

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | `HomePage` | 홈 피드 |
| `/playlist/:id` | `PlaylistPage` | 서버 플레이리스트 상세 |
| `/player/:id` | `PlayerPage` | 영상/오디오 플레이어 전체화면 |
| `/my-playlists` | `MyPlaylistsPage` | 내 재생목록 목록 |
| `/my-playlists/:id` | `MyPlaylistDetailPage` | 내 재생목록 상세 |
| `/search` | `SearchPage` | 검색 |
| `/recent` | `RecentPage` | 최근 재생 |
| `/settings` | `SettingsPage` | 설정 |

`Layout` 컴포넌트: BottomNav + MiniPlayer 공통 렌더.

## 관리자 라우트 (`AdminGuard` → `AdminLayout`)

진입: `#/admin/thelc/login` (JWT 로그인)  
보호: `AdminGuard` — `adminAuthStore.isAuthenticated()` false 시 login 리디렉션

| 경로 | 컴포넌트 |
|------|----------|
| `/admin/thelc` | `AdminDashboardPage` |
| `/admin/thelc/playlists` | `PlaylistsListPage` |
| `/admin/thelc/playlists/new` | `PlaylistFormPage` |
| `/admin/thelc/playlists/:id` | `PlaylistDetailPage` |
| `/admin/thelc/playlists/:id/edit` | `PlaylistFormPage` |
| `/admin/thelc/videos` | `VideosListPage` |
| `/admin/thelc/videos/new` | `VideoFormPage` |
| `/admin/thelc/videos/:id` | `VideoDetailPage` |
| `/admin/thelc/videos/:id/edit` | `VideoFormPage` |
| `/admin/thelc/bible-verses` | `BibleVersesListPage` |
| `/admin/thelc/bible-verses/new` | `BibleVerseFormPage` |
| `/admin/thelc/bible-verses/:id` | `BibleVerseDetailPage` |
| `/admin/thelc/bible-verses/:id/edit` | `BibleVerseFormPage` |
| `/admin/thelc/lyrics` | `LyricsListPage` |
| `/admin/thelc/lyrics/new` | `LyricFormPage` |
| `/admin/thelc/lyrics/:id` | `LyricDetailPage` |
| `/admin/thelc/lyrics/:id/edit` | `LyricFormPage` |
| `/admin/thelc/users` | `UsersListPage` |
| `/admin/thelc/admins` | `AdminsListPage` |
| `/admin/thelc/admins/new` | `AdminFormPage` |
| `/admin/thelc/admins/:id` | `AdminDetailPage` |
| `/admin/thelc/admins/:id/edit` | `AdminFormPage` |
| `/admin/thelc/profile` | `ProfilePage` |

## 주의

- `/admin` 및 `/admin/*` (thelc 제외) → `/` 리디렉션
- 그 외 모든 경로 → `/` 리디렉션 (404 없음)
