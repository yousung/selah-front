# Components

## 사용자 공유 컴포넌트 (`src/components/`)

| 파일 | 역할 |
|------|------|
| `Layout.tsx` | 사용자 앱 공통 래퍼. BottomNav(5탭: 홈/찬송/설교/양식/메뉴) + MiniPlayer 포함. `.user-app`에 `--font-scale`과 하단 고정 UI 높이 변수를 제공 |
| `MiniPlayer.tsx` | 하단 고정 미니 플레이어. AudioContext 구독. `currentVideo.playerPath` 우선 navigate (설교 플레이어 대응). 글자 확대 시 자연 높이로 늘어나며 `Layout`이 실제 높이를 측정 |
| `QueuePanel.tsx` | 현재 재생 큐 표시 패널 (queueStore 구독). 사용자 앱 글자 크기 설정을 상속 |
| `home/HomeTodayWord.tsx` | 홈 "오늘의 암송" — 이번 주 암송 구절(첫 `memory_verse`)을 조용한 면 블록(`.hb`)에. 라벨 → 외울 말씀(세리프 14, 지금의 기도 본문과 같은 스타일, 줄 수 제한 없음) → 본문 위치(세리프 12, 우측 정렬). "암송하기 →" `/memorize/weekly`. queryKey `['memory-verses','current']`를 MemorizePage와 공유 |
| `home/HomeNowPrayer.tsx` | 홈 "지금의 기도" — `useCurrentPrayer()`(`lib/currentPrayer.ts`)의 현재 시간대 단락, `.hb` 블록 안 세리프 제목 + 본문 미리보기(`.hp-body` 폰 3줄/나란히 4줄). "기도문 이어 읽기 →" `/memorize/prayer/daily` |
| `home/HomeTypography.tsx` | 홈 섹션 공용 `HomeLabel`(작은 자간 라벨 h2, 장식 없음) · `HomeMoreLink`(44px 텍스트 링크 버튼) |
| `home/HomeSermonTiles.tsx` | 홈 "이번 주 설교 N편" — 공통 섹션 헤더 + 가상 카테고리 `recent-sermon` 재생 가능 설교 최대 3편 텍스트 타일(썸네일 없음: 시리즈·날짜 / 세리프 제목 / 성경 본문(제목에 없으면 설명란 첫 줄에서) / 설명란 발췌 3줄(URL·해시태그·줄머리 타임스탬프 제거, 제목 반복 단락 제외, 본론 Ⅰ. 전 서론만, 비면 생략) / 바닥 "말씀 듣기 →"(HomeMoreLink 모양 span — 타일이 button이라 중첩 회피), `.st-grid` 폰 1열 · 768+ 편수만큼 열, 같은 높이). N>3이면 "설교 전체 →" `/sermon`. 탭 시 큐=재생 가능 전부, 탭한 인덱스부터. queryKey `['sermon-category-videos','recent-sermon']`를 SermonPage와 공유 |
| `home/HomeHymnTile.tsx` | 홈 찬송 타일 — `GET /videos?tag=AR&sort=newest&limit=20`(page 생략 → createdAt DESC, queryKey `['home-hymns','AR-newest-20',onlyOurChurch]`) 중 재생 가능 영상 랜덤 4곡(마운트당 1회 셔플) 모자이크(폰 2열, 768+ 4열)를 `.hb` 블록으로 + "더보기 →" `/hymn`. 재생은 `usePlayHymn`(큐 = 보이는 4곡). 썸네일 `Thumb startQuality="maxresdefault"` |
| `home/homeBento.ts` | 홈 레이아웃 CSS 문자열 `HOME_CSS`(HomePage가 `<style>` 주입) + `clamp()` 헬퍼. 공통 블록 면 `.hb`(`--surface-1`, radius 16, 그림자·그라데이션 없음). 컬럼 수 = 화면 폭 × `.home[data-fs]`(글자 크기) |
| `VideoCard.tsx` | 영상 카드 UI (썸네일, 제목, 태그, 시간) |
| `FestivalYearChips.tsx` | 시편찬양제 연도 칩(pill, 활성 `--primary-700`). 연도 2개 미만이면 미렌더. HymnPage 시편찬양제 섹션·`FestivalPage` 헤더 공유 |
| `Thumb.tsx` | ytimg 썸네일: 설정 기반 시작 화질 + 404/120px placeholder 다운그레이드 체인(`lib/thumb.ts` `THUMB_ORDER`). 선택 prop `startQuality`로 시작 등급 강제(홈=maxres). maxres/sd가 120px 대체 이미지면 실패 대신 다음 등급 |
| `TagBadge.tsx` | 태그 표시 뱃지 |
| `PlaylistBottomSheet.tsx` | 영상을 재생목록에 추가하는 바텀시트 (playlistStore) |
| `PwaInstallPrompt.tsx` | PWA 설치 유도 배너 |

## 설교 페이지 컴포넌트 (`src/pages/sermon/`)

