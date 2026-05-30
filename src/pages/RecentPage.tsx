import { useNavigate } from 'react-router-dom'
import { setSelahMenu } from '@/lib/selahMenu'
import { useRecentStore, type RecentItem } from '@/store/recentStore'
import { useAudio } from '@/contexts/AudioContext'
import { useSettingsStore } from '@/store/settingsStore'
import VideoCard from '@/components/VideoCard'

export default function RecentPage() {
  const navigate = useNavigate()
  const { items, clear } = useRecentStore()
  const { playVideo, currentVideo } = useAudio()
  const autoPlayOnDetail = useSettingsStore((s) => s.autoPlayOnDetail)

  const handlePlay = (item: RecentItem) => {
    setSelahMenu('/recent')
    if (currentVideo?.id === item.id) {
      navigate(`/player/${item.id}?recentMode=1`)
      return
    }
    playVideo(
      { id: item.id, title: item.title, thumbnail: item.thumbnail, tag: item.tag, hymnTitle: item.hymnTitle, duration: item.duration, chapter: item.chapter },
      { autoPlay: autoPlayOnDetail, skipRecentAdd: true },
    )
    navigate(`/player/${item.id}?recentMode=1`)
  }

  return (
    <div className="animate-fade-in">
      <header
        className="sticky top-0 z-10"
        style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <div className="flex items-center justify-between px-4" style={{ height: 56 }}>
          <h1 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>최근 재생</h1>
          {items.length > 0 && (
            <button onClick={clear} className="text-xs" style={{ color: 'var(--ink-2)' }}>
              전체 삭제
            </button>
          )}
        </div>
      </header>

      {!items.length ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ color: 'var(--ink-3)', marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p className="text-base font-medium mb-1" style={{ color: 'var(--ink-1)' }}>최근 재생 목록이 없어요</p>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>곡을 재생하면 여기에 기록됩니다</p>
        </div>
      ) : (
        <>
          {items.map((item) => (
            <VideoCard key={item.id} video={item} onClick={() => handlePlay(item)} layout="list" />
          ))}
          <div className="flex items-center justify-center py-6">
            <p className="text-xs" style={{ color: 'var(--ink-2)' }}>최근 {items.length}곡</p>
          </div>
        </>
      )}
    </div>
  )
}
