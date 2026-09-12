import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 640 } })
  await page.route('**/api/**', route => route.fulfill({ json: [] }))
  const categories = { daily: '일상기도', topics: '기도제목', pastoral: '목회기도', representative: '대표기도' }
  const assertPath = async path => {
    await page.waitForURL(`**/#${path}`)
    assert.equal(new URL(page.url()).hash, `#${path}`)
  }
  for (const [category, label] of Object.entries(categories)) {
    await page.goto(`http://localhost:5173/#/memorize/prayer/${category}`)
    const selected = page.getByRole('tab', { name: label, exact: true })
    await selected.waitFor()
    assert.equal(await selected.getAttribute('aria-selected'), 'true')
    assert.equal(await page.getByRole('tab', { name: '기도', exact: true }).getAttribute('aria-selected'), 'true')
    await page.reload()
    await selected.waitFor()
    assert.equal(await selected.getAttribute('aria-selected'), 'true')
  }
  await page.goto('http://localhost:5173/#/memorize')
  await assertPath('/memorize/weekly')
  await page.getByRole('tab', { name: '기도', exact: true }).click()
  await assertPath('/memorize/prayer/daily')
  await page.getByRole('tab', { name: '기도제목', exact: true }).click()
  await assertPath('/memorize/prayer/topics')
  await page.getByRole('tab', { name: '대표기도', exact: true }).click()
  await assertPath('/memorize/prayer/representative')
  await page.goBack()
  await assertPath('/memorize/prayer/topics')
  assert.equal(await page.getByRole('tab', { name: '기도제목', exact: true }).getAttribute('aria-selected'), 'true')
  await page.goForward()
  await assertPath('/memorize/prayer/representative')
  assert.equal(await page.getByRole('tab', { name: '대표기도', exact: true }).getAttribute('aria-selected'), 'true')
  await page.getByRole('tab', { name: '이번 주 양식', exact: true }).click()
  await assertPath('/memorize/weekly')
  for (const path of ['/memorize/prayer', '/memorize/prayer/unknown']) {
    await page.goto(`http://localhost:5173/#${path}`)
    await assertPath('/memorize/prayer/daily')
  }
  await page.goto('http://localhost:5173/#/memorize/archive')
  await assertPath('/memorize/archive')
  console.log('PASS direct links, reload, tab navigation, back/forward, legacy links, invalid category, archive compatibility')
} finally { await browser.close() }
