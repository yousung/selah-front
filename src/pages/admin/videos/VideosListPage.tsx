import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import { Pagination } from '@/components/admin/Pagination'

interface Video { id: string; title: string; youtubeId: string; tag: string; chapter?: number }
interface VideoRes { data: Video[]; total: number }

const PAGE_SIZE = 20

export default function VideosListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-videos', page, search],
    queryFn: () =>
      adminApi.get<VideoRes>(`/admin/thelc/videos?page=${page}&limit=${PAGE_SIZE}${search ? `&search=${encodeURIComponent(search)}` : ''}`).then(r => r.data),
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rows = data?.data ?? []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#343a40' }}>영상</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px' }}>
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="제목 검색"
                style={{ border: '1px solid #ced4da', borderRadius: '4px', padding: '5px 10px', fontSize: '13px', width: '180px' }} />
              <button type="submit" style={{ border: '1px solid #ced4da', borderRadius: '4px', padding: '5px 12px', fontSize: '13px', background: '#f8f9fa', cursor: 'pointer' }}>검색</button>
            </form>
            <button onClick={() => navigate('/admin/thelc/videos/new')}
              style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
              + 추가
            </button>
          </div>
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
                  <th style={th}>YouTube ID</th>
                  <th style={th}>태그</th>
                  <th style={th}>챕터</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>영상이 없습니다.</td></tr>
                ) : rows.map((v, i) => {
                  const rowNum = total - ((page - 1) * PAGE_SIZE + i)
                  return (
                    <tr key={v.id} onClick={() => navigate(`/admin/thelc/videos/${v.id}`)} style={rowStyle}>
                      <td style={{ ...td, width: '60px', color: '#6c757d' }}>{rowNum}</td>
                      <td style={{ ...td, fontWeight: 500, maxWidth: '260px' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title || v.youtubeId}</span>
                      </td>
                      <td style={{ ...td, color: '#6c757d', fontFamily: 'monospace', fontSize: '12px' }}>{v.youtubeId}</td>
                      <td style={{ ...td, width: '70px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: v.tag === 'AR' ? '#d4edda' : '#fff3cd', color: v.tag === 'AR' ? '#155724' : '#856404' }}>
                          {v.tag}
                        </span>
                      </td>
                      <td style={{ ...td, width: '70px', color: '#6c757d' }}>{v.chapter ?? '-'}</td>
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
