// Film any point in the site's history.
//
//   node tools/capture.mjs                    every tag that starts with "v"
//   node tools/capture.mjs v1-paper-board     one tag, branch or commit
//   node tools/capture.mjs v0-glass v2-bar --video
//   node tools/capture.mjs --current          the working tree as it is now
//
// For each ref it checks the code out into a temporary folder, serves it, opens
// it in Chromium at desktop and phone size, and saves into
// making-of/captures/<ref>/ :
//   desktop.jpg  phone.jpg                    stills
//   desktop.webm                              a short clip, with --video
//
// Needs Playwright with Chromium. Nothing here touches your working tree.
//
// Options
//   --path /progress/     which page to open (default /progress/)
//   --wait 3500           ms to let the page settle before the still
//   --out making-of/captures

import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)))
const args = process.argv.slice(2)
const option = (name, fallback) => {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] : fallback
}
const flag = (name) => args.includes(name)
const valueFlags = new Set(['--path', '--wait', '--out'])
const refs = args.filter((arg, i) => !arg.startsWith('--') && !valueFlags.has(args[i - 1]))

const PAGE = option('--path', '/progress/')
const WAIT = Number(option('--wait', 3500))
const OUT = resolve(repo, option('--out', 'making-of/captures'))
const VIDEO = flag('--video')

const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' }).trim()

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webm': 'video/webm', '.mp4': 'video/mp4',
}

function serve(root) {
  const server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = normalize(join(root, path))
    if (!file.startsWith(root)) { res.writeHead(403).end(); return }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file)) { res.writeHead(404).end('not found'); return }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' })
    res.end(readFileSync(file))
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)))
}

const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
}

async function film(browser, base, dir, name, video) {
  const context = await browser.newContext({
    ...SIZES[name],
    ...(video ? { recordVideo: { dir, size: SIZES[name].viewport } } : {}),
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(base + PAGE, { waitUntil: 'load' }).catch((e) => errors.push(e.message))
  // Newer versions say when they are ready; older ones just get a pause.
  await page.waitForFunction(() => window.__progress && window.__progress.ready, null, { timeout: 12000 }).catch(() => {})
  await page.waitForTimeout(WAIT)
  await page.screenshot({ path: join(dir, `${name}.jpg`), type: 'jpeg', quality: 88 })
  if (video) await page.waitForTimeout(3500)
  const clip = video ? page.video() : null
  await context.close()
  if (clip) {
    const path = await clip.path()
    execFileSync('mv', [path, join(dir, `${name}.webm`)])
  }
  return errors
}

const targets = flag('--current')
  ? ['current']
  : refs.length ? refs : git('tag', '--list', 'v*', '--sort=creatordate').split('\n').filter(Boolean)

if (!targets.length) {
  console.log('No tags starting with "v" yet. Pass a ref, or use --current.')
  process.exit(1)
}

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
let failed = 0

for (const ref of targets) {
  const safe = ref.replace(/[^\w.-]+/g, '_')
  const dir = join(OUT, safe)
  mkdirSync(dir, { recursive: true })
  let root = repo
  let temp = null
  let label = 'working tree'
  if (ref !== 'current') {
    try {
      label = `${git('rev-parse', '--short', `${ref}^{commit}`)} ${git('log', '-1', '--format=%cs %s', `${ref}^{commit}`)}`
    } catch {
      console.log(`  skip ${ref}: not a tag, branch or commit`)
      failed++
      continue
    }
    temp = mkdtempSync(join(tmpdir(), 'capture-'))
    execFileSync('git', ['--work-tree', temp, 'checkout', `${ref}^{commit}`, '--', '.'], { cwd: repo, env: { ...process.env, GIT_INDEX_FILE: join(temp, '.index') }, stdio: 'pipe' })
    root = temp
  }
  const server = await serve(root)
  const base = `http://127.0.0.1:${server.address().port}`
  console.log(`${ref}  (${label})`)
  for (const name of Object.keys(SIZES)) {
    const errors = await film(browser, base, dir, name, VIDEO && name === 'desktop')
    console.log(`  ${name}: ${join('making-of/captures', safe, `${name}.jpg`)}${errors.length ? `   page errors: ${errors[0].slice(0, 80)}` : ''}`)
  }
  server.close()
  if (temp) rmSync(temp, { recursive: true, force: true })
}

await browser.close()
if (failed) process.exitCode = 1
