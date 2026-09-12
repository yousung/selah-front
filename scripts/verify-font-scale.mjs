import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const longTitle = '아주 긴 제목으로 테스트하는 찬송과 설교 콘텐츠입니다 줄바꿈이 자연스럽게 이어져야 합니다'
const videos = Array.from({ length: 8 }, (_, i) => ({
  id: `video-${i + 1}`,
  youtubeId: `yt-${i + 1}`,
  title: `[주님의 교회] ${longTitle} ${i + 1}`,
  description: `${longTitle} 상세 설명 ${i + 1}`,
  thumbnail: null,
  tag: i % 2 ? 'mr' : 'ar',
  chapter: i + 1,
  hymnTitle: `${i + 1}장 ${longTitle}`,
  duration: 245 + i,
  viewCount: 12345,
  likeCount: 321,
  isSecret: false,
  isTemp: false,
  isLive: false,
}))

const confessions = [{
  id: 'confession-1',
  code: 'wsc',
  title: '웨스트민스터 소요리문답',
  type: 'CATECHISM',
  description: '하나님을 영화롭게 하고 영원토록 즐거워하는 삶을 배우는 교리 문답입니다.',
  groupCode: 'westminster',
  groupTitle: '웨스트민스터 표준문서',
  groupOrdering: 1,
  ordering: 1,
  sectionCount: 2,
}]

const confessionDetail = {
  ...confessions[0],
  sections: [
    {
      id: 'section-1',
      ordering: 1,
      heading: '사람의 첫째 되는 목적',
      number: '제1문',
      question: '사람의 제일 되는 목적이 무엇입니까?',
      content: '사람의 제일 되는 목적은 하나님을 영화롭게 하는 것과 영원토록 그를 즐거워하는 것입니다.',
      scripture: '고린도전서 10:31',
      tags: [{ id: 'tag-1', name: '목적' }],
      majorSection: '서론',
    },
    {
      id: 'section-2',
      ordering: 2,
      heading: '성경의 목적',
      number: '제2문',
      question: '하나님께서 우리에게 무슨 규칙을 주셨습니까?',
      content: '신구약 성경에 기록된 하나님의 말씀은 우리가 하나님을 영화롭게 하고 즐거워하는 법을 지도하는 유일한 규칙입니다.',
      scripture: '디모데후서 3:16',
      tags: [{ id: 'tag-2', name: '성경' }],
      majorSection: '서론',
    },
  ],
}

const prayers = [{
  id: 'prayer-1',
  category: 'daily',
  title: '칼빈의 기도문을 따라 드리는 일상의 기도',
  content: '칼빈의 기도문을 따라 드리는 일상의 기도\n\n1. 하루를 시작하는 기도\n\n나의 하나님, 나의 아버지시며 보존자시여.\n주께서 지난밤의 모든 위험에서 저를 지켜 주시고, 은혜로 이 새로운 하루의 빛을 보게 하셨사오니, 이 하루 전체가 오직 주님을 섬기고 주님을 영화롭게 하는 데 사용되게 하옵소서.\n\n2. 일과를 시작하는 기도(직장인)\n\n모든 빛과 지혜의 아버지이신 주님.\n오늘도 일터로 나아가는 이 시간, 주의 성령으로 내 마음을 밝히사 내게 맡겨진 일을 감당하게 하옵소서.',
  startDate: '2026-09-07',
  endDate: '2026-09-12',
  itemOrder: 1,
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
}]

