// End-to-end check of the board in a real browser.
//
//   python3 -m http.server 8123      (from the repo root, in another terminal)
//   node tests/browser.mjs
//
// Needs Playwright with Chromium installed. It is not part of `npm test`, which
// stays dependency-free. Set BASE to test another address.

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const BASE = process.env.BASE || 'http://localhost:8123/progress/'
const failures = []
let checks = 0

function check(condition, message) {
  checks++
  if (!condition) failures.push(message)
  console.log(`${condition ? '  ok  ' : '  FAIL'} ${message}`)
}

const state = (page) => page.evaluate(() => window.__progress.director.getState())
const hash = (page) => page.evaluate(() => location.hash)
const settled = (page) => page.waitForFunction(() => !window.__progress.ticker.running, null, { timeout: 8000 })

async function open(browser, options = {}, suffix = '') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  // Time every animation frame callback, to check the script cost of motion.
  await page.addInitScript(() => {
    window.__frameCosts = []
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (fn) => raf((t) => {
      const start = performance.now()
      fn(t)
      window.__frameCosts.push(performance.now() - start)
    })
  })
  await page.goto(`${BASE}?fresh${suffix}`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__progress && window.__progress.ready, null, { timeout: 15000 })
  return { context, page, errors }
}


// Every suggestion chip must sit inside the bar, clear of its rounded edge.
async function chipsInside(page, label) {
  const bad = await page.evaluate(() => {
    const bar = document.querySelector('#bar').getBoundingClientRect()
    return [...document.querySelectorAll('.chip')]
      .filter((chip) => chip.offsetParent !== null)
      .map((chip) => ({ text: chip.textContent, box: chip.getBoundingClientRect() }))
      .filter(({ box }) => box.left < bar.left + 12 || box.right > bar.right - 12 || box.bottom > bar.bottom - 12)
      .map(({ text }) => text)
  })
  check(bad.length === 0, `${label}: no suggestion runs past the bar edge${bad.length ? ` (${bad.join(', ')})` : ''}`)
}

async function centreOf(page, id) {
  return page.evaluate((cardId) => {
    const r = document.querySelector(`.card[data-id="${cardId}"]`).getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }
  }, id)
}

const browser = await chromium.launch()

