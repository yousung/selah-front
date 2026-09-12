// Browser-only fixtures: no database writes. Start the local web server first.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const categories = [
  ['daily', '일상기도', '일상 기도'], ['topics', '기도제목', '기도 제목'],
  ['pastoral', '목회기도', '목회 기도'], ['representative', '대표기도', '대표 기도'],
]
const browser = await chromium.launch()
try {
  for (const width of [320, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    await page.route('**/api/prayers/**', async (route) => {
      const url = new URL(route.request().url())
      const category = url.searchParams.get('category')
      const row = (id, endDate, itemOrder) => ({
        id, category, title: `${category}-${id}`, content: `본문 ${id}\n둘째 줄`,
        startDate: '2026-09-01', endDate, itemOrder,
      })
      const rows = url.pathname.endsWith('/archive')
        ? [row('older', '2026-09-05', 0), row('second', '2026-09-06', 1), row('first', '2026-09-06', 0)]
        : [row('current', '2026-09-13', 0)]
      await route.fulfill({ json: rows })
    })
    await page.goto('http://localhost:5173/#/memorize')
    await page.getByRole('tab', { name: '기도문', exact: true }).click()
    for (const [value, tabLabel, label] of categories) {
      await page.getByRole('tab', { name: tabLabel, exact: true }).click()
      await page.getByRole('heading', { name: `${value}-current`, exact: true }).waitFor()
      await page.locator('header').getByRole('button', { name: `이전 ${label}`, exact: false }).click()
      await page.locator('header').getByRole('button', { name: `현재 ${label}` }).waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      const list = page.getByLabel(`${label} 이전 목록`, { exact: true })
      await list.getByRole('button').first().waitFor()
      assert.equal(await list.getByRole('button').count(), 2, 'Both dates define the period')
      assert.doesNotMatch(await page.locator('#prayer-category-panel').innerText(), /2026|9월|2026-09/)
      assert.ok((await list.getByRole('button').first().innerText()).includes('2편'))
      assert.equal(await page.locator('#prayer-category-panel article').count(), 0, 'List must not expose every archived body')
      await list.getByRole('button').first().click()
      assert.deepEqual(await page.locator('#prayer-category-panel article h2').allTextContents(), [`${value}-first`, `${value}-second`])
      assert.doesNotMatch(await page.locator('#prayer-category-panel').innerText(), /2026|9월|2026-09/)
      await page.getByRole('button', { name: '이전 목록', exact: true }).click()
      await list.getByRole('button').last().click()
      assert.deepEqual(await page.locator('#prayer-category-panel article h2').allTextContents(), [`${value}-older`])
      // Next category must discard this selected period and restore its current view.
    }
    console.log(`PASS ${width}px: four categories, date grouping/order, detail selection, back, category reset`)
    await page.close()
  }
} finally {
  await browser.close()
}
