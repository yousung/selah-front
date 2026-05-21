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
import MyPage from '@/pages/MyPage'
import AdminPage from '@/pages/AdminPage'
import Layout from '@/components/Layout'

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
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="playlist/:id" element={<PlaylistPage />} />
            <Route path="player/:id" element={<PlayerPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="recent" element={<RecentPage />} />
            <Route path="my" element={<MyPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AudioProvider>
  )
}
