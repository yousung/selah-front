import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const numbered = '1. 가을 행사들을 위해\n  9.18(금) 간담회\n  10/4-5(일-월) 수련회와 세미나\n2. 새로운 출발을 준비하는 가정들을 위해\n3. 학업과 진로를 준비하는 이들을 위해'
const fallback = '함께 기도해 주세요.\n\n2. 원문 번호와 줄바꿈을 보존합니다.\n  하위 설명'
const browser = await chromium.launch()
try {
  for (const width of [320, 390, 690, 1280]) {
    for (const scale of [1, 2]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } })
      let content = numbered
      await page.addInitScript(value => localStorage.setItem('selah-settings', JSON.stringify({ state: { fontScale: value }, version: 0 })), scale)
      await page.route('**/api/**', route => {
        const url = new URL(route.request().url())
        const isPrayer = url.pathname.includes('/prayers/')
        return route.fulfill({ json: isPrayer ? [{ id: 'test', category: 'topics', title: '함께 드리는 기도', content, startDate: '2026-09-06', endDate: '2026-09-12', itemOrder: 0 }] : [] })
      })
      const openTopics = async () => {
        await page.goto('http://localhost:5173/#/memorize')
        await page.getByRole('tab', { name: '기도', exact: true }).click()
        await page.getByRole('tab', { name: '기도제목', exact: true }).click()
        await page.locator('.prayer-topics, .prayer-topics-fallback').waitFor()
      }
      await openTopics()
      assert.equal(await page.locator('.prayer-topic').count(), 3)
      const sizes = await page.locator('article').first().evaluate(el => ({
        title: parseFloat(getComputedStyle(el.querySelector('h2')).fontSize),
        item: parseFloat(getComputedStyle(el.querySelector('h3')).fontSize),
        detail: parseFloat(getComputedStyle(el.querySelector('.prayer-topic-details')).fontSize),
      }))
      assert.equal(sizes.title, 24 * scale)
      assert.equal(sizes.detail, 17 * scale)
      assert.ok(sizes.title > sizes.item && sizes.title > sizes.detail)
      assert.equal(await page.locator('#prayer-category-panel > div > p').filter({ hasText: /^기도제목$/ }).count(), 0)
      assert.equal(await page.locator('.prayer-topic-details').textContent(), '  9.18(금) 간담회\n  10/4-5(일-월) 수련회와 세미나')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      await page.getByRole('button', { name: '이전 기도 제목' }).click()
      await page.getByRole('button', { name: /함께 드리는 기도/ }).click()
      assert.equal(await page.locator('.prayer-topic').count(), 3, 'archive uses same layout')
      if (width === 390 && scale === 1) await page.screenshot({ path: '/tmp/selah-prayer-topics.png', fullPage: true })
      content = fallback
      await page.reload()
      await openTopics()
      assert.equal(await page.locator('.prayer-topics-fallback').textContent(), fallback)
      console.log(`PASS ${width}px/${scale}x: topics, dates preserved, archive, fallback, overflow`)
      await page.close()
    }
  }
} finally { await browser.close() }
