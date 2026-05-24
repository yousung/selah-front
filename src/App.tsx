import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AudioProvider } from '@/contexts/AudioContext'
import { useSettingsStore } from '@/store/settingsStore'
import HomePage from '@/pages/HomePage'
import PlaylistPage from '@/pages/PlaylistPage'
import PlayerPage from '@/pages/PlayerPage'
import FavoritesPage from '@/pages/FavoritesPage'
import SearchPage from '@/pages/SearchPage'
import RecentPage from '@/pages/RecentPage'
import SettingsPage from '@/pages/SettingsPage'
import LoginPage from '@/pages/LoginPage'
import CategoriesPage from '@/pages/admin/CategoriesPage'
import VideosPage from '@/pages/admin/VideosPage'
import UsersPage from '@/pages/admin/UsersPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import Layout from '@/components/Layout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { PrivateRoute } from '@/components/PrivateRoute'

function ThemeApplicator() {
  const theme = useSettingsStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return null
}

export default function App() {
  return (
    <AudioProvider>
      <HashRouter>
        <ThemeApplicator />
        <Routes>
          <Route path="/admin/thelc/login" element={<LoginPage />} />
          <Route
            path="/admin/thelc"
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="playlist/:id" element={<PlaylistPage />} />
            <Route path="player/:id" element={<PlayerPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="recent" element={<RecentPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AudioProvider>
  )
}