const weekly = [
  {
    id: 'weekly-1',
    ordering: 1,
    type: 'shorter_catechism',
    itemOrder: 1,
    period: '9월 7일~12일',
    startDate: '2026-09-07',
    endDate: '2026-09-12',
    reference: '제1~38문',
    title: '1~38문의 네 가지 구조로 말해보기',
    link: null,
    imageUrl: null,
    content: '【서론: 사람에게 주어진 목적 (1~3문)】\n\n1. 사람의 첫째가는 목적 (1문)\n2. 우리의 목적을 가르치는 성경 (2~3문)\n\n【Ⅰ. 하나님의 창조 (4~12문)】\n\n1. 하나님의 존재와 속성, 그리고 삼위일체 (4~6문)\n2. 하나님의 작정과 그 실행 (7~11문)\n3. 행위 언약 (12문)',
  },
  {
    id: 'weekly-2',
    ordering: 2,
    type: 'memory_verse',
    itemOrder: 2,
    period: '9월 7일~12일',
    startDate: '2026-09-07',
    endDate: '2026-09-12',
    reference: '요한복음 14:6',
    title: null,
    link: null,
    imageUrl: null,
    content: '예수께서 이르시되 내가 곧 길이요 진리요 생명이니\n나로 말미암지 않고는 아버지께로 올 자가 없느니라',
  },
]

function settingsWithFontScale(scale) {
  return JSON.stringify({
    state: {
      theme: 'light',
      quality: 'high',
      mediaMode: 'audio',
      autoPlayOnDetail: true,
      autoNextDelay: 'immediate',
      playMode: 'playlist',
      playbackRate: 1,
      showCatechismHeadings: true,
      showCatechismToc: true,
      offlineStorageMode: 'normal',
      offlineStorageCustomMB: 1024,
      autoDownload: true,
      fontScale: scale,
      onlyOurChurch: true,
    },
    version: 0,
  })
}

async function fulfillApi(route) {
  const url = new URL(route.request().url())
  const path = url.pathname
  if (path.endsWith('/api/bible-verses/random')) {
    return route.fulfill({ json: { id: 'verse-1', content: '잠잠히 하나님 앞에 머무는 마음', reference: '시편 62:1' } })
  }
  if (path.endsWith('/api/playlists/recent')) {
    return route.fulfill({ json: { id: 'recent', title: '최근 찬양', videos: videos.slice(0, 4), playlists: videos } })
  }
  if (path.endsWith('/api/playlists')) {
    return route.fulfill({ json: [{ id: 'playlist-1', title: '주일 예배 찬송', videos: videos.slice(0, 4), playlists: videos }] })
  }
  if (path.endsWith('/api/playlists/playlist-1')) {
    return route.fulfill({ json: { id: 'playlist-1', title: '주일 예배 찬송' } })
  }
  if (path.endsWith('/api/playlists/playlist-1/videos')) {
    return route.fulfill({ json: { videos, total: videos.length, page: 1, limit: 100, hasMore: false, playlists: videos } })
  }
  const previewMatch = path.match(/\/api\/videos\/([^/]+)\/preview$/)
  if (previewMatch) {
    const video = videos.find((item) => item.id === previewMatch[1]) ?? videos[0]
    return route.fulfill({ json: video })
  }
  const videoMatch = path.match(/\/api\/videos\/([^/]+)$/)
  if (videoMatch) {
    const video = videos.find((item) => item.id === videoMatch[1]) ?? videos[0]
    return route.fulfill({
      json: {
        ...video,
        playlist: { id: 'playlist-1', title: '주일 예배 찬송' },
        lyric: {
          hymnTitle: video.hymnTitle,
          reference: '시편찬송',
          verseCount: 2,
          verse1: '긴 가사도 화면 폭 안에서 자연스럽게 줄바꿈되어야 합니다.',
          verse2: '큰 글자에서도 조작 버튼과 본문이 서로 겹치지 않아야 합니다.',
        },
      },
    })
  }
  if (path.endsWith('/api/videos')) {
    return route.fulfill({ json: { videos, total: videos.length, page: 1, limit: 20, hasMore: false, playlists: videos.map(v => v.id) } })
  }
  if (path.endsWith('/api/sermon-categories/search')) {
    return route.fulfill({ json: [{ id: 'sermon-root', title: '요한복음 강해', path: '설교 > 요한복음 강해', videoCount: 8, childCount: 0 }] })
  }
  if (path.endsWith('/api/sermon-categories')) {
    return route.fulfill({ json: [{ id: 'sermon-root', title: '요한복음 강해', ordering: 1, videoCount: 8, thumbnail: null, isCompleted: false, children: [] }] })
  }
  if (path.endsWith('/api/sermon-categories/sermon-root')) {
    return route.fulfill({ json: { id: 'sermon-root', title: '요한복음 강해', ordering: 1, videoCount: 8, thumbnail: null, isCompleted: false, children: [] } })
  }
  if (path.endsWith('/api/sermon-categories/sermon-root/videos')) {
    return route.fulfill({ json: { videos, total: videos.length, page: 1, limit: 100, hasMore: false } })
  }
  if (path.endsWith('/api/memory-verses/current')) {
    return route.fulfill({ json: weekly })
  }
  if (path.endsWith('/api/memory-verses/previous')) {
    return route.fulfill({ json: [{ period: '8월 31일~9월 5일', startDate: '2026-08-31', endDate: '2026-09-05', itemCount: 2 }] })
  }
  if (path.endsWith('/api/memory-verses/week/2026-08-31')) {
    return route.fulfill({ json: weekly.map(item => ({ ...item, startDate: '2026-08-31', endDate: '2026-09-05', period: '8월 31일~9월 5일' })) })
  }
  if (path.endsWith('/api/prayers/current') || path.endsWith('/api/prayers/archive')) {
    return route.fulfill({ json: prayers.map(item => ({ ...item, category: url.searchParams.get('category') ?? 'daily' })) })
  }
  if (path.endsWith('/api/confessions')) {
    return route.fulfill({ json: confessions })
  }
  if (path.endsWith('/api/confessions/wsc')) {
    return route.fulfill({ json: confessionDetail })
  }
  if (path.endsWith('/api/confessions/tags')) {
    return route.fulfill({ json: [{ id: 'tag-1', name: '목적' }, { id: 'tag-2', name: '성경' }] })
  }
  return route.fulfill({ status: 404, json: { message: `Unhandled test API route: ${path}` } })
}

