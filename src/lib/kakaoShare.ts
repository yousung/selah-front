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

/** 공유 가능한 YouTube ID 형식(11자). 유튜브 공유 노출 판단에도 쓴다. */
export function isShareableYoutubeId(id?: string | null): id is string {
  return !!id && /^[A-Za-z0-9_-]{11}$/.test(id)
}

/** 원본 YouTube 영상 카카오 공유. 카카오는 등록 도메인 링크만 허용 → selah.day/yt.html 이 youtube.com 으로 넘긴다. */
export function shareYoutubeToKakao(opts: { youtubeId: string; title: string }): void {
  const k = ensureInit()
  if (!k) {
    alert('카카오 공유를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    return
  }
  const link = `${SHARE_ORIGIN}/yt.html?v=${opts.youtubeId}`
  k.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: opts.title || 'YouTube 영상',
      description: `youtu.be/${opts.youtubeId}`,
      imageUrl: buildThumb(opts.youtubeId, 'hqdefault', ''),
      link: { mobileWebUrl: link, webUrl: link },
    },
    buttons: [
      { title: 'YouTube에서 보기', link: { mobileWebUrl: link, webUrl: link } },
    ],
  })
}

/** 설교 카카오 공유 — feed 템플릿(썸네일+제목+버튼). 링크는 설교 플레이어로 연결. */
export function shareSermonToKakao(opts: {
  id: string
  title: string
  thumbnail?: string | null
  description?: string
  /** 플레이어 경로 접두(기본 /sermon/player, 독서는 /reading/player) */
  playerBase?: string
}): void {
  const k = ensureInit()
  if (!k) {
    alert('카카오 공유를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    return
  }
  const ytid = ytIdFromUrl(opts.thumbnail)
  const imageUrl = ytid ? buildThumb(ytid, 'hqdefault', '') : `${SHARE_ORIGIN}/image.png`
  const link = `${SHARE_ORIGIN}/#${opts.playerBase ?? '/sermon/player'}/${opts.id}`
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