// ---- desktop ------------------------------------------------------------------
{
  console.log('\nDesktop')
  const { context, page, errors } = await open(browser)
  await settled(page)

  let s = await state(page)
  check(s.results.length === 19 && !s.focus, 'home shows all 19 works, none focused')
  check(await page.evaluate(() => document.querySelectorAll('.card').length) === 19, '19 cards on the board')
  check(await hash(page) === '', 'home has an empty hash')

  const visible = await page.evaluate(() => [...document.querySelectorAll('.card')].filter((el) => {
    const r = el.getBoundingClientRect()
    return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight
  }).length)
  check(visible === 19, `every card is fully on screen at home (${visible}/19)`)

  const framesBefore = await page.evaluate(() => window.__progress.ticker.frames)
  await page.waitForTimeout(1200)
  const framesAfter = await page.evaluate(() => window.__progress.ticker.frames)
  check(framesAfter === framesBefore, 'no animation frames are requested while idle')

  // Click a card: camera flies to it, URL gains a Back step.
  const historyAtHome = await page.evaluate(() => history.length)
  const target = await centreOf(page, 'IH0306')
  await page.evaluate(() => { window.__frameCosts.length = 0 })
  await page.mouse.click(target.x, target.y)
  await settled(page)
  s = await state(page)
  check(s.focus === 'IH0306', 'clicking a card focuses it')
  check(await hash(page) === '#w=IH0306', 'the focused card is in the URL')
  check(await page.evaluate(() => history.length) === historyAtHome + 1, 'focusing adds one Back step')
  // The board leans toward the pointer, so measure with the pointer in the middle.
  await page.mouse.move(720, 450)
  await settled(page)
  const focused = await centreOf(page, 'IH0306')
  check(Math.abs(focused.x - 720) < 4, 'the focused card is centred horizontally')
  check(focused.w > 400 && focused.w < 700, `the focused card is large (${Math.round(focused.w)}px wide)`)
  check(await page.evaluate(() => document.querySelector('.card[data-id="IH0306"]').classList.contains('is-focus')), 'it is marked as focused')
  check(await page.evaluate(() => [...document.querySelectorAll('.label')].every((el) => el.style.visibility === 'hidden')), 'labels step out while a card is focused')

  const costs = await page.evaluate(() => window.__frameCosts)
  const worst = Math.max(...costs)
  const average = costs.reduce((a, b) => a + b, 0) / costs.length
  console.log(`        flight: ${costs.length} frames, script ${average.toFixed(2)} ms average, ${worst.toFixed(2)} ms worst`)
  check(average < 8, 'average script time per frame during a flight is under 8 ms')

  // Arrow keys step to a neighbour without piling up history.
  await page.keyboard.press('ArrowRight')
  await settled(page)
  s = await state(page)
  check(s.focus && s.focus !== 'IH0306', `arrow key moves focus to a neighbour (${s.focus})`)
  check(await page.evaluate(() => history.length) === historyAtHome + 1, 'stepping between cards does not add Back steps')
  const stepped = s.focus

  // Esc steps out. Number keys rearrange. Back undoes each in turn.
  await page.keyboard.press('Escape')
  await settled(page)
  check(!(await state(page)).focus && await hash(page) === '', 'Esc leaves the focused card')

  await page.keyboard.press('2')
  await settled(page)
  check((await state(page)).command.layout === 'grid' && await hash(page) === '#l=grid', 'key 2 arranges as a grid')

  await page.keyboard.press('3')
  await settled(page)
  check((await state(page)).command.layout === 'timeline', 'key 3 arranges as a timeline')
  check(await page.evaluate(() => [...document.querySelectorAll('.label')].filter((el) => el.style.visibility !== 'hidden').map((el) => el.textContent).join(',')) === '2019,2024,2025,2026,undated', 'the timeline is labelled by year, with undated last')

  await page.keyboard.press('4')
  await settled(page)
  check((await state(page)).command.layout === 'stack', 'key 4 gathers a stack')

  await page.goBack()
  await settled(page)
  check((await state(page)).command.layout === 'timeline', 'Back returns to the timeline')
  await page.goBack()
  await page.goBack()
  await settled(page)
  check(await hash(page) === '' && (await state(page)).command.layout === 'scatter', 'Back twice more returns home')
  await page.goBack()
  await settled(page)
  check((await state(page)).focus === stepped, 'Back again restores the focused card')
  await page.keyboard.press('Home')
  await settled(page)

  // Drag the board.
  const before = await page.evaluate(() => ({ x: window.__progress.camera.x, s: window.__progress.camera.scaleAt(window.__progress.camera.pivot) }))
  await page.mouse.move(700, 120)
  await page.mouse.down()
  await page.mouse.move(600, 120, { steps: 6 })
  await page.mouse.move(500, 120, { steps: 6 })
  await page.waitForTimeout(150)
  await page.mouse.up()
  await settled(page)
  const after = await page.evaluate(() => window.__progress.camera.x)
  check(Math.abs((after - before.x) - 200 / before.s) < 6, 'dragging empty space pans the board one-to-one')

  // Pick up a card and put it down somewhere else.
  await page.keyboard.press('Home')
  await settled(page)
  const card = await centreOf(page, 'IH0101')
  await page.mouse.move(card.x, card.y)
  await page.mouse.down()
  await page.mouse.move(card.x + 60, card.y + 30, { steps: 5 })
  check(await page.evaluate(() => document.querySelector('.card[data-id="IH0101"]').classList.contains('is-held')), 'a dragged card is picked up')
  await page.mouse.move(card.x + 160, card.y + 90, { steps: 8 })
  await page.waitForTimeout(400)
  const held = await centreOf(page, 'IH0101')
  check(Math.abs(held.x - (card.x + 160)) < 8 && Math.abs(held.y - (card.y + 90)) < 8, 'the held card stays under the pointer')
  await page.mouse.up()
  await settled(page)
  const dropped = await centreOf(page, 'IH0101')
  check(Math.abs(dropped.x - (card.x + 160)) < 30 && Math.abs(dropped.y - (card.y + 90)) < 30, 'it settles where it was dropped')
  check(!(await state(page)).focus, 'dragging a card does not focus it')
  check(await page.evaluate(() => !document.querySelector('.card.is-held')), 'nothing is left held')

  // Scrolling travels in depth.
  await page.keyboard.press('Home')
  await settled(page)
  const depthBefore = await page.evaluate(() => window.__progress.camera.z)
  await page.mouse.move(720, 450)
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -200)
  await settled(page)
  const depthAfter = await page.evaluate(() => window.__progress.camera.z)
  check(depthAfter > depthBefore + 400, `scrolling moves the camera forward through the space (${Math.round(depthAfter - depthBefore)} units)`)
  const passed = await page.evaluate(() => [...document.querySelectorAll('.card')].filter((el) => el.style.visibility === 'hidden' || el.style.pointerEvents === 'none').length)
  check(passed > 0, `cards the camera has passed are hidden and take no clicks (${passed})`)
  await page.keyboard.press('Home')
  await settled(page)
  check(await page.evaluate(() => [...document.querySelectorAll('.card')].every((el) => el.style.visibility !== 'hidden' && el.style.pointerEvents !== 'none')), 'home brings every card back')

  // The camera goes to the work: a far card is reached by travelling, not fetched.
  const far = await page.evaluate(() => {
    const p = window.__progress
    const el = document.querySelector('.card[data-id="IH0307"]')
    const depth = (node) => new DOMMatrix(node.style.transform).m43
    const before = { cam: p.camera.z, card: depth(el) }
    p.director.focus('IH0307')
    return before
  })
  await settled(page)
  const farAfter = await page.evaluate(() => ({ cam: window.__progress.camera.z, card: new DOMMatrix(document.querySelector('.card[data-id="IH0307"]').style.transform).m43 }))
  check(farAfter.cam - far.cam > 900, `focusing the farthest card flies the camera deep (${Math.round(farAfter.cam - far.cam)} units)`)
  check(Math.abs(farAfter.card - far.card) < 100, `while the card itself barely moves (${Math.round(farAfter.card - far.card)} units)`)
  check(await page.evaluate(() => document.querySelectorAll('.card.is-fore').length) > 0, 'cards in front of it go out of focus')
  await page.keyboard.press('Home')
  await settled(page)

  // Links.
  await page.evaluate(() => { location.hash = '#k=ar' })
  await settled(page)
  s = await state(page)
  check(s.results.join() === 'IH0103,IH0101,IH0102', 'a link can open a filtered view')
  check(await page.evaluate(() => document.querySelectorAll('.card.is-dim').length) === 16, 'the other 16 cards sink back')

  await page.mouse.click(40, 500)
  await page.keyboard.press('Enter')
  await settled(page)
  check((await state(page)).focus === 'IH0103', 'Enter focuses the first result')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await settled(page)
  check(await hash(page) === '', 'Esc twice steps out of the card, then out of the filter')

  await page.evaluate(() => { location.hash = '#k=nothing&w=nope&l=sideways' })
  await settled(page)
  s = await state(page)
  check(s.results.length === 19 && !s.focus, 'a nonsense link falls back to the whole board')

  check(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ') || 'none'})`)
  await context.close()
}

