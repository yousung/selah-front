import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import { adminApi } from '@/lib/adminApi'

interface Stats {
  playlists: number
  videos: number
  bibleVerses: number
  lyrics: number
  users: number
}

const CARDS = [
  {
    key: 'playlists' as keyof Stats,
    label: '플레이리스트',
    path: '/admin/thelc/playlists',
    bg: '#007bff',
    icon: (
      <svg width="56" height="56" fill="rgba(0,0,0,.15)" viewBox="0 0 20 20">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm-2 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" />
      </svg>
    ),
  },
  {
    key: 'videos' as keyof Stats,
    label: '영상',
    path: '/admin/thelc/videos',
    bg: '#28a745',
    icon: (
      <svg width="56" height="56" fill="rgba(0,0,0,.15)" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553.106A1 1 0 0014 7v6a1 1 0 00.553.894l2 1A1 1 0 0018 14V6a1 1 0 00-1.447-.894l-2 1z" />
      </svg>
    ),
  },
  {
    key: 'bibleVerses' as keyof Stats,
    label: '성경구절',
    path: '/admin/thelc/bible-verses',
    bg: '#17a2b8',
    icon: (
      <svg width="56" height="56" fill="rgba(0,0,0,.15)" viewBox="0 0 20 20">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
  },
  {
    key: 'lyrics' as keyof Stats,
    label: '가사',
    path: '/admin/thelc/lyrics',
    bg: '#fd7e14',
    icon: (
      <svg width="56" height="56" fill="rgba(0,0,0,.15)" viewBox="0 0 20 20">
        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
      </svg>
    ),
  },
  {
    key: 'users' as keyof Stats,
    label: '회원',
    path: '/admin/thelc/users',
    bg: '#dc3545',
    icon: (
      <svg width="56" height="56" fill="rgba(0,0,0,.15)" viewBox="0 0 20 20">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zM1 17a8 8 0 0116 0H1z" />
      </svg>
    ),
  },
]

export default function AdminDashboardPage() {
  const user = useAdminAuthStore((s) => s.user)
  const navigate = useNavigate()

  const { data: stats } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.get<Stats>('/admin/thelc/stats').then((r: { data: Stats }) => r.data),
  })

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ background: '#fff', padding: '12px 20px', marginBottom: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#343a40' }}>대시보드</h1>
        <nav style={{ fontSize: '13px', color: '#6c757d' }}>
          <span style={{ color: '#007bff' }}>홈</span>
          <span style={{ margin: '0 6px' }}>/</span>
          <span>대시보드</span>
        </nav>
      </div>

      <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
        {user?.name || user?.email}님, 환영합니다.
      </p>

      {/* Small Boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {CARDS.map((c) => (
          <div
            key={c.key}
            style={{ borderRadius: '6px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.12)', background: c.bg, color: '#fff', cursor: 'pointer' }}
            onClick={() => navigate(c.path)}
          >
            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: '36px', fontWeight: 700, lineHeight: 1 }}>
                  {stats ? stats[c.key] : '—'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.9 }}>{c.label}</p>
              </div>
              <div style={{ opacity: 0.4 }}>{c.icon}</div>
            </div>
            <div
              style={{ background: 'rgba(0,0,0,.1)', padding: '6px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>자세히 보기</span>
              <span>›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
