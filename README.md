# Selah YouTube Web

주님의 교회 셀라 영상/음원 플레이어 웹 클라이언트입니다. YouTube 기반 찬양 콘텐츠를 플레이리스트별로 탐색하고, 오디오 스트림으로 재생하며, 즐겨찾기와 재생 환경 설정을 제공합니다.

## 주요 기능

- 홈 화면의 플레이리스트별 최신 영상 피드
- 플레이리스트 상세 및 영상 상세 플레이어
- 영상 검색, 정렬, 무한 스크롤
- 즐겨찾기 저장 및 즐겨찾기 기반 필터
- 전역 미니 플레이어와 오디오 재생 제어
- 라이트/다크 테마, 음질, 상세 페이지 자동 재생 설정
- 관리자 화면에서 영상 및 플레이리스트 추가/삭제

## 기술 스택

- React 18
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Axios
- Tailwind CSS

## 시작하기

### 요구 사항

- Node.js 18 이상 권장
- npm
- API 서버 기본 주소: `http://localhost:3000`

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다. Vite 프록시 설정에 따라 `/api` 요청은 `http://localhost:3000`으로 전달됩니다.

### 프로덕션 빌드

```bash
npm run build
```

### 빌드 결과 미리보기

```bash
npm run preview
```

## 환경 변수

필요하면 프로젝트 루트에 `.env.local`을 만들고 아래 값을 설정합니다.

```env
VITE_API_BASE_URL=/api
VITE_BASE_PATH=/
```

- `VITE_API_BASE_URL`: Axios API 기본 경로입니다. 기본값은 `/api`입니다.
- `VITE_BASE_PATH`: Vite 배포 base path입니다. 기본값은 `/`입니다.

## API 전제

클라이언트는 다음 API를 사용합니다.

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/playlists` | 플레이리스트 목록 조회 |
| `GET` | `/api/playlists/:id` | 플레이리스트 상세 조회 |
| `POST` | `/api/playlists` | 플레이리스트 추가 |
| `DELETE` | `/api/playlists/:id` | 플레이리스트 삭제 |
| `GET` | `/api/videos` | 영상 목록, 검색, 정렬 조회 |
| `GET` | `/api/videos/:id` | 영상 상세 조회 |
| `POST` | `/api/videos` | 영상 추가 |
| `DELETE` | `/api/videos/:id` | 영상 삭제 |
| `GET` | `/api/videos/:id/stream` | 오디오 스트림 URL 조회 |

`/api/videos/:id/stream`은 `{ url, bitrate, encoding? }` 형태의 응답을 반환해야 합니다.

## 라우트

| Path | 화면 |
| --- | --- |
| `/` | 홈 |
| `/playlist/:id` | 플레이리스트 상세 |
| `/player/:id` | 플레이어 |
| `/favorites` | 즐겨찾기 |
| `/search` | 검색 |
| `/my` | 설정 |
| `/admin` | 관리자 |

라우팅은 `HashRouter`를 사용하므로 배포 환경에서 별도 서버 rewrite 설정 없이 정적 호스팅할 수 있습니다.

## 프로젝트 구조

```text
src/
  components/   공통 UI 컴포넌트
  contexts/     전역 오디오 컨텍스트
  hooks/        API 조회 훅
  lib/          Axios 클라이언트 등 공통 유틸
  pages/        라우트 단위 화면
  store/        Zustand 상태 저장소
```

## 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 실행 |
| `npm run build` | TypeScript 빌드 및 Vite 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 로컬 미리보기 |
| `npm run lint` | ESLint 실행 |
| `npm run typecheck` | TypeScript 타입 검사 |

## 로컬 저장소

브라우저 저장소에 사용자 상태를 보관합니다.

- `selah-favorites`: 즐겨찾기 영상 ID 목록
- `selah-settings`: 테마, 음질, 자동 재생 설정
- `selah-auth`: 인증 토큰 및 사용자 정보

