// A true 60fps motion demo of the site.
//
//   node tools/demo.mjs                       plays the script below, writes demo.mp4
//   node tools/demo.mjs --out my-demo.mp4
//   node tools/demo.mjs --ref v2-bar          film an older tag instead of the working tree
//
// A normal screen recording of headless Chromium is about 25fps. This steps the
// browser's own clock exactly 1/60s at a time (Chrome DevTools "virtual time")
// and takes a frame after each step, so every frame is evenly spaced and every
// animation, spring and CSS transition plays at the right speed. It is slower
// than real time to render and exact when it plays.
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
await page.waitForFunction(() => window.__progress && window.__progress.ready, null, { timeout: 20000 })
await page.waitForTimeout(1500)

// From here the page's clock only moves when we move it.
await client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' })

let frame = 0
async function tick() {
  const expired = new Promise((done) => client.once('Emulation.virtualTimeBudgetExpired', done))
  await client.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: FRAME_MS })
  await expired
  const shot = await client.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 })
  writeFileSync(join(frames, `f${String(frame++).padStart(5, '0')}.jpg`), Buffer.from(shot.data, 'base64'))
  if (frame % 60 === 0) process.stdout.write(`\r  ${(frame / FPS).toFixed(0)}s rendered`)
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
