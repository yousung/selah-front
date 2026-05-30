import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import { Pagination } from '@/components/admin/Pagination'

interface Playlist { id: string; title: string; createdAt: string; videoCount?: number }

const PAGE_SIZE = 20

export default function PlaylistsListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-playlists'],
    queryFn: () => adminApi.get<Playlist[]>('/admin/thelc/playlists').then(r => r.data),
  })

  const total = data?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paged = data?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? []

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#343a40' }}>플레이리스트</h3>
          <button onClick={() => navigate('/admin/thelc/playlists/new')}
            style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
            + 추가
          </button>
        </div>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d', fontSize: '14px' }}>불러오는 중...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={th}>번호</th>
                  <th style={th}>제목</th>
                  <th style={th}>영상 수</th>
                  <th style={th}>생성일</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>플레이리스트가 없습니다.</td></tr>
                ) : paged.map((pl, i) => {
                  const rowNum = total - ((page - 1) * PAGE_SIZE + i)
                  return (
                    <tr key={pl.id} onClick={() => navigate(`/admin/thelc/playlists/${pl.id}`)} style={rowStyle}>
                      <td style={{ ...td, width: '60px', color: '#6c757d' }}>{rowNum}</td>
                      <td style={{ ...td, fontWeight: 500 }}>{pl.title}</td>
                      <td style={{ ...td, width: '80px', color: '#6c757d' }}>{pl.videoCount ?? 0}</td>
                      <td style={{ ...td, width: '120px', color: '#6c757d' }}>{new Date(pl.createdAt).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #dee2e6' }}>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', borderBottom: '2px solid #dee2e6', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 16px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }
const rowStyle: React.CSSProperties = { cursor: 'pointer' }
