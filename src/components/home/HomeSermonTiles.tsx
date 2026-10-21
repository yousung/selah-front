import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fs } from '@/lib/fontScale'
import { useQueueStore } from '@/store/queueStore'
import { isPlayableInQueue } from '@/lib/liveVideo'
import { clamp } from '@/components/home/homeBento'
import { HomeLabel, HomeMoreLink } from '@/components/home/HomeTypography'

const SERIF = 'var(--font-serif)'
// 백엔드 가상 카테고리 "이번주 설교"(최근 7일 publishedAt DESC). SermonPage 상단 row와 같은 id/쿼리
const RECENT_SERMON_ID = 'recent-sermon'
const RECENT_SERMON_TITLE = '이번주 설교'
const MAX_TILES = 3

interface Video {
  id: string
  youtubeId?: string | null
  title: string
  description?: string | null
  thumbnail: string | null
  publishedAt?: string | null
  duration?: number | null
  isSecret?: boolean | null
  isLive?: boolean | null
}

// "[요한복음강해] 101. 제목 (요 17:2–3)" → series / 제목 / 본문
const SCRIPTURE_RE = /\s*\(([^()]*\d+\s*:\s*\d+[^()]*)\)\s*$/

function parseSermon(video: Video) {
  let title = video.title.trim()
  let series: string | null = null
  let scripture: string | null = null
  const m = title.match(/^\[([^\]]+)\]\s*/)
  if (m) {
    series = m[1].trim()
    title = title.slice(m[0].length)
  }
  const s = title.match(SCRIPTURE_RE)
  if (s) {
    scripture = s[1].trim()
    title = title.slice(0, s.index).trim()
  }
  return { series, scripture, title: title || video.title }
}

// 설명란(설교 원고) → 미리보기 발췌. URL·해시태그·타임스탬프 제거, 제목 반복 줄 제외, 본론(Ⅰ./1.) 전 서론 단락만
const norm = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, '')
const OUTLINE_RE = /^\s*(?:[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]|[IVX]+\.|[A-Z]\.|\d+\.\s)/

// 제목에 본문이 없으면 설명란 첫 줄의 "(요 17:2–3)"을 대신 쓴다
function sermonExcerpt(description: string | null | undefined, title: string) {
  if (!description) return { excerpt: null, scripture: null }
  const t = norm(title)
  let scripture: string | null = null
  const paras: string[] = []
  for (const raw of description.split(/\n\s*\n/)) {
    const p = raw
      .replace(/https?:\/\/\S+|www\.\S+/g, '')
      .replace(/(^|\s)#[^\s#]+/g, '$1')
      .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\b/gm, '') // 챕터 타임스탬프(줄 머리)만 — "마 24:29" 같은 성구는 보존
      .replace(/\s+/g, ' ')
      .trim()
    if (!p) continue
    if (paras.length && OUTLINE_RE.test(p)) break
    const n = norm(p)
    if (!n || (t && n.includes(t) && n.length < t.length + 40)) {
      scripture ??= p.match(SCRIPTURE_RE)?.[1].trim() ?? null
      continue
    }
    paras.push(p)
    if (paras.join(' ').length > 320) break
  }
  const text = paras.join(' ').trim()
  return { excerpt: text ? text.slice(0, 400) : null, scripture }
}

