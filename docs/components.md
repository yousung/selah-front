# Components

## 사용자 공유 컴포넌트 (`src/components/`)

| 파일 | 역할 |
|------|------|
| `Layout.tsx` | 사용자 앱 공통 래퍼. BottomNav(5탭: 찬송/설교/양식/교리서/MY) + MiniPlayer 포함. `.user-app`에 `--font-scale`과 하단 고정 UI 높이 변수를 제공 |
| `MiniPlayer.tsx` | 하단 고정 미니 플레이어. AudioContext 구독. `currentVideo.playerPath` 우선 navigate (설교 플레이어 대응). 글자 확대 시 자연 높이로 늘어나며 `Layout`이 실제 높이를 측정 |
| `QueuePanel.tsx` | 현재 재생 큐 표시 패널 (queueStore 구독). 사용자 앱 글자 크기 설정을 상속 |
| `VideoCard.tsx` | 영상 카드 UI (썸네일, 제목, 태그, 시간) |
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

`DailyPrayerBody.tsx`의 `PrayerSection`은 대표기도의 문서별 아코디언에도 재사용한다. 대표기도는 24px 문서 제목(h2)을 누르면 원문 전체를 표시하며 현재·이전 보기 모두 기본 접힘, 독립적인 펼침 상태를 사용한다.

`src/components/PrayerTopicsBody.tsx`: 기도제목의 연속 번호를 목록으로 구분하고 하위 줄을 들여쓴다. 현재·이전 기도제목에 동일하게 적용하며 번호가 비연속이거나 서문이 있는 등 구조가 불명확하면 원문을 그대로 표시한다. DB 원문과 날짜는 변경하지 않는다.

`src/components/DailyPrayerBody.tsx`: 일상기도의 연속 번호 제목과 빈 줄을 기준으로 본문을 나누어 기본 접힘 아코디언을 표시한다. 여러 항목을 동시에 열 수 있고, 구조가 맞지 않는 원문은 일반 본문으로 보존한다. `PrayerContent`의 현재·이전 상세에서 사용한다. 버튼 ARIA와 CSS grid 높이 전환을 사용하며, 동작 줄이기 설정을 지원한다.
