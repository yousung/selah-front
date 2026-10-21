import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentPrayers } from '@/lib/api'
import { OCCUPATION_LABELS, useSettingsStore, type Occupation } from '@/store/settingsStore'

/** "지금의 기도" — 일상 기도문에서 현재 시각에 맞는 한 단락 */
export type PrayerSlot = { title: string; body: string; section: number }

type Section = { num: number; title: string; lines: string[]; subs: { label: string; lines: string[] }[] }

const SECTION_RE = /^\s*(\d+)\.\s+(.+)$/
const SUB_LABEL_RE = /^\s*[(（]([^()（）]+)[)）]\s*$/
// 괄호(전각 포함)와 그 앞 공백을 통째로 제거 — 중첩은 안쪽부터 반복해서 벗긴다
const PAREN_RE = /\s*[(（][^()（）]*[)）]/g

/** 섹션 번호 + 제목 키워드 (제목이 우선, 못 찾으면 번호) */
const SECTIONS = {
  morning: { num: 1, keyword: '하루를시작' },
  meal: { num: 2, keyword: '식사' },
  work: { num: 3, keyword: '일과' },
  evening: { num: 4, keyword: '하루를마치' },
  lordsDay: { num: 5, keyword: '주일' },
} as const

const squash = (s: string) => s.replace(/\s+/g, '')

function stripParens(text: string): string {
  let prev = ''
  let out = text
  while (out !== prev) {
    prev = out
    out = out.replace(PAREN_RE, '')
  }
  return out
}

function cleanBody(lines: string[]): string {
  return stripParens(lines.join('\n'))
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseSections(content: string): Section[] {
  const sections: Section[] = []
  let current: Section | null = null
  for (const line of content.replace(/\r\n?/g, '\n').split('\n')) {
    const head = line.match(SECTION_RE)
    if (head) {
      current = { num: Number(head[1]), title: head[2], lines: [], subs: [] }
      sections.push(current)
      continue
    }
    if (!current) continue
    current.lines.push(line)
    const label = line.match(SUB_LABEL_RE)
    if (label) {
      current.subs.push({ label: squash(label[1]), lines: [] })
    } else if (current.subs.length) {
      current.subs[current.subs.length - 1].lines.push(line)
    }
  }
  return sections
}

function findSection(sections: Section[], target: { num: number; keyword: string }): Section | undefined {
  return sections.find((s) => squash(s.title).includes(target.keyword)) ?? sections.find((s) => s.num === target.num)
}

/**
 * 현재 시각(기기 로컬, 분 단위)에 맞는 섹션/하위 기도를 고른다.
 * 주일 맥락 = 일요일 00:00 ~ 월요일 03:59 (17:00 정각부터 "주일을 마치는 기도").
 * 평일: 04:00–07:00 시작 / 07:01–12:00 일과 / 12:01–14:00 식사(간단한 기도) / 14:01–19:00 일과 / 19:01–03:59 마치는.
 */
function pickTarget(now: Date, occupation: Occupation | null): { section: (typeof SECTIONS)[keyof typeof SECTIONS]; sub?: string } {
  const day = now.getDay()
  const m = now.getHours() * 60 + now.getMinutes()
  if (day === 0) return { section: SECTIONS.lordsDay, sub: m < 17 * 60 ? '주일을시작하는기도' : '주일을마치는기도' }
  if (day === 1 && m < 4 * 60) return { section: SECTIONS.lordsDay, sub: '주일을마치는기도' }
  const work = { section: SECTIONS.work, sub: OCCUPATION_LABELS[occupation ?? 'worker'] }
  if (m >= 4 * 60 && m <= 7 * 60) return { section: SECTIONS.morning }
  if (m > 7 * 60 && m <= 12 * 60) return work
  if (m > 12 * 60 && m <= 14 * 60) return { section: SECTIONS.meal, sub: '간단한기도' }
  if (m > 14 * 60 && m <= 19 * 60) return work
  return { section: SECTIONS.evening }
}

/** 기도문 본문에서 지금 보여줄 단락만 뽑는다. 섹션이 없으면 null, 하위 기도가 없으면 섹션 전체. */
export function selectCurrentPrayer(content: string, now: Date, occupation: Occupation | null): PrayerSlot | null {
  const target = pickTarget(now, occupation)
  const section = findSection(parseSections(content), target.section)
  if (!section) return null
  const sub = target.sub
    ? section.subs.find((s) => s.label === target.sub) ?? section.subs.find((s) => s.label.includes(target.sub!))
    : undefined
  const body = cleanBody(sub ? sub.lines : section.lines)
  if (!body) return null
  return { title: stripParens(section.title).trim(), body, section: section.num }
}

/** 오늘의 일상 기도에서 현재 시각·직업에 맞는 단락 (분 경계를 넘으면 자동 갱신) */
export function useCurrentPrayer(): { slot: PrayerSlot | null; isLoading: boolean } {
  const occupation = useSettingsStore((s) => s.occupation)
  const { data, isLoading } = useQuery({
    queryKey: ['prayers', 'current', 'daily'],
    queryFn: () => getCurrentPrayers('daily'),
  })
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = window.setInterval(tick, 60_000)
    // 백그라운드에서 돌아오면 타이머 지연과 무관하게 즉시 재평가
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const prayer = data
    ? [...data].sort((a, b) =>
        b.startDate.localeCompare(a.startDate) || b.endDate.localeCompare(a.endDate) || a.itemOrder - b.itemOrder,
      )[0]
    : undefined
  const content = prayer?.content
  const slot = useMemo(
    () => (content ? selectCurrentPrayer(content, now, occupation) : null),
    [content, now, occupation],
  )
  return { slot, isLoading }
}
