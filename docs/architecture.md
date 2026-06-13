# Architecture

## Tech Stack

| 분류 | 라이브러리 |
|------|-----------|
| UI | React 18, TypeScript, Tailwind CSS |
| 라우팅 | React Router v6 (HashRouter) |
| 상태 | Zustand v5 + persist (localStorage) |
| 서버 상태 | @tanstack/react-query v5 |
| HTTP | Axios |
| 플레이어 | react-player, HTMLAudioElement |
| 드래그 | @dnd-kit/core, @dnd-kit/sortable |
| 빌드 | Vite 8, TypeScript strict |

## 디렉터리 구조

```
src/
├── App.tsx              # 라우트 선언 전체
├── main.tsx             # React 진입점
├── contexts/
│   └── AudioContext.tsx # 전역 오디오/영상 재생 상태
├── store/               # Zustand 스토어 (모두 localStorage persist)
├── lib/                 # API 클라이언트, 유틸
├── pages/               # 라우트 단위 페이지
│   └── admin/           # 관리자 페이지
└── components/          # 공유 UI 컴포넌트
    └── admin/           # 관리자 전용 컴포넌트
```

## 두 앱

앱 하나에 두 영역이 공존한다.

| 영역 | 경로 prefix | 인증 |
|------|-------------|------|
| 사용자 앱 | `#/` | 없음 |
| 관리자 앱 | `#/admin/thelc/` | JWT Bearer (AdminGuard) |

## 데이터 흐름

```
API (AWS Lambda)
    ↓ axios (lib/api.ts, lib/adminApi.ts)
React Query (서버 캐시) ─── pages/components
    
Zustand stores (클라이언트 상태, localStorage 유지)
    ↓
AudioContext (재생 로직) ─── 모든 컴포넌트
```

## 환경 변수

| 변수 | 기본값 | 용도 |
|------|--------|------|
| `VITE_API_BASE_URL` | AWS API GW URL | 공개/관리자 API base |
| `VITE_BASE_PATH` | `/` | Vite base path |

## API 서버

`https://e41cinm9d8.execute-api.ap-northeast-2.amazonaws.com/prod` (AWS API Gateway, ap-northeast-2)

로컬 개발 시 Vite proxy: `/api` → `http://localhost:3000`
