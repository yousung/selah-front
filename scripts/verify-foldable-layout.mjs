import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch()
try {
  for (const scale of [1, 1.5, 2]) {
    const page = await browser.newPage({ viewport: { width: 320, height: 640 } })
    await page.addInitScript(value => localStorage.setItem('selah-settings', JSON.stringify({ state: { fontScale: value }, version: 0 })), scale)
    await page.goto('http://localhost:5173/#/settings')
    await page.locator('.settings-page').waitFor()
    for (const width of [320, 360, 599, 600, 690, 768, 1023, 1024, 1280, 690, 320]) {
      await page.setViewportSize({ width, height: width < 600 ? 568 : 829 })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(100)
      const layout = await page.evaluate(() => {
        const sidebar = document.querySelector('.app-sidebar')
        const nav = document.querySelector('nav[aria-label="주 메뉴"]')
        return {
          sidebarWidth: sidebar.getBoundingClientRect().width,
          navVisible: getComputedStyle(nav).display !== 'none',
          contentLeft: document.querySelector('.app-main-column').getBoundingClientRect().left,
          overflow: document.documentElement.scrollWidth > innerWidth,
          scale: document.querySelector('.user-app').dataset.fontScale,
          path: location.hash,
        }
      })
      const rail = width < 600 ? 0 : width < 1024 ? 112 : 240
      assert.equal(layout.sidebarWidth, rail, `${width}/${scale}: sidebar`)
      assert.equal(layout.contentLeft, rail, `${width}/${scale}: content offset`)
      assert.equal(layout.navVisible, width < 600, `${width}/${scale}: navigation mode`)
      assert.equal(layout.overflow, false, `${width}/${scale}: page overflow`)
      assert.equal(layout.scale, String(scale), 'folding preserves font setting')
      assert.equal(layout.path, '#/settings', 'folding preserves route')
      if (width === 690 && scale === 2) await page.screenshot({ path: '/tmp/selah-foldable-tablet.png' })
    }
    console.log(`PASS ${scale}x: fold/unfold, breakpoint boundaries, route and font persistence`)
    await page.close()
  }
} finally {
  await browser.close()
}
