# Routes

HashRouter 기반 (`#/`). `src/App.tsx` 에서 선언.

## 사용자 라우트 (`Layout` 래퍼)

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | `HomePage` | 홈 — 머리말(SELAH·날짜·인사) 아래 섹션 4개(`src/pages/HomePage.tsx` 기준) 위→아래: `HomeTodayWord`(오늘의 암송=이번 주 암송 구절) · `HomeNowPrayer`(지금의 기도) — 카드 없는 타이포, 1024+·2x 미만에서 두 단 → `HomeSermonTiles`(이번 주 설교 타일) → `HomeHymnTile`(찬송 타일). 데이터 없는 섹션은 숨김. PWA `start_url` 착지점 |
| `/hymn` | `HymnPage` | 찬송 피드 (구 `/` 홈 피드) |
| `/playlist/:id` | `PlaylistPage` | 서버 플레이리스트 상세. 헤더 다운로드 아이콘 → 선택 모드 → 일괄 다운로드(`useBulkDownload`) |
| `/festival/:year` | `FestivalPage` | 연도별 시편찬양제 팀 영상 그리드 + 연도 칩(헤더 다운로드 아이콘으로 일괄 다운로드). 찬송 탭 하이라이트(`Layout` `isActive('/hymn')`) |
| `/player/:id` | `PlayerPage` | 영상/오디오 플레이어 전체화면. 히스토리 없이 직접 진입 시 뒤로가기는 `/hymn`(찬송) / `/sermon/player/:id`는 `/sermon` |
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
| `/memorize/prayer/daily` | `MemorizePage` | 기도 → 일상기도 (`?open=<번호>`: 해당 번호 아코디언을 열고 스크롤 — 홈 "지금의 기도" 링크) |
| `/memorize/prayer/topics` | `MemorizePage` | 기도 → 기도제목 |
| `/memorize/prayer/pastoral` | `MemorizePage` | 기도 → 목회기도 |
| `/memorize/prayer/representative` | `MemorizePage` | 기도 → 대표기도 |
| `/memorize/archive` | `WeeklyFormArchivePage` | 이전 양식 주간 목록 |
| `/memorize/archive/:startDate` | `WeeklyFormDetailPage` | 이전 양식 상세 |
| `/catechism` | `CatechismPage` | 교리서 (준비 중 placeholder) |
| `/menu` | `MenuPage` | 메뉴 허브 — 바로가기(찬송/설교/양식/교리서/우리들 소식/설정) + 내 콘텐츠(내 재생목록/최근 재생) + 정보(개인정보 처리방침) |
| `/news` | `NewsPage` | 우리들 소식 (준비 중 placeholder) |
| `/reading` | `ReadingPage` | 독서 책 목록(표지 5:7·제목·저자·N편·완료 배지). 빈/404면 "준비 중이에요". 메뉴 탭 하이라이트 |
| `/reading/:id` | `ReadingBookPage` | 책 헤더 + 회차 목록(readingOrder순, 헤더 다운로드 아이콘으로 회차 선택 다운로드·"저장됨" 표시; 폴백 스트림 회차는 503이라 조용히 실패). 탭 시 `usePlayReading`으로 그 책 재생 가능 회차를 큐로 재생 |
| `/reading/player/:id` | `PlayerPage` | 독서 플레이어. 설교형 동작(type 'SERMON' 메타: 이어듣기·배속·seek 제한)을 재사용하되 경로/뒤로가기(`/reading`)/큐 복원(`GET /reading/categories/:id`, router state `categoryId`)/공유 링크/설명 제목("요약본")만 독서용. `Layout`의 isPlayerPage 대상 |
| `/my` | redirect | `/menu`로 이동 (구 MY 탭 북마크 호환) |

기도문 이전 보기(`PrayerContent`)는 해당 `/memorize/prayer/<category>` 안에서 주제별 버튼 → 제목 목록 → 선택 기간 상세로 전환된다. 이전 목록/선택 기간은 URL에 포함하지 않는다. 주제를 바꾸면 날짜 선택과 이전 보기 상태를 초기화한다. 탭은 URL에서 결정되며 새로고침·뒤로/앞으로 가기로 복원된다. 잘못된 기도 분류 경로는 일상기도로 대체한다. DB/API는 기존 분류별 archive 조회를 재사용한다.

`Layout` 컴포넌트: BottomNav(5탭: 홈/찬송/설교/양식/메뉴, `src/components/Layout.tsx` 탭 배열 기준) + MiniPlayer 공통 렌더. 사용자 앱 루트의 `--font-scale`을 하위 화면과 오버레이가 상속한다.

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
