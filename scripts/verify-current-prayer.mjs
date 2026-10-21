// 지금의 기도(src/lib/currentPrayer.ts) 시간대 경계 검증 — 실제 일상 기도문(GET, 읽기 전용)으로 확인
// 실행: node scripts/verify-current-prayer.mjs  (백엔드 :3000 필요, TS는 vite ssrLoadModule로 로드)
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const API = process.env.API_URL ?? 'http://localhost:3000/api'
const prayers = await (await fetch(`${API}/prayers/current?category=daily`)).json()
const prayer = [...prayers].sort((a, b) =>
  b.startDate.localeCompare(a.startDate) || b.endDate.localeCompare(a.endDate) || a.itemOrder - b.itemOrder,
)[0]
assert.ok(prayer?.content, 'daily prayer content required')
const content = prayer.content.replace(/\r\n?/g, '\n')

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
try {
  const { selectCurrentPrayer } = await server.ssrLoadModule('/src/lib/currentPrayer.ts')

  // 원문에서 기대 본문을 직접 잘라낸다: 라벨 줄 다음부터 다음 라벨/섹션 전까지
  const block = (label) => {
    const lines = content.split('\n')
    const start = lines.findIndex((l) => l.replace(/\s+/g, '') === `(${label.replace(/\s+/g, '')})`)
    assert.ok(start >= 0, `label ${label} not in content`)
    const end = lines.findIndex((l, i) => i > start && (/^\s*[(（][^()]+[)）]\s*$/.test(l) || /^\s*\d+\.\s+/.test(l)))
    return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim()
  }
  const firstLine = (label) => block(label).split('\n')[0].replace(/\s*\([^()]*\)/g, '').trim()

  // 2026-10-19 = 월, 2026-10-21 = 수, 2026-10-25 = 일
  const at = (date, hm) => new Date(`${date}T${hm}:00`)
  const W = '2026-10-21'
  const occs = [null, 'worker', 'homemaker', 'student', 'pastor']
  const occSub = { worker: '직장인', homemaker: '주부', student: '학생', pastor: '목사' }
  const cases = [
    [W, '04:00', '하루를 시작하는 기도'],
    [W, '07:00', '하루를 시작하는 기도'],
    [W, '07:01', '일과를 시작하는 기도', 'occ'],
    [W, '12:00', '일과를 시작하는 기도', 'occ'],
    [W, '12:01', '식사 기도', '간단한 기도'],
    [W, '14:00', '식사 기도', '간단한 기도'],
    [W, '14:01', '일과를 시작하는 기도', 'occ'],
    [W, '19:00', '일과를 시작하는 기도', 'occ'],
    [W, '19:01', '하루를 마치는 기도'],
    [W, '23:59', '하루를 마치는 기도'],
    [W, '03:59', '하루를 마치는 기도'],
    ['2026-10-24', '23:59', '하루를 마치는 기도'], // 토요일 밤은 평일 규칙
    ['2026-10-25', '00:00', '주일을 위한 기도', '주일을 시작하는 기도'],
    ['2026-10-25', '16:59', '주일을 위한 기도', '주일을 시작하는 기도'],
    ['2026-10-25', '17:00', '주일을 위한 기도', '주일을 마치는 기도'],
    ['2026-10-25', '23:59', '주일을 위한 기도', '주일을 마치는 기도'],
    ['2026-10-26', '03:59', '주일을 위한 기도', '주일을 마치는 기도'],
    ['2026-10-26', '04:00', '하루를 시작하는 기도'],
  ]

  const expectNum = { '하루를 시작하는 기도': 1, '식사 기도': 2, '일과를 시작하는 기도': 3, '하루를 마치는 기도': 4, '주일을 위한 기도': 5 }
  const rows = []
  for (const [date, hm, title, sub] of cases) {
    for (const occ of sub === 'occ' ? occs : [null]) {
      const slot = selectCurrentPrayer(content, at(date, hm), occ)
      const expectSub = sub === 'occ' ? occSub[occ ?? 'worker'] : sub
      assert.ok(slot, `${date} ${hm} ${occ}: slot null`)
      assert.equal(slot.title, title, `${date} ${hm} title`)
      assert.equal(slot.section, expectNum[title], `${date} ${hm} section number`)
      assert.ok(slot.body.length > 0, 'empty body')
      assert.ok(!/[()（）]/.test(slot.title + slot.body), `${date} ${hm}: parenthesis leaked`)
      assert.ok(!/^\s*\d+\.\s/m.test(slot.body), `${date} ${hm}: section header leaked into body`)
      if (expectSub) {
        assert.ok(slot.body.startsWith(firstLine(expectSub)), `${date} ${hm} ${occ}: expected (${expectSub}) text`)
        assert.ok(slot.body.length < block(expectSub).length + 10, `${date} ${hm}: body longer than (${expectSub}) block`)
      }
      if (sub === '간단한 기도') {
        for (const other of ['식사 전', '식사후']) assert.ok(!slot.body.includes(firstLine(other)), `meal slot contains (${other})`)
      }
      rows.push(`${date} ${hm}  ${String(occ ?? '-').padEnd(9)} ${slot.title} / ${expectSub ?? '(전체)'}  [${slot.body.length}자] ${slot.body.slice(0, 18).replace(/\n/g, ' ')}…`)
    }
  }

  // 견고성: 섹션 누락 → null, 하위 라벨 누락 → 섹션 전체, 괄호 포함 본문 제거
  assert.equal(selectCurrentPrayer('1. 하루를 시작하는 기도\n\n본문', at(W, '20:00'), null), null)
  const noSub = selectCurrentPrayer('3. 일과를 시작하는 기도\n\n(직장인)\n일터 기도 (주석) 아멘.', at(W, '09:00'), 'pastor')
  assert.equal(noSub?.body, '일터 기도 아멘.')
  assert.equal(selectCurrentPrayer('2. 식사 기도 (점심)\n( 간단한  기도 )\n짧은 기도', at(W, '13:00'), null)?.title, '식사 기도')

  console.log(rows.join('\n'))
  console.log(`\nPASS ${rows.length} slot assertions + 3 robustness checks`)
} finally {
  await server.close()
}
