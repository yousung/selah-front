# Components

## 사용자 공유 컴포넌트 (`src/components/`)

| 파일 | 역할 |
|------|------|
| `Layout.tsx` | 사용자 앱 공통 래퍼. BottomNav(4탭: 찬송/설교/교리서/MY) + MiniPlayer 포함. `<Outlet>` |
| `MiniPlayer.tsx` | 하단 고정 미니 플레이어. AudioContext 구독. `currentVideo.playerPath` 우선 navigate (설교 플레이어 대응) |
| `QueuePanel.tsx` | 현재 재생 큐 표시 패널 (queueStore 구독) |
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
- `Layout` 에서 MiniPlayer를 항상 렌더하므로 PlayerPage에서 중복 렌더 주의
