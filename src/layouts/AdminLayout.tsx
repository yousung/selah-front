import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function AdminLayout() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const menuItems = [
    { label: '카테고리 관리', path: '/admin/categories' },
    { label: '영상 관리', path: '/admin/videos' },
    { label: '사용자 관리', path: '/admin/users' },
  ]

  return (
    <div className="flex h-screen w-full">
      <aside className="w-[200px] flex flex-col fixed left-0 top-0 h-screen bg-[#3D6B44] text-white">
        <div className="p-6 border-b border-white/20">
          <h1 className="text-xl font-bold">관리자</h1>
        </div>
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white text-[#3D6B44] font-semibold'
                        : 'text-white hover:bg-white/10'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-white/20">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-white text-[#3D6B44] rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-[200px] overflow-auto" style={{ backgroundColor: 'var(--surface-0)' }}>
        <Outlet />
      </main>
    </div>
  )
}
