import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://e41cinm9d8.execute-api.ap-northeast-2.amazonaws.com/prod'

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
})

// Catechism/Confession types
export interface ConfessionListItem {
  id: string
  code: string
  title: string
  type: string
  description: string | null
  groupCode: string
  groupTitle: string
  groupOrdering: number
  ordering: number
  sectionCount: number
}

export interface Tag {
  id: string
  name: string
}

export interface Section {
  id: string
  ordering: number
  heading: string | null
  number: string | null
  question: string | null
  content: string
  scripture: string | null
  tags: Tag[]
  majorSection: string | null
}

export interface ConfessionDetail {
  id: string
  code: string
  title: string
  type: string
  description: string | null
  groupCode: string
  groupTitle: string
  groupOrdering: number
  ordering: number
  sections: Section[]
}

export interface ConfessionSearchResult {
  confessionCode: string
  confessionTitle: string
  confessionType: string
  sectionId: string
  ordering: number
  number: string | null
  heading: string | null
  question: string | null
  contentSnippet: string
  tags: Tag[]
}

// Catechism/Confession API functions
export async function getConfessions(): Promise<ConfessionListItem[]> {
  const { data } = await api.get<ConfessionListItem[]>('/confessions')
  return data
}

export async function getConfession(code: string): Promise<ConfessionDetail> {
  const { data } = await api.get<ConfessionDetail>(`/confessions/${code}`)
  return data
}

export async function searchConfessions(q: string, tags?: string[]): Promise<ConfessionSearchResult[]> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  const tagList = (tags ?? []).filter(Boolean)
  if (tagList.length > 0) params.set('tag', tagList.join(','))
  const { data } = await api.get<ConfessionSearchResult[]>(`/confessions/search?${params}`)
  return data
}

export async function getConfessionTags(): Promise<Tag[]> {
  const { data } = await api.get<Tag[]>('/confessions/tags')
  return data
}

// 말씀 암송
export interface MemoryVerse {
  id: string
  ordering: number
  period: string       // "6월 23일~28일"
  startDate: string    // "2026-06-23"
  endDate: string      // "2026-06-28"
  reference: string    // "요한복음 14:6"
  content: string      // 본문(여러 줄 가능)
}

export async function getMemoryVerses(): Promise<MemoryVerse[]> {
  const { data } = await api.get<MemoryVerse[]>('/memory-verses')
  return data
}
