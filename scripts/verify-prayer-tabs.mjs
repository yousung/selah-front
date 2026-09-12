import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch()
try {
  for (const width of [320, 360, 390, 768]) {
    for (const scale of [1, 1.5, 2]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } })
      // UI fixtures only: do not depend on or modify the production DB.
      await page.route('**/api/prayers/**', route => route.fulfill({ json: [] }))
      await page.goto('http://localhost:5173/#/memorize')
      await page.getByRole('tab', { name: '기도문', exact: true }).click()
      const menu = page.getByRole('tablist', { name: '기도문 종류' })
      await menu.evaluate((element, value) => element.style.setProperty('--font-scale', String(value)), scale)
      await page.evaluate(() => document.fonts.ready)
      const metrics = await menu.evaluate(element => ({
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
        tabs: [...element.querySelectorAll('button')].map(button => {
          const box = button.getBoundingClientRect()
          return { top: box.top, height: box.height, width: button.clientWidth, scrollWidth: button.scrollWidth }
        }),
      }))
      assert.equal(metrics.tabs.length, 4)
      assert.ok(metrics.tabs.every(tab => Math.abs(tab.top - metrics.tabs[0].top) < 1), 'All tabs must remain on one row')
      assert.ok(metrics.tabs.every(tab => tab.height >= 44 && tab.scrollWidth <= tab.width), 'No clipped labels; retain touch target')
      if (scale === 1) assert.ok(metrics.scrollWidth <= metrics.width, 'Default size must fit without horizontal scrolling')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await menu.getByRole('tab', { name: '대표기도', exact: true }).click()
      assert.equal(await menu.getByRole('tab', { name: '대표기도', exact: true }).getAttribute('aria-selected'), 'true')
      console.log(`PASS ${width}px / ${scale}x: one row, readable labels, reachable last tab, no page overflow`)
      await page.close()
    }
  }
} finally {
  await browser.close()
}