async function installFixtures(page, scale) {
  await page.route('**/api/**', fulfillApi)
  await page.addInitScript((value) => {
    localStorage.setItem('selah-settings', value)
    const videos = Array.from({ length: 4 }, (_, i) => ({
      id: `video-${i + 1}`,
      youtubeId: `yt-${i + 1}`,
      title: `[주님의 교회] 아주 긴 제목으로 테스트하는 최근 재생 콘텐츠입니다 ${i + 1}`,
      thumbnail: null,
      tag: i % 2 ? 'mr' : 'ar',
      hymnTitle: `${i + 1}장 아주 긴 찬송 제목도 큰 글자에서 자연스럽게 보여야 합니다`,
      duration: 245 + i,
      playedAt: Date.now() - i * 1000,
      isSecret: false,
      isLive: false,
    }))
    localStorage.setItem('selah-recent', JSON.stringify({ state: { items: videos }, version: 0 }))
    localStorage.setItem('selah-playlists', JSON.stringify({
      state: {
        playlists: [{ id: 'user-list-1', name: '길게 만든 내 플레이리스트 이름도 줄바꿈으로 버텨야 합니다', videos }],
      },
      version: 1,
    }))
    localStorage.setItem('selah-queue', JSON.stringify({ state: { ids: videos.map((v) => v.id), videos, index: 0, isOpen: false }, version: 0 }))
  }, settingsWithFontScale(scale))
}

async function waitSettled(page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(120)
}

