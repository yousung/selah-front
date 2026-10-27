import { fs } from '@/lib/fontScale'
import type { BulkDownload } from '@/lib/useBulkDownload'

/** 헤더 우측 다운로드 아이콘(선택 모드 진입) / 선택 모드 중에는 "취소" */
export function BulkDownloadToggle({ bulk, show = true }: { bulk: BulkDownload; show?: boolean }) {
  if (bulk.selectMode) {
    return (
      <button
        onClick={bulk.exitSelectMode}
        style={{ fontSize: fs(14), color: 'var(--primary-700)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 0', whiteSpace: 'nowrap' }}
      >
        취소
      </button>
    )
  }
  if (!bulk.enabled || !show) return null
  return (
    <button
      onClick={() => bulk.setSelectMode(true)}
      aria-label="다운로드할 항목 선택"
      style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-1)', display: 'flex', alignItems: 'center' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </button>
  )
}

/** 선택 모드에서 항목 위에 얹는 체크 원. 부모는 position: relative 여야 한다. */
export function BulkSelectMark({ selected, style }: { selected: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', ...style }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        border: `2px solid ${selected ? 'var(--primary-700)' : 'var(--ink-3)'}`,
        background: selected ? 'var(--primary-700)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </div>
  )
}

/** 선택 모드 하단 바 + 2개 이상 다운로드 시 진행/취소 모달 */
export function BulkDownloadOverlay({ bulk, selectableIds }: { bulk: BulkDownload; selectableIds: string[] }) {
  const { selected, bulkState } = bulk
  const allSelected = selected.size === selectableIds.length && selectableIds.length > 0
  return (
    <>
      {bulk.selectMode && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--white)', borderTop: '1px solid var(--divider)',
          padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
          zIndex: 50,
        }}>
          <button
            onClick={() => bulk.selectAll(selectableIds)}
            style={{
              padding: '10px 16px', borderRadius: 8,
              border: '1.5px solid var(--divider)',
              background: 'var(--surface-0)', fontSize: fs(14), fontWeight: 600,
              color: 'var(--ink-1)', cursor: 'pointer', flex: '1 1 150px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {allSelected ? '선택 해제' : '보이는 항목 전체 선택'}
          </button>
          <button
            onClick={bulk.handleBulkDownload}
            disabled={selected.size === 0}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8,
              background: selected.size > 0 ? 'var(--primary-700)' : 'var(--surface-2)',
              color: selected.size > 0 ? 'white' : 'var(--ink-3)',
              border: 'none', fontSize: fs(14), fontWeight: 700,
              cursor: selected.size > 0 ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent',
              minWidth: 130,
            }}
          >
            {selected.size > 0 ? `${selected.size}개 다운로드` : '다운로드'}
          </button>
        </div>
      )}

      {/* 2개 이상 동시 다운로드 시: 화면 딤 + 진행 표시 + 중앙 취소 (다른 조작 차단) */}
      {bulkState && bulkState.total >= 2 && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(2px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ textAlign: 'center', color: 'white' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px' }} className="animate-spin">
              <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p style={{ fontSize: fs(17), fontWeight: 700, marginBottom: 6 }}>다운로드 중입니다</p>
            <p style={{ fontSize: fs(14), opacity: 0.85 }}>{bulkState.done} / {bulkState.total}</p>
          </div>
          <button
            onClick={bulk.handleBulkCancel}
            style={{
              padding: '12px 32px', borderRadius: 10,
              background: 'var(--white)', color: 'var(--error, #d92d20)',
              border: 'none', fontSize: fs(15), fontWeight: 700, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            취소
          </button>
          <p style={{ fontSize: fs(12), color: 'rgba(255,255,255,0.6)' }}>취소하면 받은 항목도 모두 삭제됩니다</p>
        </div>
      )}
    </>
  )
}
