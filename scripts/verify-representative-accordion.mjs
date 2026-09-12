import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const content = '은혜가 풍성하신 하나님 아버지,\n이 나라에 평화를 허락해 주옵소서.\n\n이웃을 사랑하며 살아가게 하옵소서. 아멘.'
const prayers = ['나라를 위한 기도', '부흥과 회심을 위한 기도'].map((title, i) => ({ id: String(i), title, content, category: 'representative', startDate: '2026-09-12', endDate: '3000-01-01', itemOrder: i }))
const browser = await chromium.launch()
try {
  for (const width of [320, 690, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    await page.addInitScript(() => localStorage.setItem('selah-settings', JSON.stringify({ state: { fontScale: 2 }, version: 0 })))
    await page.route('**/api/**', route => route.fulfill({ json: route.request().url().includes('/prayers/') ? prayers : [] }))
    await page.goto('http://localhost:5173/#/memorize')
    await page.getByRole('tab', { name: '기도', exact: true }).click()
    await page.getByRole('tab', { name: '대표기도', exact: true }).click()
    const trigger = page.getByRole('button', { name: '나라를 위한 기도', exact: true })
    await trigger.waitFor()
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false')
    await trigger.focus()
    await page.keyboard.press('Enter')
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true')
    assert.equal(await page.getByRole('region', { name: '나라를 위한 기도' }).textContent(), content)
    await page.getByRole('button', { name: '부흥과 회심을 위한 기도', exact: true }).click()
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true')
    await trigger.click()
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.getByRole('button', { name: '이전 대표 기도' }).click()
    await page.getByRole('button', { name: /나라를 위한 기도.*2편/ }).click()
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false')
    await trigger.click()
    assert.equal(await page.getByRole('region', { name: '나라를 위한 기도' }).textContent(), content)
    console.log(`PASS ${width}px/2x: representative current/archive accordion, keyboard, full text, independent toggles`)
    await page.close()
  }
} finally { await browser.close() }