// ---- the bar ---------------------------------------------------------------------
{
  console.log('\nThe bar')
  const { context, page, errors } = await open(browser)
  await settled(page)
  const mode = () => page.getAttribute('#bar', 'data-mode')
  check(await mode() === 'idle', 'the bar starts as a pill with suggestions')
  await chipsInside(page, 'idle')
  await page.click('#b-input')
  await page.waitForTimeout(700)
  await chipsInside(page, 'focused')
  await page.keyboard.press('Escape')

  const before = await page.evaluate(() => history.length)
  await page.keyboard.press('/')
  check(await page.evaluate(() => document.activeElement.id) === 'b-input', '"/" focuses the bar')
  await page.keyboard.type('show me your proudest', { delay: 20 })
  await page.waitForTimeout(500)
  check(await mode() === 'typing', 'typing opens the plan line')
  check((await page.textContent('#b-plan')) === 'Showing my proudest work, top 5', 'the plan says what will happen')
  check(await page.evaluate(() => [...document.querySelectorAll('.mirror u')].map((u) => u.textContent).join()) === 'proudest', 'understood words are underlined')
  await settled(page)
  check((await state(page)).results.length === 5 && await hash(page) === '', 'the board previews live, without touching the URL')
  await page.keyboard.type(' work')
  check(await page.evaluate(() => document.activeElement.id) === 'b-input', 'the preview does not steal keyboard focus')
  await page.keyboard.press('Enter')
  await settled(page)
  const s = await state(page)
  check(await mode() === 'detail' && s.focus === 'IH0204', 'Enter flies to the proudest work and opens its detail')
  check((await page.textContent('.d-title')) === 'Reality to bend', 'the detail names it')
  check((await page.textContent('.d-count')) === '1 of 5', 'with its place among the five')
  check(await hash(page) === '#s=proud&n=5&w=IH0204', 'and the view has a link')
  check(await page.evaluate(() => history.length) === before + 1, 'committing adds one Back step')
  check(!(await page.$('.d-summary')) && !(await page.textContent('.d-facts')).includes('TBC'), 'missing facts are hidden, not shown as placeholders')

  await page.click('[data-act="next"]')
  await settled(page)
  check((await state(page)).focus === 'IH0203', 'next steps to the second work')

  await page.keyboard.press('Escape')
  await settled(page)
  check(await mode() === 'answer' && !(await state(page)).focus, 'Esc closes the detail and leaves the answer')
  check((await page.textContent('.sentence')).startsWith("Here's my proudest work of any kind, shown as a board"), 'the answer reads as a sentence')

  await page.click('.slot[data-slot="kind"]')
  await page.click('.opt[data-value="ar"]')
  await settled(page)
  const ar = await state(page)
  check(ar.command.kind === 'ar' && ar.results.join() === 'IH0103,IH0101,IH0102', 'changing a blank changes the board')
  await page.click('.slot[data-slot="sort"]')
  await page.click('.opt[data-value="recent"]')
  await settled(page)
  check((await state(page)).results.join() === 'IH0103,IH0102,IH0101', 'and so does the next blank (same year ties go to the prouder; undated last)')

  // Things the bar must never do: dead-end.
  await page.keyboard.press('/')
  await page.keyboard.type('xyzzy', { delay: 10 })
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  check(await mode() === 'answer' && (await page.textContent('.sentence')).includes('Not sure I caught'), 'a request it cannot read gets a blank to fill, not an error')
  check(await page.$$eval('.opt', (list) => list.length) === 5, 'with the kinds of work to pick from')

  await page.keyboard.press('/')
  await page.keyboard.type('who are you?', { delay: 10 })
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  check(await mode() === 'detail' && (await page.textContent('.d-title')).startsWith("Hi! I'm a Creative Technologist"), '"who are you?" opens a bit about me')
  check((await page.$$eval('.d-actions .pill', (l) => l.length)) === 4, 'with the four kinds of work as ways in')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check(await mode() !== 'detail', 'Esc closes it')

  await page.keyboard.press('/')
  await page.keyboard.type('how do I reach you', { delay: 10 })
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  check((await page.getAttribute('.pill.dark', 'href')) === 'mailto:ikramandhakim@gmail.com', 'contact leads with email')

  // Abandoning a half-typed ask puts the board back.
  await page.keyboard.press('Escape')
  await page.keyboard.press('Home')
  await settled(page)
  await page.keyboard.press('/')
  await page.keyboard.type('timeline', { delay: 10 })
  await page.waitForTimeout(400)
  await settled(page)
  check((await state(page)).command.layout === 'timeline', 'a half-typed ask previews')
  await page.keyboard.press('Escape')
  await settled(page)
  check((await state(page)).command.layout === 'scatter' && await mode() === 'idle', 'Esc abandons it and the board returns')

  check(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ') || 'none'})`)
  await context.close()
}

// ---- deep link on first load ---------------------------------------------------
{
  console.log('\nOpening straight on a card')
  const { context, page, errors } = await open(browser, {}, '#w=IH0204')
  await settled(page)
  const s = await state(page)
  check(s.focus === 'IH0204', 'the linked card is focused on arrival')
  const c = await centreOf(page, 'IH0204')
  check(Math.abs(c.x - 720) < 4 && c.w > 400, 'and framed large in the centre')
  check(errors.length === 0, 'no page errors')
  await context.close()
}

// ---- reduced motion ------------------------------------------------------------
{
  console.log('\nReduced motion')
  const { context, page, errors } = await open(browser, { reducedMotion: 'reduce' })
  const frames = await page.evaluate(() => window.__progress.ticker.frames)
  check(frames <= 2, `the board is placed without a deal animation (${frames} frames)`)
  const target = await centreOf(page, 'IH0306')
  await page.mouse.click(target.x, target.y)
  await page.waitForTimeout(100)
  const c = await centreOf(page, 'IH0306')
  check((await state(page)).focus === 'IH0306' && c.w > 400, 'focusing cuts straight to the card')
  check(errors.length === 0, 'no page errors')
  await context.close()
}

// ---- phone ---------------------------------------------------------------------
{
  console.log('\nPhone')
  const { context, page, errors } = await open(browser, {
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  })
  await settled(page)
  const first = await centreOf(page, 'IH0204')
  check(first.w >= 112, `cards are readable at home (${Math.round(first.w)}px wide)`)
  await chipsInside(page, 'phone idle')
  await page.tap('#b-input')
  await page.waitForTimeout(700)
  await chipsInside(page, 'phone focused')
  await page.evaluate(() => document.activeElement.blur())
  await page.waitForTimeout(500)
  check(Math.abs(first.x - 195) < 6, 'home opens on the proudest work')
  await page.touchscreen.tap(first.x, first.y)
  await settled(page)
  const s = await state(page)
  const c = await centreOf(page, 'IH0204')
  check(s.focus === 'IH0204', 'tapping a card focuses it')
  check(c.w > 300 && c.w <= 390, `the focused card fills the width (${Math.round(c.w)}px)`)
  check(await page.evaluate(() => document.documentElement.classList.contains('is-lean')), 'the lighter phone path is on')
  check(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ') || 'none'})`)
  await context.close()
}

await browser.close()

console.log(`\n${checks - failures.length}/${checks} checks passed`)
if (failures.length) {
  console.log('\nFailed:')
  for (const failure of failures) console.log(`  - ${failure}`)
  process.exit(1)
}
