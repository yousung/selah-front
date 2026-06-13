# Components

## 사용자 공유 컴포넌트 (`src/components/`)

| 파일 | 역할 |
|------|------|
| `Layout.tsx` | 사용자 앱 공통 래퍼. BottomNav + MiniPlayer 포함. `<Outlet>` |
| `MiniPlayer.tsx` | 하단 고정 미니 플레이어. AudioContext 구독. 탭해서 PlayerPage 이동 |
| `QueuePanel.tsx` | 현재 재생 큐 표시 패널 (queueStore 구독) |
| `VideoCard.tsx` | 영상 카드 UI (썸네일, 제목, 태그, 시간) |
| `TagBadge.tsx` | 태그 표시 뱃지 |
| `PlaylistBottomSheet.tsx` | 영상을 재생목록에 추가하는 바텀시트 (playlistStore) |
| `PwaInstallPrompt.tsx` | PWA 설치 유도 배너 |

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
// VideoCard, MiniPlayer, QueuePanel 등에서 공통 사용
{
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  hymnTitle?: string | null
  duration?: number | null
  chapter?: number | null   // 일부 컴포넌트에서만
}
```

## 주의

- `PlaylistBottomSheet` — `playlistStore`만 사용, 서버 통신 없음
- `MiniPlayer` — AudioContext의 `currentVideo`, `isPlaying`, `togglePlay` 사용
- `Layout` 에서 MiniPlayer를 항상 렌더하므로 PlayerPage에서 중복 렌더 주의
