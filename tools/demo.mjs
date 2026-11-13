// A true 60fps motion demo of the site.
//
//   node tools/demo.mjs                       plays the script below, writes demo.mp4
//   node tools/demo.mjs --out my-demo.mp4
//   node tools/demo.mjs --ref v2-bar          film an older tag instead of the working tree
//
// A normal screen recording of headless Chromium is about 25fps. This gives the
// page a clock that only moves when the script moves it, exactly 1/60s per
// step, and takes a frame after each step. Every frame is evenly spaced and
// every spring, timer and CSS transition plays at the right speed. It renders
// slower than real time and plays back exactly.
//
// Needs Playwright, Chromium and ffmpeg. Edit the SCRIPT section to change what
// the demo does.

import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)))
const args = process.argv.slice(2)
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)

const OUT = resolve(option('--out', 'demo.mp4'))
const REF = option('--ref', null)
const PAGE = option('--path', '/progress/')
const FPS = 60
const FRAME_MS = 1000 / FPS
const SIZE = { width: 1280, height: 800 }

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
}

function serve(root) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = normalize(join(root, path))
    if (!file.startsWith(root)) return res.writeHead(403).end()
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file)) return res.writeHead(404).end()
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' })
    res.end(readFileSync(file))
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)))
}

// ---- source of the files: the working tree, or an older version of it ---------
let root = repo
let checkout = null
if (REF) {
  checkout = mkdtempSync(join(tmpdir(), 'demo-src-'))
  execFileSync('git', ['--work-tree', checkout, 'checkout', `${REF}^{commit}`, '--', '.'], {
    cwd: repo, env: { ...process.env, GIT_INDEX_FILE: join(checkout, '.index') }, stdio: 'pipe',
  })
  root = checkout
}
const server = await serve(root)
const base = `http://127.0.0.1:${server.address().port}`

const frames = mkdtempSync(join(tmpdir(), 'demo-frames-'))
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1 })
const page = await context.newPage()
const client = await context.newCDPSession(page)

// The page's sense of time is replaced by one this script winds forward:
//   - performance.now, setTimeout and setInterval run on it;
//   - requestAnimationFrame callbacks run once per step, at that time;
//   - CSS transitions and animations are paused and set to exactly the time that
//     has passed since each began.
// (A screenshot makes the browser render several frames at once, so left alone
// all of these would run too fast.)
await page.addInitScript(() => {
  let now = 1000
  let queue = []
  let nextId = 1
  const timers = new Map()
  performance.now = () => now
  window.requestAnimationFrame = (callback) => { queue.push(callback); return queue.length }
  window.cancelAnimationFrame = () => {}
  window.setTimeout = (callback, ms = 0, ...rest) => {
    const id = nextId++
    timers.set(id, { at: now + Math.max(0, Number(ms) || 0), callback, rest, every: 0 })
    return id
  }
  window.setInterval = (callback, ms = 0, ...rest) => {
    const id = nextId++
    const every = Math.max(1, Number(ms) || 1)
    timers.set(id, { at: now + every, callback, rest, every })
    return id
  }
  window.clearTimeout = (id) => { timers.delete(id) }
  window.clearInterval = window.clearTimeout

  window.__step = (dt) => {
    now += dt
    for (let guard = 0; guard < 5000; guard++) {
      let due = null
      let dueId = 0
      for (const [id, timer] of timers) {
        if (timer.at <= now && (!due || timer.at < due.at)) { due = timer; dueId = id }
      }
      if (!due) break
      if (due.every) due.at += due.every
      else timers.delete(dueId)
      due.callback(...due.rest)
    }
    const run = queue
    queue = []
    for (const callback of run) callback(now)

    const seeding = !window.__seeded
    for (const animation of document.getAnimations()) {
      if (!animation.__demo) {
        // Animations already looping before filming keep their place; anything
        // that starts later begins at zero.
        const endless = animation.effect && animation.effect.getTiming().iterations === Infinity
        const keep = seeding || (endless && !(animation instanceof CSSTransition))
        const at = keep ? animation.currentTime || 0 : 0
        animation.pause()
        animation.currentTime = at
        animation.__demo = { t0: now - at }
      } else {
        animation.currentTime = now - animation.__demo.t0
      }
    }
    window.__seeded = true

    // A page that does not change produces no frame, and a screenshot would wait
    // for one. Moving a 1px speck in the corner guarantees a repaint.
    let speck = document.getElementById('demo-speck')
    if (!speck) {
      speck = document.createElement('div')
      speck.id = 'demo-speck'
      speck.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;z-index:99990;pointer-events:none;background:rgba(241,231,226,1)'
      document.body.appendChild(speck)
    }
    window.__tick = (window.__tick || 0) + 1
    speck.style.left = window.__tick % 2 ? '0px' : '1px'
  }
})

