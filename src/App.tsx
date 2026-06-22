import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import NaverAnalyticsTracker from '@/components/NaverAnalyticsTracker'
import MediaDebugOverlay from '@/components/MediaDebugOverlay'
import { AudioProvider } from '@/contexts/AudioContext'
import { useSettingsStore } from '@/store/settingsStore'
import { useCachedMediaStore } from '@/store/cachedMediaStore'
import HomePage from '@/pages/HomePage'
import PlaylistPage from '@/pages/PlaylistPage'
import PlayerPage from '@/pages/PlayerPage'
import MyPlaylistsPage from '@/pages/MyPlaylistsPage'
import MyPlaylistDetailPage from '@/pages/MyPlaylistDetailPage'
import SearchPage from '@/pages/SearchPage'
import RecentPage from '@/pages/RecentPage'
import SettingsPage from '@/pages/SettingsPage'
import Layout from '@/components/Layout'
import SermonPage from '@/pages/sermon/SermonPage'
import SermonCategoryPage from '@/pages/sermon/SermonCategoryPage'
import CatechismPage from '@/pages/CatechismPage'
import CatechismDetailPage from '@/pages/CatechismDetailPage'
import MyPage from '@/pages/MyPage'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminGuard from '@/components/admin/AdminGuard'
import PlaylistsListPage from '@/pages/admin/playlists/PlaylistsListPage'
import PlaylistDetailPage from '@/pages/admin/playlists/PlaylistDetailPage'
import PlaylistFormPage from '@/pages/admin/playlists/PlaylistFormPage'
import VideosListPage from '@/pages/admin/videos/VideosListPage'
import VideoDetailPage from '@/pages/admin/videos/VideoDetailPage'
import VideoFormPage from '@/pages/admin/videos/VideoFormPage'
import BibleVersesListPage from '@/pages/admin/bible-verses/BibleVersesListPage'
import BibleVerseDetailPage from '@/pages/admin/bible-verses/BibleVerseDetailPage'
import BibleVerseFormPage from '@/pages/admin/bible-verses/BibleVerseFormPage'
import LyricsListPage from '@/pages/admin/lyrics/LyricsListPage'
import LyricDetailPage from '@/pages/admin/lyrics/LyricDetailPage'
import LyricFormPage from '@/pages/admin/lyrics/LyricFormPage'
import UsersListPage from '@/pages/admin/users/UsersListPage'
import AdminsListPage from '@/pages/admin/admins/AdminsListPage'
import AdminDetailPage from '@/pages/admin/admins/AdminDetailPage'
import AdminFormPage from '@/pages/admin/admins/AdminFormPage'
import ProfilePage from '@/pages/admin/profile/ProfilePage'

function CachedMediaLoader() {
  const refresh = useCachedMediaStore((s) => s.refresh)
  useEffect(() => { refresh() }, [refresh])
  return null
}

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
      <MediaDebugOverlay />
      <HashRouter>
        <ThemeApplicator />
        <CachedMediaLoader />
        <NaverAnalyticsTracker />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="playlist/:id" element={<PlaylistPage />} />
            <Route path="player/:id" element={<PlayerPage />} />
            <Route path="hymn/player/:id" element={<PlayerPage />} />
            <Route path="sermon/player/:id" element={<PlayerPage />} />
            <Route path="my-playlists" element={<MyPlaylistsPage />} />
            <Route path="my-playlists/:id" element={<MyPlaylistDetailPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="recent" element={<RecentPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="sermon" element={<SermonPage />} />
            <Route path="sermon/category/:id" element={<SermonCategoryPage />} />
            <Route path="catechism" element={<CatechismPage />} />
            <Route path="catechism/:code" element={<CatechismDetailPage />} />
            <Route path="my" element={<MyPage />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin/thelc/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/thelc"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="playlists" element={<PlaylistsListPage />} />
            <Route path="playlists/new" element={<PlaylistFormPage />} />
            <Route path="playlists/:id" element={<PlaylistDetailPage />} />
            <Route path="playlists/:id/edit" element={<PlaylistFormPage />} />
            <Route path="videos" element={<VideosListPage />} />
            <Route path="videos/new" element={<VideoFormPage />} />
            <Route path="videos/:id" element={<VideoDetailPage />} />
            <Route path="videos/:id/edit" element={<VideoFormPage />} />
            <Route path="bible-verses" element={<BibleVersesListPage />} />
            <Route path="bible-verses/new" element={<BibleVerseFormPage />} />
            <Route path="bible-verses/:id" element={<BibleVerseDetailPage />} />
            <Route path="bible-verses/:id/edit" element={<BibleVerseFormPage />} />
            <Route path="lyrics" element={<LyricsListPage />} />
            <Route path="lyrics/new" element={<LyricFormPage />} />
            <Route path="lyrics/:id" element={<LyricDetailPage />} />
            <Route path="lyrics/:id/edit" element={<LyricFormPage />} />
            <Route path="users" element={<UsersListPage />} />
            <Route path="admins" element={<AdminsListPage />} />
            <Route path="admins/new" element={<AdminFormPage />} />
            <Route path="admins/:id" element={<AdminDetailPage />} />
            <Route path="admins/:id/edit" element={<AdminFormPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* /admin 및 /admin/thelc 외 경로 → 루트로 */}
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/admin/*" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AudioProvider>
  )
}