async function assertNoHorizontalPageOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    innerWidth,
    htmlScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    offenders: [...document.body.querySelectorAll('*')]
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        if (rect.width === 0 || rect.height === 0 || style.position === 'fixed') return false
        if (el.closest('[role="tablist"], .sermon-hscroll, .scrollbar-hide')) return false
        return rect.left < -1 || rect.right > window.innerWidth + 1
      })
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName,
        text: el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60),
        left: Math.round(el.getBoundingClientRect().left),
        right: Math.round(el.getBoundingClientRect().right),
        className: String(el.getAttribute('class') ?? ''),
      })),
  }))
  assert.ok(overflow.htmlScrollWidth <= overflow.innerWidth + 1, `${label}: html overflow ${JSON.stringify(overflow)}`)
  assert.ok(overflow.bodyScrollWidth <= overflow.innerWidth + 1, `${label}: body overflow ${JSON.stringify(overflow)}`)
  assert.deepEqual(overflow.offenders, [], `${label}: element overflows viewport`)
}

async function assertVisibleButtonsReadable(page, label) {
  const bad = await page.evaluate(() => [...document.querySelectorAll('button, [role="tab"], input')]
    .filter((el) => {
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden'
    })
    .filter((el) => {
      const style = getComputedStyle(el)
      const hasScrollableParent = !!el.closest('[role="tablist"], .sermon-hscroll, .scrollbar-hide')
      if (hasScrollableParent) return false
      const clipsX = ['hidden', 'clip'].includes(style.overflowX)
      return clipsX && el.scrollWidth > el.clientWidth + 2
    })
    .map((el) => ({
      tag: el.tagName,
      text: el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60) || el.getAttribute('placeholder') || el.getAttribute('aria-label'),
      width: el.clientWidth,
      scrollWidth: el.scrollWidth,
      className: String(el.getAttribute('class') ?? ''),
    })))
  assert.deepEqual(bad, [], `${label}: clipped controls`)
}

async function assertBottomNavClear(page, label) {
  const ok = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="주 메뉴"]')
    if (!nav) return true
    if (getComputedStyle(nav).display === 'none') return true
    const rect = nav.getBoundingClientRect()
    const links = [...nav.querySelectorAll('a')].map((link) => {
      const r = link.getBoundingClientRect()
      return r.height >= 44 && r.left >= -1 && r.right <= window.innerWidth + 1
    })
    return rect.top >= 0 && rect.bottom <= window.innerHeight + 1 && links.every(Boolean)
  })
  assert.equal(ok, true, `${label}: bottom nav is clipped or too small`)
}

async function assertMiniPlayerClear(page, label) {
  const metrics = await page.evaluate(() => {
    const mini = document.querySelector('[aria-label="미니 플레이어"]')
    const nav = document.querySelector('nav[aria-label="주 메뉴"]')
    if (!mini || !nav || getComputedStyle(nav).display === 'none') return { visible: !!mini, clear: true }
    const miniRect = mini.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    return {
      visible: miniRect.width > 0 && miniRect.height > 0,
      clear: miniRect.bottom <= navRect.top - 8,
      miniBottom: Math.round(miniRect.bottom),
      navTop: Math.round(navRect.top),
    }
  })
  assert.equal(metrics.visible, true, `${label}: mini player did not render`)
  assert.equal(metrics.clear, true, `${label}: mini player overlaps bottom nav ${JSON.stringify(metrics)}`)
}

async function checkPage(page, path, label) {
  await page.goto(`http://localhost:5173/#${path}`)
  await waitSettled(page)
  await page.locator('body').waitFor({ state: 'visible' })
  await assertNoHorizontalPageOverflow(page, label)
  await assertVisibleButtonsReadable(page, label)
  await assertBottomNavClear(page, label)
}

