import { useState } from 'react'
import { useAudio } from '@/contexts/AudioContext'
import { useSettingsStore } from '@/store/settingsStore'
import { runMediaDiag, toText, useLastPlaybackStore } from '@/lib/mediaDiag'
import type { MediaDiagReport } from '@/lib/mediaDiag'

// 디버그 오버레이 게이팅: localStorage['selah-debug']==='1' 또는 URL ?debug=1.
// HashRouter라 쿼리가 # 앞/뒤 어디든 올 수 있어 href 전체를 본다.
export function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (localStorage.getItem('selah-debug') === '1') return true
  } catch {}
  return window.location.href.includes('debug=1')
}

const label: React.CSSProperties = { color: '#9ca3af' }

export default function MediaDebugOverlay() {
  const [open, setOpen] = useState(true)
  const [report, setReport] = useState<MediaDiagReport | null>(null)
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const { currentVideo } = useAudio()
  const mediaMode = useSettingsStore((s) => s.mediaMode)
  const last = useLastPlaybackStore()

  if (!isDebugEnabled()) return null

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', right: 8, bottom: 8, zIndex: 2147483647,
          background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
          borderRadius: 6, padding: '4px 8px', fontSize: 10, fontFamily: 'monospace',
        }}
      >
        DIAG
      </button>
    )
  }

  const runForCurrent = async () => {
    if (!currentVideo) return
    setRunning(true)
    try {
      const r = await runMediaDiag(currentVideo.id, mediaMode === 'video' ? 'video' : 'audio')
      setReport(r)
    } finally {
      setRunning(false)
    }
  }

  const copyReport = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(toText(report))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', right: 8, bottom: 8, zIndex: 2147483647,
        width: 320, maxWidth: 'calc(100vw - 16px)', maxHeight: '50vh', overflow: 'auto',
        background: 'rgba(0,0,0,0.82)', color: '#e5e7eb', borderRadius: 8,
        padding: 10, fontSize: 10, lineHeight: 1.5, fontFamily: 'monospace',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <strong style={{ fontSize: 11 }}>Media Diag</strong>
        <button
          onClick={() => setOpen(false)}
          style={{ background: 'transparent', color: '#9ca3af', border: 'none', fontSize: 14, cursor: 'pointer' }}
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: 6 }}>
        <div><span style={label}>last src:</span> {last.source ?? '-'}</div>
        <div style={{ wordBreak: 'break-all' }}><span style={label}>src:</span> {last.src ?? '-'}</div>
        <div><span style={label}>errCode:</span> {last.errorCode ?? '-'} <span style={label}>net:</span> {last.networkState ?? '-'} <span style={label}>ready:</span> {last.readyState ?? '-'}</div>
        <div><span style={label}>preserved:</span> {String(last.preservedFile)}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <button
          onClick={runForCurrent}
          disabled={!currentVideo || running}
          style={{
            flex: 1, background: currentVideo ? '#2563eb' : '#374151', color: '#fff',
            border: 'none', borderRadius: 4, padding: '5px 6px', fontSize: 10,
            opacity: !currentVideo || running ? 0.6 : 1,
          }}
        >
          {running ? '실행 중…' : '현재 곡 진단'}
        </button>
        <button
          onClick={copyReport}
          disabled={!report}
          style={{
            flex: 1, background: report ? '#059669' : '#374151', color: '#fff',
            border: 'none', borderRadius: 4, padding: '5px 6px', fontSize: 10,
            opacity: report ? 1 : 0.6,
          }}
        >
          {copied ? '복사됨' : '리포트 복사'}
        </button>
      </div>

      {report ? (
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{toText(report)}</pre>
      ) : (
        <div style={label}>{currentVideo ? '"현재 곡 진단"을 눌러 실행' : '재생 중인 곡 없음'}</div>
      )}
    </div>
  )
}
