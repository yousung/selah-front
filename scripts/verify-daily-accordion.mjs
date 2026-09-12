import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const fixture = await readFile('../backend/fixtures/prayers/calvin-daily.md', 'utf8')
const content = fixture.slice(fixture.indexOf('1. 하루를 시작하는 기도'))
const browser = await chromium.launch()
try {
  for (const width of [320, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url())
      const category = url.searchParams.get('category')
      const rows = url.pathname.includes('/prayers/') ? [{
        id: 'fixture', category, title: '일상의 기도', content,
        startDate: '2026-09-01', endDate: '2026-09-06', itemOrder: 0,
      }] : []
      return route.fulfill({ json: rows })
    })
    await page.goto('http://localhost:5173/#/memorize')
    await page.getByRole('tab', { name: '기도', exact: true }).click()
    const sections = page.locator('.daily-prayer-section')
    await sections.first().waitFor()
    assert.equal(await sections.count(), 8)
    assert.equal(await page.locator('.daily-prayer-trigger[aria-expanded="true"]').count(), 0)
    await sections.first().getByRole('button').focus()
    await page.keyboard.press('Enter')
    assert.equal(await sections.first().getByRole('button').getAttribute('aria-expanded'), 'true')
    await sections.nth(1).getByRole('button').click()
    assert.equal(await page.locator('.daily-prayer-trigger[aria-expanded="true"]').count(), 2)
    await sections.first().getByRole('button').click()
    assert.equal(await sections.first().getByRole('button').getAttribute('aria-expanded'), 'false')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    assert.equal(await sections.first().locator('.daily-prayer-panel').evaluate(el => getComputedStyle(el).transitionDuration), '0s')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    assert.equal(await sections.first().locator('.daily-prayer-panel').evaluate(el => getComputedStyle(el).transitionDuration.split(',')[0]), '0.2s')
    const reconstructed = (await sections.allTextContents()).join('\n')
    assert.equal(reconstructed.replace(/\s/g, ''), content.replace(/\s/g, ''))
    for (const scale of [1, 1.5, 2]) {
      await page.locator('#prayer-category-panel').evaluate((el, scale) => el.style.setProperty('--font-scale', scale), String(scale))
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    }
    await page.locator('header').getByRole('button', { name: '이전 일상 기도' }).click()
    await page.getByLabel('일상 기도 이전 목록', { exact: true }).getByRole('button').click()
    assert.equal(await sections.count(), 8)
    await page.getByRole('tab', { name: '기도제목', exact: true }).click()
    await page.locator('article .prayer-topics, article .prayer-topics-fallback').waitFor()
    assert.equal(await sections.count(), 0)
    console.log(`PASS ${width}px: eight sections, default collapsed, keyboard, independent toggles, full text, archive, other categories, font scales`)
    await page.close()
  }
} finally { await browser.close() }