function formatDate(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

// 텍스트 타일 ("지금의 기도"와 같은 결). 높이는 그리드 stretch로 맞추고 "말씀 듣기 →"는 margin-top:auto로 바닥에 정렬.
// 타일 전체가 버튼이라 링크는 HomeMoreLink(button) 대신 같은 모양의 span (button 중첩 방지)
function SermonTile({ video, onPlay }: { video: Video; onPlay: () => void }) {
  const parsed = parseSermon(video)
  const { series, title } = parsed
  const meta = [series, formatDate(video.publishedAt)].filter(Boolean).join(' · ')
  const { excerpt, scripture: descScripture } = sermonExcerpt(video.description, title)
  const scripture = parsed.scripture ?? descScripture
  return (
    <button
      type="button"
      aria-label={`설교 재생: ${title}`}
      onClick={onPlay}
      className="hb"
      style={{ wordBreak: 'keep-all', overflowWrap: 'anywhere' }}
    >
      {meta && <span style={{ ...clamp(2), fontSize: fs(11), fontWeight: 500, letterSpacing: '0.02em', lineHeight: 1.5, color: 'var(--ink-1)' }}>{meta}</span>}
      <span style={{ ...clamp(3), marginTop: fs(10), fontFamily: SERIF, fontSize: fs(16), fontWeight: 600, lineHeight: 1.45, color: 'var(--ink-0)' }}>{title}</span>
      {scripture && <span style={{ marginTop: fs(6), fontFamily: SERIF, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink-1)' }}>{scripture}</span>}
      {excerpt && (
        <span
          style={{
            ...clamp(3),
            marginTop: fs(8),
            maxWidth: '34em',
            fontFamily: SERIF,
            fontSize: fs(14),
            lineHeight: 1.7,
            color: 'var(--ink-1)',
          }}
        >
          {excerpt}
        </span>
      )}
      <span style={{ marginTop: 'auto', paddingTop: 8, display: 'flex' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, fontSize: fs(12), fontWeight: 600, color: 'var(--primary-700)' }}>
          말씀 듣기 <span aria-hidden="true">→</span>
        </span>
      </span>
    </button>
  )
}

/** 홈 "이번 주 설교" — 공통 섹션 헤더 + 최대 3편 타일. 탭 시 큐=재생 가능 설교 전부, 탭한 인덱스부터. queryKey는 SermonPage와 공유 */
export default function HomeSermonTiles() {
  const navigate = useNavigate()
  const setQueue = useQueueStore((s) => s.setQueue)
  const { data } = useQuery<{ videos: Video[]; total: number }>({
    queryKey: ['sermon-category-videos', RECENT_SERMON_ID],
    queryFn: async () => (await api.get(`/sermon-categories/${RECENT_SERMON_ID}/videos?page=1&limit=20`)).data,
  })

  const playable = (data?.videos ?? []).filter(isPlayableInQueue)
  if (!playable.length) return null
  const shown = playable.slice(0, MAX_TILES)

  const playSermon = (index: number) => {
    const ids = playable.map((v) => v.id)
    const metas = playable.map((v) => ({
      id: v.id,
      youtubeId: v.youtubeId,
      title: v.title,
      thumbnail: v.thumbnail,
      tag: null,
      type: 'SERMON',
      hymnTitle: v.title,
      duration: v.duration ?? null,
      playerPath: `/sermon/player/${v.id}`,
      isSecret: v.isSecret ?? null,
      categoryId: RECENT_SERMON_ID,
      categoryTitle: RECENT_SERMON_TITLE,
      isLive: v.isLive ?? null,
    }))
    setQueue(ids, index, metas)
    navigate(`/sermon/player/${playable[index].id}`, { state: { categoryId: RECENT_SERMON_ID, categoryTitle: RECENT_SERMON_TITLE } })
  }

  return (
    <section aria-label="이번 주 설교" style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 16, marginBottom: 8 }}>
        <HomeLabel>
          이번 주 설교 <span style={{ marginLeft: 4, color: 'var(--ink-2)' }}>{playable.length}편</span>
        </HomeLabel>
        {playable.length > MAX_TILES && <HomeMoreLink onClick={() => navigate('/sermon')}>설교 전체</HomeMoreLink>}
      </div>
      <div className="st-grid" data-n={shown.length}>
        {shown.map((v, idx) => (
          <SermonTile key={v.id} video={v} onPlay={() => playSermon(idx)} />
        ))}
      </div>
    </section>
  )
}
