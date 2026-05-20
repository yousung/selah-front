import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Video {
  id: string
  youtubeId: string
  title: string
  thumbnail: string | null
  tag: string | null
  playlistId: string | null
  playlist?: { id: string; title: string }
}

export interface Playlist {
  id: string
  title: string
  videos?: Video[]
}

export function useVideos(params?: {
  playlistId?: string
  tag?: string
  sort?: 'latest' | 'oldest'
  limit?: number
}) {
  return useQuery({
    queryKey: ['videos', params],
    queryFn: async () => {
      const { data } = await api.get<Video[]>('/videos', { params })
      return data
    },
  })
}

export function useVideo(id: string) {
  return useQuery({
    queryKey: ['video', id],
    queryFn: async () => {
      const { data } = await api.get<Video>(`/videos/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function usePlaylists() {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const { data } = await api.get<Playlist[]>('/playlists')
      return data
    },
  })
}

export function usePlaylist(id: string) {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: async () => {
      const { data } = await api.get<Playlist>(`/playlists/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useStreamUrl(videoId: string, quality = 'medium', enabled = false) {
  return useQuery({
    queryKey: ['stream', videoId, quality],
    queryFn: async () => {
      const { data } = await api.get<{ url: string; bitrate: number }>(`/videos/${videoId}/stream`, {
        params: { quality },
      })
      return data
    },
    enabled,
    staleTime: 1000 * 60 * 10,
  })
}
