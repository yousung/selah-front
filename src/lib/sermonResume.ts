const KEY = 'sermon-resume'

export interface SermonResumeData {
  videoId: string
  videoTitle: string
  categoryId: string
  position: number
  categoryTitle?: string
}

export function saveSermonResume(data: SermonResumeData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function getSermonResume(): SermonResumeData | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SermonResumeData) : null
  } catch {
    return null
  }
}

export function clearSermonResume() {
  localStorage.removeItem(KEY)
}
