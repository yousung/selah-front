import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import { adminApi } from '@/lib/adminApi'

const NAV_ITEMS = [
  {
    path: '/admin/thelc',
    label: '대시보드',
    exact: true,
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    path: '/admin/thelc/playlists',
    label: '플레이리스트',
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm-2 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" />
      </svg>
    ),
  },
  {
    path: '/admin/thelc/videos',
    label: '영상',
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553.106A1 1 0 0014 7v6a1 1 0 00.553.894l2 1A1 1 0 0018 14V6a1 1 0 00-1.447-.894l-2 1z" />
      </svg>
    ),
  },
  {
    path: '/admin/thelc/bible-verses',
    label: '성경구절',
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
  },
  {
    path: '/admin/thelc/lyrics',
    label: '가사',
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
      </svg>
    ),
  },
  {
    path: '/admin/thelc/users',
    label: '회원관리',
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zM1 17a8 8 0 0116 0H1z" />
      </svg>
    ),
  },
  {
    path: '/admin/thelc/admins',
    label: '관리자 관리',
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    path: '/admin/thelc/profile',
    label: '내 정보',
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
  },
]

export default function AdminLayout() {
  const { user, clearAuth } = useAdminAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => {
    try { await adminApi.post('/admin/thelc/auth/logout') } catch {}
    clearAuth()
    navigate('/admin/thelc/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9', fontFamily: 'Pretendard Variable, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{ background: '#343a40', height: '57px', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,.3)', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
        <button onClick={() => setSidebarOpen((v) => !v)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.8)', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '18px' }}>
          ☰
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px', flex: 1 }}>
          thelc <span style={{ fontWeight: 300, fontSize: '14px' }}>관리자</span>
        </span>
        <span style={{ color: 'rgba(255,255,255,.7)', fontSize: '13px' }}>{user?.name || user?.email}</span>
        <button
          onClick={handleLogout}
          style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'rgba(255,255,255,.8)', cursor: 'pointer', padding: '5px 12px', borderRadius: '4px', fontSize: '13px' }}
        >
          로그아웃
        </button>
      </nav>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside style={{ width: sidebarOpen ? '250px' : '0', minHeight: 'calc(100vh - 57px)', background: '#343a40', transition: 'width 0.2s', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ width: '250px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#007bff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                  {(user?.name || user?.email || 'A')[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0 }}>{user?.name || '관리자'}</p>
                  <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '11px', margin: 0 }}>{user?.role}</p>
                </div>
              </div>
            </div>
            <nav style={{ padding: '8px 0' }}>
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '11px', fontWeight: 600, padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>메뉴</p>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 16px',
                    color: isActive ? '#fff' : 'rgba(255,255,255,.65)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    background: isActive ? 'rgba(255,255,255,.1)' : 'transparent',
                    borderLeft: isActive ? '3px solid #007bff' : '3px solid transparent',
                    transition: 'background 0.15s, color 0.15s',
                  })}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: '20px', overflow: 'auto', minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
