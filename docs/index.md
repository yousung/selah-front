# Codebase Index

AI 개발 시 전체 스캔 없이 이 파일로 탐색 시작.

## 문서 목록

| 파일 | 내용 |
|------|------|
| [architecture.md](./architecture.md) | 기술 스택, 디렉터리 구조, 환경 변수, API 서버 |
| [routes.md](./routes.md) | 사용자 + 관리자 라우트 전체 목록 |
| [store.md](./store.md) | Zustand 스토어 6개 — 상태 형태, 액션, localStorage 키 |
| [api.md](./api.md) | API 클라이언트 (api.ts, adminApi.ts, selahMenu.ts) |
| [components.md](./components.md) | 공유 UI 컴포넌트 목록 및 역할 |
| [audio.md](./audio.md) | AudioContext — 재생 상태, 큐 연동, MediaSession |

## 디자인/기획 문서 (`docs/design/`)

| 파일 | 내용 |
|------|------|
| `00-design-system.md` | 색상 토큰, 타이포, 코어 컴포넌트, 간격 시스템 |
| `03-onboarding.md` | 교회 코드 입력, 3가지 상태, 바텀시트 |
| `04-home.md` | 홈 피드, AppBar, Hero 성구, Bottom Nav |
| `05-category.md` | 플레이리스트 상세, AR/MR 필터, 정렬 |
| `06-player.md` | 플레이어, AR/MR 전환, 묵상 모드, 잠금화면 |
| `07-favorites.md` | 즐겨찾기, 동적 카테고리 칩, 빈 상태 |
| `08-my-page.md` | 마이 페이지, 글자 크기, 테마, 교회 변경 |
| `09-browse.md` | 둘러보기 A~D |

## 빠른 참조

**설교 mock 데이터**: `src/data/sermonsMock.ts` — 하드코딩 시리즈/설교 (백엔드 미연동)  
**진입점**: `src/App.tsx` (라우트), `src/main.tsx` (React 마운트)  
**전역 재생**: `src/contexts/AudioContext.tsx` → `useAudio()` 훅  
**전역 설정**: `src/store/settingsStore.ts` → `useSettingsStore()`  
**API**: `src/lib/api.ts` (공개), `src/lib/adminApi.ts` (관리자 JWT)

**localStorage 키 목록**:
- `selah-settings` — 테마, 음질, 재생 모드 등
- `selah-queue` — 현재 재생 큐
- `selah-playlists` — 사용자 재생목록
- `selah-durations` — 영상별 duration 캐시
- `selah-recent` — 최근 재생 목록
- `admin-auth` — 관리자 JWT 토큰

**명령**:
```bash
npm run dev       # 개발 서버 (port 5173)
npm run build     # 프로덕션 빌드
npm run lint      # ESLint
npm run typecheck # TypeScript 체크
```
