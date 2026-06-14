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

// Catechism/Confession API functions
export async function getConfessions(): Promise<ConfessionListItem[]> {
  const { data } = await api.get<ConfessionListItem[]>('/confessions')
  return data
}

export async function getConfession(code: string): Promise<ConfessionDetail> {
  const { data } = await api.get<ConfessionDetail>(`/confessions/${code}`)
  return data
}
