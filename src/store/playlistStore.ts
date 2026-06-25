import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PlaylistVideo {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  hymnTitle?: string | null
  duration?: number | null
  isSecret?: boolean | null
}

export interface UserPlaylist {
  id: string
  name: string
  videos: PlaylistVideo[]
}

interface PlaylistState {
  playlists: UserPlaylist[]
  addPlaylist: (name: string) => string
  removePlaylist: (id: string) => void
  renamePlaylist: (id: string, name: string) => void
  addVideoToPlaylists: (video: PlaylistVideo, playlistIds: string[]) => void
  removeVideoFromPlaylist: (videoId: string, playlistId: string) => void
  reorderVideos: (playlistId: string, videos: PlaylistVideo[]) => void
  isInAnyPlaylist: (videoId: string) => boolean
  isInPlaylist: (videoId: string, playlistId: string) => boolean
  getPlaylistsForVideo: (videoId: string) => string[]
}

function getVideos(p: UserPlaylist): PlaylistVideo[] {
  return p.videos ?? []
}

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      playlists: [],

      addPlaylist: (name) => {
        const id = crypto.randomUUID()
        set((s) => ({ playlists: [...s.playlists, { id, name, videos: [] }] }))
        return id
      },

      removePlaylist: (id) =>
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),

      renamePlaylist: (id, name) =>
        set((s) => ({
          playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)),
        })),

      addVideoToPlaylists: (video, playlistIds) =>
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (!playlistIds.includes(p.id)) return p
            const videos = getVideos(p)
            if (videos.some((v) => v.id === video.id)) return p
            return { ...p, videos: [...videos, video] }
          }),
        })),

      removeVideoFromPlaylist: (videoId, playlistId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, videos: getVideos(p).filter((v) => v.id !== videoId) }
              : p,
          ),
        })),

      reorderVideos: (playlistId, videos) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId ? { ...p, videos } : p,
          ),
        })),

      isInAnyPlaylist: (videoId) =>
        get().playlists.some((p) => getVideos(p).some((v) => v.id === videoId)),

      isInPlaylist: (videoId, playlistId) =>
        getVideos(get().playlists.find((p) => p.id === playlistId) ?? { id: '', name: '', videos: [] }).some((v) => v.id === videoId),

      getPlaylistsForVideo: (videoId) =>
        get().playlists.filter((p) => getVideos(p).some((v) => v.id === videoId)).map((p) => p.id),
    }),
    {
      name: 'selah-playlists',
      version: 1,
      migrate: (state: unknown, version: number) => {
        const s = state as { playlists?: Array<{ id: string; name: string; videos?: PlaylistVideo[]; videoIds?: string[] }> }
        if (version === 0) {
          // migrate old format: videoIds[] → videos[]
          s.playlists = (s.playlists ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            videos: p.videos ?? (p.videoIds ?? []).map((id) => ({ id, title: '', thumbnail: null, tag: null })),
          }))
        }
        return s as PlaylistState
      },
    },
  ),
)
