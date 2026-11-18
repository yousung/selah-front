import Thumb from '@/components/Thumb'
import SecretThumbPlaceholder from '@/components/SecretThumbPlaceholder'
import { fs } from '@/lib/fontScale'

interface Props {
  thumbnail?: string | null
  youtubeId?: string | null
  /** 'sm' = 목록 행처럼 작은 썸네일 */
  size?: 'sm' | 'md'
}

/**
 * 방송중(`isLive`) 영상 썸네일 — 실제 유튜브 썸네일 + 왼쪽 위 LIVE 배지.
 * DB 썸네일이 없으면 youtubeId로 ytimg 주소를 만든다. 둘 다 실패하면 "방송중" 자리표시.
 * 부모는 position relative + overflow hidden 이어야 한다(Thumb 스켈레톤·배지 위치).
 */
export default function LiveThumb({ thumbnail, youtubeId, size = 'md' }: Props) {
  const src = thumbnail || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : null)
  const sm = size === 'sm'
  return (
    <>
      <Thumb
        src={src}
        className="w-full h-full object-cover"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        fallback={<SecretThumbPlaceholder label="방송중" />}
      />
      <span
        className="absolute text-white font-bold rounded"
        style={{
          top: sm ? 4 : 6,
          left: sm ? 4 : 6,
          background: '#E53935',
          fontSize: fs(sm ? 9 : 11),
          lineHeight: fs(sm ? 14 : 18),
          padding: sm ? '0 4px' : '0 6px',
          letterSpacing: '0.04em',
        }}
      >
        LIVE
      </span>
    </>
  )
}
