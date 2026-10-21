import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { isPlayableInQueue } from '@/lib/liveVideo'
import { useSettingsStore } from '@/store/settingsStore'
import { usePlayHymn, type HymnPlaylist, type HymnVideo } from '@/lib/hymnPlaylists'
import { fs } from '@/lib/fontScale'
import Thumb from '@/components/Thumb'
import { clamp } from '@/components/home/homeBento'
import { HomeLabel, HomeMoreLink } from '@/components/home/HomeTypography'

const SERIF = 'var(--font-serif)'
const PREVIEW_COUNT = 4
// 재생 불가(라이브 등) 영상이 빠져도 4곡을 채우도록 약간 여유 있게 받는다
const FETCH_COUNT = 8
// 설교는 tag가 없으므로 AR·MR을 각각 받아 합친다 (시편 찬송 모임 영상은 백엔드가 기본 제외)
const TAGS = ['AR', 'MR'] as const

function createdTime(v: HymnVideo) {
  return v.createdAt ? new Date(v.createdAt).getTime() : 0
}

/** 홈 찬송 타일 — 등록일(createdAt) 최신 찬송(AR·MR) 4곡 모자이크를 조용한 면(.hb) 블록으로 + "더보기 →" /hymn. 재생은 HymnPage와 같은 usePlayHymn(큐 = 보이는 4곡) */
export default function HomeHymnTile() {
  const navigate = useNavigate()
  const onlyOurChurch = useSettingsStore((s) => s.onlyOurChurch)
  const playHymn = usePlayHymn()
  // page를 넘기면 백엔드가 publishedAt 정렬로 바뀌므로 생략 → createdAt DESC + limit
  const { data } = useQuery({
    queryKey: ['home-hymns', 'AR-MR-newest', onlyOurChurch],
    queryFn: async () => {
      const lists = await Promise.all(TAGS.map(async (tag) => {
        const { data } = await api.get<HymnVideo[] | { videos?: HymnVideo[] }>('/videos', { params: { tag, sort: 'newest', limit: FETCH_COUNT, excludeTemp: onlyOurChurch } })
        // page 생략 시 배열, page 지정 시 { videos, ... } 객체 — 둘 다 허용
        return Array.isArray(data) ? data : (data?.videos ?? [])
      }))
      return lists.flat().sort((a, b) => createdTime(b) - createdTime(a))
    },
    networkMode: 'always',
  })

  const videos = (data ?? []).filter(isPlayableInQueue).slice(0, PREVIEW_COUNT)
  if (!videos.length) return null

  const playlist: HymnPlaylist = { id: 'home', title: '최근 등록된 찬송', videos, playlists: videos }
  const subtitle = '최근 등록된 찬송'

  return (
    <section aria-label="찬송" className="hb" style={{ wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', columnGap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <HomeLabel>찬송</HomeLabel>
          <p style={{ margin: `${fs(4)} 0 0`, fontFamily: SERIF, fontSize: fs(16), fontWeight: 600, lineHeight: 1.45, color: 'var(--ink-0)' }}>{subtitle}</p>
        </div>
        <HomeMoreLink onClick={() => navigate('/hymn')}>더보기</HomeMoreLink>
      </div>
      <div className="mosaic">
        {videos.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => playHymn(v, playlist)}
            aria-label={`찬송 재생: ${v.hymnTitle || v.title}`}
            style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0, padding: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', WebkitTapHighlightColor: 'transparent' }}
          >
            <span style={{ display: 'block', position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)' }}>
              <Thumb src={v.thumbnail} startQuality="maxresdefault" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {!!v.chapter && (
                <span
                  className="text-[10px]"
                  style={{ position: 'absolute', top: 6, left: 6, padding: '0 6px', borderRadius: 4, background: 'rgba(40,40,40,0.82)', color: '#fff', fontWeight: 700, lineHeight: fs(17), letterSpacing: '0.02em' }}
                >
                  {v.chapter}장
                </span>
              )}
            </span>
            <span style={{ ...clamp(2), marginTop: fs(8), fontSize: fs(12), fontWeight: 500, lineHeight: 1.45, color: 'var(--ink-0)' }}>
              {v.tag ? `[${v.tag.toUpperCase()}] ` : ''}{v.hymnTitle || v.title}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
