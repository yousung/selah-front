// Run against the local servers after loading the daily prayer fixture.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
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
    assert.equal(await page.locator('header').getByText('이전 양식', { exact: true }).count(), 0)
    assert.equal(await page.getByRole('heading', { name: '이전 양식', exact: true }).count(), 0)
    await page.getByRole('button', { name: '이전 양식', exact: false }).click()
    await page.waitForURL('**/#/memorize/archive')
    await page.getByRole('heading', { name: '이전 양식', exact: true }).waitFor()
    await page.getByRole('button', { name: '한 주간의 양식으로 돌아가기' }).click()
    await page.waitForURL('**/#/memorize')
    await page.getByRole('tab', { name: '기도문', exact: true }).click()
    await page.getByRole('heading', { name: '칼빈의 기도문을 따라 드리는 일상의 기도' }).waitFor()
    const content = await page.locator('#prayer-category-panel article p').last().textContent()
    assert.equal((content.match(/^\d\. /gm) || []).length, 8)
    assert.ok(content.endsWith('예수 그리스도의 이름으로 기도하옵나이다. 아멘.'))
    assert.equal(await page.locator('header').getByRole('button', { name: '이전 일상 기도' }).count(), 0)
    await page.getByRole('button', { name: '이전 일상 기도' }).click()
    await page.getByText('등록된 이전 일상 기도 내역이 없습니다.', { exact: true }).waitFor()
    await page.getByRole('button', { name: '현재 일상 기도' }).click()
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