| 파일 | 역할 |
|------|------|
| `SermonPage.tsx` | 설교 시리즈 2열 그리드. `SERMON_SERIES` mock 사용 |
| `SermonSeriesPage.tsx` | 시리즈별 설교 목록. 설교자 필터 칩. `getSermonsBySeriesId()` 사용 |
| `SermonPlayerPage.tsx` | YouTube iframe embed. 영상/음성 모드 전환 버튼. 이전/다음 설교 nav |

> 모두 하드코딩 mock(`src/data/sermonsMock.ts`) 기반. 백엔드 미연동.

## 관리자 컴포넌트 (`src/components/admin/`)

| 파일 | 역할 |
|------|------|
| `AdminLayout.tsx` | 관리자 앱 공통 래퍼. 사이드바 + `<Outlet>` |
| `AdminGuard.tsx` | 인증 보호 래퍼. `adminAuthStore.isAuthenticated()` false → login 리디렉션 |
| `ConfirmDialog.tsx` | 삭제 확인 다이얼로그 (재사용) |
| `Pagination.tsx` | 페이지네이션 UI |

## 데이터 타입 공통 패턴

컴포넌트 간 전달되는 영상 객체 형태:

```ts
// VideoCard, MiniPlayer, QueuePanel 등에서 공통 사용 (AudioContext.tsx VideoInfo)
{
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  hymnTitle?: string | null
  duration?: number | null
  chapter?: number | null     // 일부 컴포넌트에서만
  playerPath?: string         // 설교 플레이어 등 비-찬송 경로. MiniPlayer navigate 시 우선 사용
}
```

## 설교 Mock 데이터 (`src/data/sermonsMock.ts`)

설교 UI 하드코딩 테스트용. 백엔드 미연동.

| 심볼 | 설명 |
|------|------|
| `SERMON_SERIES` | `SermonSeries[]` — 4개 시리즈 |
| `SERMONS` | `Sermon[]` — 10개 설교 |
| `getSermonsBySeriesId(id)` | 시리즈별 설교 목록 (최신순) |
| `getSeriesById(id)` | 시리즈 단건 조회 |
| `getSermonById(id)` | 설교 단건 조회 |
| `getUniquePreachers(seriesId)` | 시리즈 내 설교자 목록 (필터 칩용) |
| `fmtDuration(seconds)` | `"54:00"` 형식 |
| `fmtDate(dateStr)` | `"2026. 6. 8."` 형식 |

## 주의

- `PlaylistBottomSheet` — `playlistStore`만 사용, 서버 통신 없음
- `MiniPlayer` — AudioContext의 `currentVideo`, `isPlaying`, `togglePlay` 사용
- 접이식/태블릿 내비게이션 전환 기준은 [DESIGN.md의 Responsive behavior](../DESIGN.md#responsive-behavior)를 따른다. `Layout.tsx`의 CSS breakpoint와 실제 하단 메뉴 높이 측정이 접기·펼치기에 즉시 대응한다.
- `Layout`은 재생할 영상이 있고 플레이어 화면 밖이며 사용자가 닫지 않은 경우 MiniPlayer를 표시한다. 하단 내비/미니플레이어 높이는 `ResizeObserver`로 측정해 본문 spacer와 FAB 위치에 반영한다.
# 일상기도 본문

`PrayerContent`의 `category`는 `MemorizePage`가 URL 라우트에서 전달한다. 자체 탭 상태를 중복 저장하지 않으며 분류가 바뀌면 이전 목록/선택 기간은 초기화한다. 경로 목록은 [routes.md](./routes.md)를 참조한다.

`DailyPrayerBody.tsx`의 `PrayerSection`은 대표기도의 문서별 아코디언에도 재사용한다. 대표기도는 24px 문서 제목(h2)을 누르면 원문 전체를 표시하며 현재·이전 보기 모두 기본 접힘, 독립적인 펼침 상태를 사용한다.

`src/components/PrayerTopicsBody.tsx`: 기도제목의 연속 번호를 목록으로 구분하고 하위 줄을 들여쓴다. 현재·이전 기도제목에 동일하게 적용하며 번호가 비연속이거나 서문이 있는 등 구조가 불명확하면 원문을 그대로 표시한다. DB 원문과 날짜는 변경하지 않는다.

`src/components/DailyPrayerBody.tsx`: 일상기도의 연속 번호 제목과 빈 줄을 기준으로 본문을 나누어 기본 접힘 아코디언을 표시한다. 여러 항목을 동시에 열 수 있고, 구조가 맞지 않는 원문은 일반 본문으로 보존한다. `PrayerContent`의 현재·이전 상세에서 사용한다. 버튼 ARIA와 CSS grid 높이 전환을 사용하며, 동작 줄이기 설정을 지원한다. URL `?open=<섹션번호>`가 있으면 해당 `PrayerSection`을 `defaultOpen`(최초 마운트 한정)으로 펼치고 `scrollIntoView`(`scroll-margin-top` 80px)한다.