const browser = await chromium.launch()
try {
  for (const width of [320, 360, 390, 600, 690, 768, 1280]) {
    for (const scale of [1, 1.5, 2]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } })
      await installFixtures(page, scale)

      await checkPage(page, '/', `${width}px/${scale}x home`)
      await page.getByPlaceholder('제목 또는 장 검색').fill('긴 제목')
      await waitSettled(page)
      await assertNoHorizontalPageOverflow(page, `${width}px/${scale}x home search`)

      await checkPage(page, '/search?q=긴%20제목', `${width}px/${scale}x search`)
      await assert.equal(await page.getByText(/편 검색됨|총 \d+편/).first().isVisible(), true, `${width}px/${scale}x search fixture rendered`)

      await checkPage(page, '/playlist/playlist-1', `${width}px/${scale}x playlist`)
      await checkPage(page, '/sermon', `${width}px/${scale}x sermon`)
      await page.getByPlaceholder('시리즈 검색').fill('요한')
      await waitSettled(page)
      await assertNoHorizontalPageOverflow(page, `${width}px/${scale}x sermon search`)

      await checkPage(page, '/sermon/category/sermon-root', `${width}px/${scale}x sermon category`)
      await checkPage(page, '/memorize', `${width}px/${scale}x weekly`)
      await assert.equal(await page.getByText('소요리문답 암송').isVisible(), true, `${width}px/${scale}x weekly fixture rendered`)

      await page.getByRole('tab', { name: '기도', exact: true }).click()
      await waitSettled(page)
      await assertNoHorizontalPageOverflow(page, `${width}px/${scale}x prayer`)
      await assert.equal(await page.getByRole('heading', { name: '칼빈의 기도문을 따라 드리는 일상의 기도' }).isVisible(), true, `${width}px/${scale}x prayer fixture rendered`)

      const prayerTabs = await page.getByRole('tablist', { name: '기도문 종류' }).evaluate((el) =>
        [...el.querySelectorAll('button')].map((button) => {
          const rect = button.getBoundingClientRect()
          return { top: Math.round(rect.top), width: button.clientWidth, scrollWidth: button.scrollWidth }
        }),
      )
      assert.equal(new Set(prayerTabs.map((tab) => tab.top)).size, 1, `${width}px/${scale}x prayer tabs wrap`)
      assert.equal(prayerTabs.every((tab) => tab.scrollWidth <= tab.width + 2), true, `${width}px/${scale}x prayer tabs clipped`)

      await checkPage(page, '/catechism', `${width}px/${scale}x catechism`)
      await checkPage(page, '/catechism/wsc', `${width}px/${scale}x catechism detail`)
      await checkPage(page, '/recent', `${width}px/${scale}x recent`)
      await checkPage(page, '/my-playlists', `${width}px/${scale}x my playlists`)
      await checkPage(page, '/my-playlists/user-list-1', `${width}px/${scale}x my playlist detail`)
      await checkPage(page, '/player/video-1', `${width}px/${scale}x player`)
      await checkPage(page, '/my', `${width}px/${scale}x my`)
      await checkPage(page, '/settings', `${width}px/${scale}x settings`)

      const optionFontSize = await page.locator('[data-tour="setting-font"] button').first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      assert.equal(optionFontSize, 14 * scale, `${width}px/${scale}x setting controls must retain full text scaling`)
      await page.locator('[data-tour="setting-font"]').getByRole('button', { name: '보통' }).click()
      await waitSettled(page)
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('selah-settings') ?? '{}').state?.fontScale)
      assert.equal(stored, 1, `${width}px/${scale}x settings can restore normal font size`)

      console.log(`PASS ${width}px / ${scale}x: routes stable at selected font size`)
      await page.close()
    }
  }

  {
    const page = await browser.newPage({ viewport: { width: 320, height: 568 } })
    await installFixtures(page, 2)
    await checkPage(page, '/settings', '320x568/2x settings')
    await checkPage(page, '/my', '320x568/2x my')
    await checkPage(page, '/my-playlists', '320x568/2x my playlists')
    await checkPage(page, '/memorize', '320x568/2x weekly')
    await page.getByRole('tab', { name: '기도', exact: true }).click()
    await waitSettled(page)
    await assertNoHorizontalPageOverflow(page, '320x568/2x prayer')
    await checkPage(page, '/player/video-1', '320x568/2x player')
    await checkPage(page, '/', '320x568/2x home with mini player')
    await assertMiniPlayerClear(page, '320x568/2x home with mini player')
    console.log('PASS 320x568 / 2x: short-phone smoke without overflow or bottom overlap')
    await page.close()
  }
} finally {
  await browser.close()
}
