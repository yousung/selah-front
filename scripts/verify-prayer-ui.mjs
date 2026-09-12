// Run against the local servers after loading the daily prayer fixture.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const weekly = [{
  id: 'weekly-1',
  ordering: 1,
  type: 'shorter_catechism',
  itemOrder: 1,
  period: '9월 7일~12일',
  startDate: '2026-09-07',
  endDate: '2026-09-12',
  reference: '제1~38문',
  title: '1~38문의 네 가지 구조로 말해보기',
  content: '【서론: 사람에게 주어진 목적 (1~3문)】\n\n1. 사람의 첫째가는 목적 (1문)\n2. 우리의 목적을 가르치는 성경 (2~3문)\n\n【Ⅰ. 하나님의 창조 (4~12문)】\n\n1. 하나님의 존재와 속성, 그리고 삼위일체 (4~6문)',
}]

const dailyPrayerContent = [
  ['1. 하루를 시작하는 기도', '나의 하나님, 나의 아버지시며 보존자시여.\n주께서 오늘 하루를 지켜 주옵소서.'],
  ['2. 일과를 시작을 위한 기도(목사)', '오, 모든 빛과 지혜의 아버지이신 주님.\n주의 교회를 섬기게 하옵소서.'],
  ['3. 일과를 시작하는 기도(직장인)', '모든 빛과 지혜의 아버지이신 주님.\n일터에서 신실하게 하옵소서.'],
  ['4. 일과를 시작하는 기도(주부)', '모든 은혜의 근원이신 주 하나님.\n가정을 돌보게 하옵소서.'],
  ['5. 일과를 시작하는 기도(학생)', '지혜의 근본이 되시는 주 하나님.\n배움 안에서 자라게 하옵소서.'],
  ['6. 식사 전 기도', '모든 피조물의 눈이 주를 앙망하오니.\n감사함으로 받게 하옵소서.'],
  ['7. 식사 후 기도', '모든 선한 것을 후히 주시는 창조주 하나님.\n감사함으로 살게 하옵소서.'],
  ['8. 하루를 마치는 기도', '오 주 하나님, 밤의 안식을 주심을 감사드립니다.\n예수 그리스도의 이름으로 기도하옵나이다. 아멘.'],
].map(([heading, body]) => `${heading}\n\n${body}`).join('\n\n')

async function fulfillApi(route) {
  const url = new URL(route.request().url())
  const path = url.pathname
  if (path.endsWith('/api/memory-verses/current')) return route.fulfill({ json: weekly })
  if (path.endsWith('/api/memory-verses/previous')) {
    return route.fulfill({ json: [{ period: '8월 31일~9월 5일', startDate: '2026-08-31', endDate: '2026-09-05', itemCount: 1 }] })
  }
  if (path.endsWith('/api/memory-verses/week/2026-08-31')) {
    return route.fulfill({ json: weekly.map((item) => ({ ...item, startDate: '2026-08-31', endDate: '2026-09-05', period: '8월 31일~9월 5일' })) })
  }
  if (path.endsWith('/api/prayers/current')) {
    const category = url.searchParams.get('category') ?? 'daily'
    if (category !== 'daily') return route.fulfill({ json: [] })
    return route.fulfill({
      json: [{
        id: 'daily-1',
        category: 'daily',
        title: '칼빈의 기도문을 따라 드리는 일상의 기도',
        content: `칼빈의 기도문을 따라 드리는 일상의 기도\n\n${dailyPrayerContent}`,
        startDate: '2026-09-07',
        endDate: '2026-09-12',
        itemOrder: 1,
      }],
    })
  }
  if (path.endsWith('/api/prayers/archive')) return route.fulfill({ json: [] })
  return route.continue()
}

const browser = await chromium.launch({ headless: true })
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    await page.route('**/api/**', fulfillApi)
    await page.goto('http://localhost:5173/#/memorize')
    const catechism = page.locator('.weekly-item').filter({ hasText: '소요리문답 암송' }).locator('p')
    await catechism.waitFor()
    assert.equal(await catechism.evaluate((element) => getComputedStyle(element).whiteSpace), 'pre-line')
    assert.ok((await catechism.textContent()).includes('\n'), 'Weekly source must retain line breaks')
    const layout = page.locator('.weekly-item-layout--catechism')
    const labelBox = await layout.locator('.weekly-label').boundingBox()
    const bodyBox = await layout.locator('.weekly-body').boundingBox()
    assert.ok(bodyBox.y >= labelBox.y + labelBox.height, 'Catechism body must sit below its label at every width')
    assert.ok(Math.abs(bodyBox.x - labelBox.x) < 1, 'Catechism label and body must align left')
    assert.ok((await catechism.textContent()).includes('\n\n'), 'Paragraph gaps must remain intact')
    await page.locator('header').getByRole('button', { name: '이전 양식' }).waitFor()
    assert.equal(await page.getByRole('heading', { name: '이전 양식', exact: true }).count(), 0)
    await page.getByRole('button', { name: '이전 양식', exact: false }).click()
    await page.waitForURL('**/#/memorize/archive')
    await page.getByRole('heading', { name: '이전 양식', exact: true }).waitFor()
    await page.getByRole('button', { name: '한 주간의 양식으로 돌아가기' }).click()
    await page.waitForURL('**/#/memorize')
    await page.getByRole('tab', { name: '기도', exact: true }).click()
    await page.getByRole('heading', { name: '칼빈의 기도문을 따라 드리는 일상의 기도' }).waitFor()
    assert.equal(await page.locator('.daily-prayer-section').count(), 8)
    const content = await page.locator('.daily-prayer-section p').last().textContent()
    assert.ok(content.endsWith('예수 그리스도의 이름으로 기도하옵나이다. 아멘.'))
    assert.equal(await page.locator('header').getByRole('button', { name: '이전 일상 기도' }).count(), 0)
    await page.getByRole('tab', { name: '기도제목', exact: true }).click()
    await page.getByText('등록된 기도문이 없습니다.', { exact: true }).waitFor()
    const overflow = await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth > window.innerWidth,
      vertical: document.documentElement.scrollHeight > window.innerHeight,
    }))
    assert.equal(overflow.horizontal, false)
    assert.equal(overflow.vertical, false, 'Empty content must not force page scrolling')
    console.log(`PASS ${width}px: weekly newlines, prayer eight sections, archive isolation, empty-state overflow`)
    await page.close()
  }
} finally {
  await browser.close()
}
