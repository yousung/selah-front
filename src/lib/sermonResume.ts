const KEY = 'sermon-resume'

export interface SermonResumeData {
  videoId: string
  videoTitle: string
  categoryId: string
  position: number
  categoryTitle?: string
  /** 저장 시점에 현재 모드(오디오/비디오) 다운로드가 완료됐는지. 팝업은 true일 때만 표시 */
  downloaded: boolean
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
