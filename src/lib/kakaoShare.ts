import { buildThumb, ytIdFromUrl } from './thumb'

// 카카오 JavaScript 앱 키 — web/.env 의 VITE_KAKAO_JS_KEY (프로덕션 빌드 env에도 동일하게).
const KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined
// 공유 링크는 항상 프로덕션 도메인(카카오 콘솔에 등록된 도메인). 로컬에서 공유해도 prod로 연결.
const SHARE_ORIGIN = 'https://selah.day'

interface KakaoSDK {
  isInitialized: () => boolean
  init: (key: string) => void
  Share: { sendDefault: (settings: Record<string, unknown>) => void }
}

function getKakao(): KakaoSDK | null {
  return (window as unknown as { Kakao?: KakaoSDK }).Kakao ?? null
}

/** SDK 로드됐고 키가 있으면 공유 가능. */
export function isKakaoShareReady(): boolean {
  return !!KEY && !!getKakao()
}

function ensureInit(): KakaoSDK | null {
  const k = getKakao()
  if (!k || !KEY) return null
  if (!k.isInitialized()) k.init(KEY)
  return k
}

/** 곡(찬송) 카카오 공유 — feed 템플릿(썸네일+제목+버튼). */
export function shareSongToKakao(opts: {
  id: string
  title: string
  thumbnail?: string | null
  description?: string
}): void {
  const k = ensureInit()
  if (!k) {
    alert('카카오 공유를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    return
  }
  const ytid = ytIdFromUrl(opts.thumbnail)
  const imageUrl = ytid ? buildThumb(ytid, 'hqdefault', '') : `${SHARE_ORIGIN}/image.png`
  const link = `${SHARE_ORIGIN}/#/player/${opts.id}`
  k.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: opts.title || '셀라 찬양',
      description: (opts.description?.split('\n')[0]?.slice(0, 80)) || '셀라에서 함께 찬양해요',
      imageUrl,
      link: { mobileWebUrl: link, webUrl: link },
    },
    buttons: [
      { title: '셀라와 함께하기', link: { mobileWebUrl: link, webUrl: link } },
    ],
  })
}

/** 설교 카카오 공유 — feed 템플릿(썸네일+제목+버튼). 링크는 설교 플레이어로 연결. */
export function shareSermonToKakao(opts: {
  id: string
  title: string
  thumbnail?: string | null
  description?: string
}): void {
  const k = ensureInit()
  if (!k) {
    alert('카카오 공유를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    return
  }
  const ytid = ytIdFromUrl(opts.thumbnail)
  const imageUrl = ytid ? buildThumb(ytid, 'hqdefault', '') : `${SHARE_ORIGIN}/image.png`
  const link = `${SHARE_ORIGIN}/#/sermon/player/${opts.id}`
  k.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: opts.title || '셀라 설교',
      description: '셀라와 함께해요',
      imageUrl,
      link: { mobileWebUrl: link, webUrl: link },
    },
    buttons: [
      { title: '셀라와 함께하기', link: { mobileWebUrl: link, webUrl: link } },
    ],
  })
}
