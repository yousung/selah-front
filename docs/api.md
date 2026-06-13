# API Layer

파일: `src/lib/`

## api.ts — 공개 API

```ts
export const api = axios.create({
  baseURL: VITE_API_BASE_URL || 'https://e41cinm9d8.execute-api.ap-northeast-2.amazonaws.com/prod',
  timeout: 10000,
})
```

인증 없음. 사용자 앱 전용.

## adminApi.ts — 관리자 API

```ts
export const adminApi = axios.create({
  baseURL: 같은 VITE_API_BASE_URL,
  timeout: 15000,
  withCredentials: true,  // refresh cookie
})
```

**Request 인터셉터**: localStorage `admin-auth` 에서 `state.accessToken` 읽어 `Authorization: Bearer <token>` 주입.

**Response 인터셉터 (401 처리)**:
1. `/admin/thelc/auth/` URL → 즉시 login 리디렉션
2. 그 외 401 → `POST /admin/thelc/auth/refresh` (httpOnly cookie 사용)
3. 성공 시 새 token을 localStorage 업데이트 후 원 요청 재시도
4. 여러 동시 요청: `failedQueue` 패턴으로 한 번만 refresh
5. refresh 실패 → `admin-auth` 제거 + login 리디렉션

## selahMenu.ts — 세션 유틸

```ts
// sessionStorage 키: 'selah-menu'
setSelahMenu(path: string)
getSelahMenu(): string | null
clearSelahMenu()
```

현재 메뉴 경로를 세션 스토리지에 임시 저장하는 유틸.

## 주의

- `VITE_API_BASE_URL` 미설정 시 두 클라이언트 모두 동일한 AWS 엔드포인트 사용
- 로컬 개발: Vite proxy `/api` → `http://localhost:3000` (인증 없는 api.ts는 proxy 통해 호출 가능)
- adminApi는 `withCredentials: true` 필수 (refresh token이 httpOnly cookie)
