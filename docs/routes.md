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
| `/sermon` | `SermonPage` | 설교 시리즈 목록 (2열 그리드) |
| `/sermon/series/:id` | `SermonSeriesPage` | 시리즈별 설교 목록 + 설교자 필터 칩 |
| `/sermon/player/:id` | `SermonPlayerPage` | 설교 플레이어 (YouTube iframe, 영상/음성 전환) |
| `/memorize` | redirect | `/memorize/weekly`로 이동 (기존 링크 호환) |
| `/memorize/weekly` | `MemorizePage` | 이번 주 양식 |
| `/memorize/prayer` | redirect | `/memorize/prayer/daily`로 이동 |
| `/memorize/prayer/daily` | `MemorizePage` | 기도 → 일상기도 |
| `/memorize/prayer/topics` | `MemorizePage` | 기도 → 기도제목 |
| `/memorize/prayer/pastoral` | `MemorizePage` | 기도 → 목회기도 |
| `/memorize/prayer/representative` | `MemorizePage` | 기도 → 대표기도 |
| `/memorize/archive` | `WeeklyFormArchivePage` | 이전 양식 주간 목록 |
| `/memorize/archive/:startDate` | `WeeklyFormDetailPage` | 이전 양식 상세 |
| `/catechism` | `CatechismPage` | 교리서 (준비 중 placeholder) |
| `/my` | `MyPage` | MY 허브 — 내 재생목록/최근/검색/설정 링크 모음 |

기도문 이전 보기(`PrayerContent`)는 해당 `/memorize/prayer/<category>` 안에서 주제별 버튼 → 제목 목록 → 선택 기간 상세로 전환된다. 이전 목록/선택 기간은 URL에 포함하지 않는다. 주제를 바꾸면 날짜 선택과 이전 보기 상태를 초기화한다. 탭은 URL에서 결정되며 새로고침·뒤로/앞으로 가기로 복원된다. 잘못된 기도 분류 경로는 일상기도로 대체한다. DB/API는 기존 분류별 archive 조회를 재사용한다.

`Layout` 컴포넌트: BottomNav(5탭) + MiniPlayer 공통 렌더. 사용자 앱 루트의 `--font-scale`을 하위 화면과 오버레이가 상속한다.

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
