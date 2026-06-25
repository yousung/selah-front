import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://e41cinm9d8.execute-api.ap-northeast-2.amazonaws.com/prod/api'

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

// 한 주간의 양식
export type WeeklyItemType =
  | 'bible_reading'      // 성경 읽기(통독 범위)
  | 'shorter_catechism'  // 소요리문답 암송
  | 'memory_verse'       // 말씀 암송
  | 'reading'            // 독서(신앙 서적)
  | 'larger_catechism'   // 대요리문답(영상)

export interface MemoryVerse {
  id: string
  ordering: number
  type: WeeklyItemType
  itemOrder: number         // 주 안 표시 순서
  period: string            // "6월 22일~27일"
  startDate: string         // "2026-06-22"
  endDate: string           // "2026-06-27"
  reference: string | null  // "요한복음 14:6" / "제34문"
  title: string | null      // 소요리 질문, 독서 책/장, 대요리 제목
  link: string | null       // 외부 링크(대요리 영상)
  imageUrl: string | null   // 이미지(독서 책 표지)
  content: string | null    // 본문/통독 범위/소요리 답(여러 줄 가능)
}

export async function getMemoryVerses(): Promise<MemoryVerse[]> {
  const { data } = await api.get<MemoryVerse[]>('/memory-verses')
  return data
}

export async function getCurrentMemoryVerses(): Promise<MemoryVerse[]> {
  const { data } = await api.get<MemoryVerse[]>('/memory-verses/current')
  return data
}
