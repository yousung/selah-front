import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function AdminLayout() {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super'

  const handleLogout = () => {
    logout()
    navigate('/admin/thelc/login')
  }

  const menuItems = [
    { label: '대시보드', path: '/admin/thelc', end: true },
    { label: '카테고리 관리', path: '/admin/thelc/categories', end: false },
    { label: '영상 관리', path: '/admin/thelc/videos', end: false },
    { label: '사용자 관리', path: '/admin/thelc/users', end: false },
  ]

  return (
    <div className="admin-root flex h-screen w-full">
      <aside
        className="w-[240px] flex flex-col fixed left-0 top-0 h-screen bg-white"
        style={{ borderRight: '1px solid #E2E8F0' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <h1 className="text-sm font-bold tracking-tight" style={{ color: '#111827' }}>
            The LC
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>관리자 패널</p>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? '' : 'hover:bg-gray-100'
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? '#EEF4EF' : undefined,
                    color: isActive ? '#3D6B44' : '#374151',
                    fontWeight: isActive ? 500 : 400,
                  })}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {user && (
          <Link
            to={`/admin/thelc/users/${user.id}`}
            style={{ textDecoration: 'none' }}
            className="block hover:bg-gray-50 transition-colors rounded-lg"
          >
            <div className="px-5 py-3" style={{ borderBottom: '1px solid #E2E8F0' }}>
              <p className="text-xs font-medium" style={{ color: '#374151' }}>{user.name}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                {isSuperAdmin ? '최고 관리자' : '관리자'} · {user.email}
              </p>
            </div>
          </Link>
        )}

        <div className="p-3">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm rounded-lg text-left transition-colors hover:bg-red-50"
            style={{ color: '#DC2626' }}
          >
            로그아웃
          </button>
        </div>
      </aside>

      <main
        className="flex-1 ml-[240px] overflow-auto min-h-screen"
        style={{ backgroundColor: 'var(--surface-0)' }}
      >
        <Outlet />
      </main>
    </div>
  )
}