// A visible cursor and a click pulse, because headless Chromium draws neither.
await page.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style')
    style.textContent = `
      #demo-cursor { position: fixed; left: 0; top: 0; z-index: 99999; width: 22px; height: 22px; margin: -11px 0 0 -11px;
        border-radius: 50%; background: rgba(28,27,26,.14); border: 1.5px solid rgba(28,27,26,.7); pointer-events: none;
        transition: scale .15s ease, background .15s ease; }
      #demo-cursor.down { scale: .7; background: rgba(28,27,26,.4); }
      #demo-ring { position: fixed; z-index: 99998; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
        border: 2px solid rgba(28,27,26,.5); pointer-events: none; animation: ring .5s ease-out forwards; }
      @keyframes ring { to { scale: 3; opacity: 0; } }`
    document.head.appendChild(style)
    const dot = document.createElement('div')
    dot.id = 'demo-cursor'
    dot.style.display = 'none'
    document.body.appendChild(dot)
    addEventListener('mousemove', (e) => {
      dot.style.display = 'block'
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
    }, true)
    addEventListener('mousedown', (e) => {
      dot.classList.add('down')
      const ring = document.createElement('div')
      ring.id = 'demo-ring'
      ring.style.left = `${e.clientX}px`
      ring.style.top = `${e.clientY}px`
      document.body.appendChild(ring)
      setTimeout(() => ring.remove(), 600)
    }, true)
    addEventListener('mouseup', () => dot.classList.remove('down'), true)
  })
})

await page.goto(base + PAGE, { waitUntil: 'load' })
await page.waitForFunction(() => window.__progress && window.__progress.ready, null, { timeout: 20000, polling: 100 })
await page.waitForTimeout(1500)

// From here the page's clock only moves when we move it.
await page.evaluate(() => window.__step(0))

let frame = 0

// Every browser call can stall if the page is mid-navigation or busy. Name the
// call that stalled and try again rather than hanging the whole render.
function within(label, promise, ms = 8000) {
  let timer
  const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} stalled at frame ${frame}`)), ms) })
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer))
}

async function tick() {
  await within('page step', page.evaluate((dt) => window.__step(dt), FRAME_MS))
  const shot = await within('screenshot', client.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 }))
  writeFileSync(join(frames, `f${String(frame++).padStart(5, '0')}.jpg`), Buffer.from(shot.data, 'base64'))
  if (frame % 60 === 0) console.log(`  ${(frame / FPS).toFixed(0)}s rendered`)
}

const hold = async (ms) => { for (let n = Math.round(ms / FRAME_MS); n > 0; n--) await tick() }

let mouse = { x: 640, y: 700 }
const ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2)

async function glide(x, y, ms) {
  const from = { ...mouse }
  const count = Math.max(1, Math.round(ms / FRAME_MS))
  for (let i = 1; i <= count; i++) {
    const k = ease(i / count)
    await page.mouse.move(from.x + (x - from.x) * k, from.y + (y - from.y) * k)
    await tick()
  }
  mouse = { x, y }
}

async function centreOf(selector) {
  return page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, selector)
}

async function click(selector, travel = 520) {
  const at = await centreOf(selector)
  await glide(at.x, at.y, travel)
  await page.mouse.down()
  await hold(90)
  await page.mouse.up()
}

async function type(text, perKey = 58) {
  for (const key of text) {
    await page.keyboard.type(key)
    await hold(perKey)
  }
}

const press = async (key) => { await page.keyboard.press(key) }

// ---- SCRIPT: edit this to change the demo ------------------------------------
console.log(`Filming ${REF || 'the working tree'} at ${FPS}fps`)

// 1. The board deals itself out from a stack.
await page.evaluate(() => window.__progress.director.deal())
await hold(2300)

// 2. The pointer wanders; the board leans toward it.
await glide(900, 360, 650)
await glide(420, 300, 650)

// 3. Ask. The plan appears while typing and the board previews it.
await press('/')
await hold(250)
await type('show me your proudest work')
await hold(650)
await press('Enter')
await hold(2200) // the camera flies to the first piece; its detail opens

// 4. Step to the next piece with the bar's arrow.
await click('[data-act="next"]')
await hold(1200)

// 5. Close it. The answer is a sentence with blanks; change one.
await press('Escape')
await hold(900)
await click('.slot[data-slot="kind"]')
await hold(450)
await click('.opt[data-value="ar"]', 420)
await hold(1500)

// 5b. Name a work that sits far back: the camera travels through the space to it.
await press('Escape')
await press('/')
await hold(200)
await type('astral angels')
await hold(400)
await press('Enter')
await hold(2600)
await press('Escape')
await hold(1200)

// 6. Ask for the timeline.
await press('Escape')
await press('/')
await hold(200)
await type('everything by year')
await hold(450)
await press('Enter')
await hold(2100)

// 7. Home.
await press('Home')
await hold(1400)
// ---- end of script ------------------------------------------------------------

console.log(`\n  ${frame} frames, ${(frame / FPS).toFixed(1)}s`)
await browser.close()
server.close()

execFileSync('ffmpeg', [
  '-v', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, 'f%05d.jpg'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-movflags', '+faststart', OUT,
])
rmSync(frames, { recursive: true, force: true })
if (checkout) rmSync(checkout, { recursive: true, force: true })
console.log(`  wrote ${OUT}`)
