// Browser fixtures only; no production DB reads or writes.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch()
try {
  for (const mode of ['empty', 'populated', 'error']) {
    const page = await browser.newPage({ viewport: { width: 320, height: 844 } })
    let releaseTopics
    const topicsGate = new Promise(resolve => { releaseTopics = resolve })
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url())
      const archive = /\/(previous|archive)$/.test(url.pathname)
      const category = url.searchParams.get('category')
      if (archive && category === 'topics') await topicsGate
      if (archive && mode === 'error') return route.fulfill({ status: 500, json: { message: 'fixture error' } })
      const rows = archive && mode === 'populated' && category !== 'topics'
        ? [{ id: 'old', category, title: '이전 자료', content: '본문', startDate: '2026-09-01', endDate: '2026-09-06', itemOrder: 0 }]
        : []
      await route.fulfill({ json: rows })
    })
    await page.goto('http://localhost:5173/#/memorize')
    const weekly = page.locator('header').getByRole('button', { name: '이전 양식' })
    if (mode === 'populated') {
      await weekly.waitFor()
      await weekly.click()
      await page.waitForURL('**/#/memorize/archive')
      await page.goto('http://localhost:5173/#/memorize')
    } else {
      await page.getByText('이번 주 양식이 아직 등록되지 않았습니다.', { exact: true }).waitFor()
      assert.equal(await weekly.count(), 0)
    }
    await page.getByRole('tab', { name: '기도문', exact: true }).click()
    await page.getByText('등록된 기도문이 없습니다.', { exact: true }).waitFor()
    const daily = page.locator('header').getByRole('button', { name: '이전 일상 기도' })
    if (mode === 'populated') {
      await daily.waitFor()
      for (const scale of [1, 1.5, 2]) {
        await page.locator('header').evaluate((el, scale) => el.style.setProperty('--font-scale', scale), String(scale))
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      }
      await daily.click()
      await page.locator('header').getByRole('button', { name: '현재 일상 기도' }).click()
    } else assert.equal(await daily.count(), 0)
    await page.getByRole('tab', { name: '기도제목', exact: true }).click()
    assert.equal(await page.locator('header .content-archive-link').count(), 0, 'No stale button while new category loads')
    releaseTopics()
    await page.getByText('등록된 기도문이 없습니다.', { exact: true }).waitFor()
    assert.equal(await page.locator('header .content-archive-link').count(), 0, 'Empty category hides archive entry')
    console.log(`PASS ${mode}: header placement, conditional visibility, category loading, 320px layout`)
    await page.close()
  }
} finally {
  await browser.close()
}
