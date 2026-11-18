import { render, DEFAULTS, PALETTES, SHAPES } from '../app/js/brand/streak.js'

// Starting points. Every one of them can be tuned in the panel.
const STREAKS = [
  { name: 'Tail', about: 'The last stroke of the m runs off to the right and sinks, opening up as it goes.',
    o: { mode: 'smear', cut: 0.975, length: 6, bend: 0.9, shape: 'swoop', spread: 0.6, fade: 0.75, palette: 'sunset' } },
  { name: 'Comb', about: 'The slice is tilted across Hakim, so the tail breaks into separate lines, like the walls of the windows.',
    o: { mode: 'smear', cut: 0.8, slant: 0.42, length: 6, bend: 1, shape: 'swoop', spread: 1.4, fade: 0.7, palette: 'sunset' } },
  { name: 'Hammock', about: 'The gap between the two words is a streak: Ikram melts into Hakim and sags in the middle.',
    o: { mode: 'bridge', cut: 1, length: 2.6, bend: 0.55, shape: 'arch', spread: 0.25, fade: 0.2, palette: 'sunset' } },
  { name: 'Slit', about: 'Hakim is cut halfway and the rest of the name is pulled out into a long bent ribbon.',
    o: { mode: 'smear', cut: 0.79, length: 5, bend: -0.9, shape: 'hook', spread: 1.1, fade: 0.6, palette: 'dusk' } },
  { name: 'Drip', about: 'The bottom of the letters pours downward and drifts aside, like paint left on a wall.',
    o: { mode: 'drip', cut: 0.7, length: 2.2, bend: 0.8, shape: 'swoop', spread: 0.15, fade: 0.8, palette: 'peach' } },
  { name: 'Room', about: 'The whole name recedes along a bent line, so every edge leaves a streak, like the windows.',
    o: { mode: 'tunnel', cut: 1, length: 2.4, bend: 0.6, shape: 'swoop', spread: 2.2, fade: 0.6, palette: 'sunset' } },
  { name: 'Breath', about: 'A long thin tail on a slow wave that breathes in and out.',
    o: { mode: 'smear', cut: 0.85, slant: 0.3, length: 8, bend: 0.45, shape: 'wave', spread: 0.5, fade: 0.85, palette: 'sunset', motion: 'breathe' } },
  { name: 'Pencil', about: 'No colour. The tail in plain ink, quieter, closest to the site today.',
    o: { mode: 'smear', cut: 0.82, slant: 0.5, length: 4.5, bend: 1.2, shape: 'hook', spread: 1.2, fade: 0.95, palette: 'ink' } },
  { name: 'Step down', about: 'A bridge that drops: Hakim lands a little lower than Ikram.',
    o: { mode: 'bridge', cut: 1, length: 2.2, bend: 0.5, shape: 'swoop', spread: 0.6, fade: 0.1, palette: 'lagoon' } },
]

const SHEETS = [
  { name: 'Twin', about: 'Pearl, with the name in ink, sweeping into a second Ikram Hakim below and to the side.',
    o: { mode: 'sheet', length: 2.2, bend: 0.4, shape: 'arch', angle: 32, twist: 1, sheen: 0.9, density: 0.07, glow: 0.3, spread: 0, fade: 0.55, palette: 'iridescent', face: 'ink', end: 'ink' } },
  { name: 'Twin, stacked', about: 'The second name sits right under the first, joined by a short hanging sheet.',
    o: { mode: 'sheet', length: 1.5, bend: 0.5, shape: 'arch', angle: 90, twist: 1, sheen: 0.8, density: 0.08, glow: 0.3, spread: 0, fade: 0.5, palette: 'iridescent', face: 'ink', end: 'ink' } },
  { name: 'Twin, far', about: 'A long ribbon to the right that dips and comes back up into the second name.',
    o: { mode: 'sheet', length: 7.5, bend: 0.6, shape: 'arch', angle: 4, twist: 2, sheen: 1.4, density: 0.06, glow: 0.3, spread: 0.2, fade: 0.6, palette: 'iridescent', face: 'ink', end: 'ink' } },
  { name: 'Twin, pearl end', about: 'The first name in ink, the second one in film colour, like a reflection it turns into.',
    o: { mode: 'sheet', length: 2.4, bend: 0.5, shape: 'arch', angle: 28, twist: 1, sheen: 1, density: 0.065, glow: 0.3, spread: 0, fade: 0.55, palette: 'iridescent', face: 'ink', end: 'pearl' } },
  { name: 'Prism', about: 'The name swept down and to the side as see-through sheets, folding once, in soap-film colours.',
    o: { mode: 'sheet', length: 2.4, bend: 0.5, shape: 'swoop', angle: 38, twist: 0.6, sheen: 1.3, density: 0.06, glow: 0.2, spread: 0.3, fade: 0.55, palette: 'iridescent' } },
  { name: 'Silk', about: 'A long low sweep to the right that folds twice, like a ribbon caught in air.',
    o: { mode: 'sheet', length: 5, bend: 0.7, shape: 'wave', angle: 8, twist: 2, sheen: 1.6, density: 0.055, glow: 0.2, spread: 0.2, fade: 0.7, palette: 'iridescent' } },
  { name: 'Curtain', about: 'Straight down, so every stem of every letter hangs as its own sheet.',
    o: { mode: 'sheet', length: 1.8, bend: 0.35, shape: 'hook', angle: 84, twist: 0.25, sheen: 1, density: 0.07, glow: 0.2, spread: 0.6, fade: 0.65, palette: 'iridescent' } },
  { name: 'Pearl', about: 'Short and quiet: the letters themselves take the film colour, with a faint sheet behind.',
    o: { mode: 'sheet', length: 1.1, bend: 0.25, shape: 'swoop', angle: 30, twist: 0.4, sheen: 0.8, density: 0.05, glow: 0.35, spread: 0, fade: 0.7, palette: 'iridescent', face: 'pearl' } },
  { name: 'Veil', about: 'The sheet rises up and back behind the name and slowly changes colour.',
    o: { mode: 'sheet', length: 2.6, bend: -0.6, shape: 'arch', angle: -28, twist: 1, sheen: 1.5, density: 0.05, glow: 0.3, spread: 0.4, fade: 0.6, palette: 'iridescent', motion: 'breathe' } },
]

const PRESETS = [...SHEETS, ...STREAKS]

const CONTROLS = [
  { k: 'mode', pills: ['sheet', 'smear', 'bridge', 'drip', 'tunnel'] },
  { k: 'face', pills: ['ink', 'pearl', 'none'] },
  { k: 'end', pills: ['none', 'ink', 'pearl'] },
  { k: 'shape', pills: Object.keys(SHAPES) },
  { k: 'palette', pills: Object.keys(PALETTES) },
  { k: 'motion', pills: ['still', 'breathe', 'sway'] },
  { k: 'cut', label: 'Cut at', min: 0.05, max: 1, step: 0.005 },
  { k: 'angle', label: 'Sheets: direction (deg)', min: -90, max: 120, step: 1 },
  { k: 'twist', label: 'Sheets: fold', min: 0, max: 4, step: 0.05 },
  { k: 'sheen', label: 'Sheets: colour cycles', min: 0, max: 4, step: 0.05 },
  { k: 'density', label: 'Sheets: thickness', min: 0.01, max: 0.25, step: 0.005 },
  { k: 'glow', label: 'Sheets: glow', min: 0, max: 1.5, step: 0.05 },
  { k: 'slant', label: 'Slice tilt (lines)', min: -1, max: 1, step: 0.01 },
  { k: 'length', label: 'Length (em)', min: 0.5, max: 12, step: 0.1 },
  { k: 'bend', label: 'Bend (em)', min: -3, max: 3, step: 0.05 },
  { k: 'spread', label: 'Opens up', min: -0.6, max: 3, step: 0.05 },
  { k: 'fade', label: 'Fade', min: 0, max: 1, step: 0.05 },
  { k: 'weight', label: 'Weight', min: 300, max: 700, step: 10 },
  { k: 'hand', label: 'Letters, hand-cut', min: 0, max: 100, step: 1 },
]

const dpr = Math.min(3, window.devicePixelRatio || 1)
const CORNER_PX = 19
const HERO_PX = () => (innerWidth < 820 ? 40 : 84)

let current = { ...DEFAULTS, ...PRESETS[0].o }
let currentName = PRESETS[0].name

// Draw at a given CSS font size, crisp on this screen.
async function draw(canvas, o, cssPx, phase = 0) {
  const box = await render(canvas, o, Math.round(cssPx * dpr), phase)
  canvas.style.width = canvas.width / dpr + 'px'
  return box
}

async function drawCorner(phase = 0) {
  const c = document.getElementById('corner-mark')
  const box = await draw(c, current, CORNER_PX, phase)
  // put the letters where the site's name sits today (left 24, top ~26)
  c.style.left = 24 - box.ox / dpr + 'px'
  c.style.top = 30 - box.oy / dpr + 'px'
}

async function drawHero(phase = 0) {
  await draw(document.getElementById('hero-mark'), current, HERO_PX(), phase)
}

// --- grid ------------------------------------------------------------------

const tiles = []
function buildGrid() {
  const grid = document.getElementById('grid')
  PRESETS.forEach((p) => {
    if (p === SHEETS[0] || p === STREAKS[0]) {
      const h = document.createElement('p')
      h.className = 'grid-head'
      h.textContent = p === SHEETS[0] ? 'Sheets: the name swept into see-through, soap-film ribbons' : 'Streaks: one slice of the name pulled out long'
      grid.appendChild(h)
    }
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'tile'
    b.innerHTML = `<canvas class="small"></canvas><div class="big"><canvas></canvas></div><div><div class="name"></div><div class="about"></div></div>`
    b.querySelector('.name').textContent = p.name
    b.querySelector('.about').textContent = p.about
    b.addEventListener('click', () => select(p))
    grid.appendChild(b)
    tiles.push({ p, el: b, small: b.querySelector('.small'), big: b.querySelector('.big canvas') })
  })
}

async function drawTiles(phase = 0, onlyMoving = false) {
  for (const t of tiles) {
    const o = { ...DEFAULTS, ...t.p.o }
    if (onlyMoving && o.motion === 'still') continue
    await draw(t.small, o, CORNER_PX, phase)
    await draw(t.big, o, 44, phase)
  }
}

function select(p) {
  current = { ...DEFAULTS, ...p.o }
  currentName = p.name
  sync()
}

// --- panel -----------------------------------------------------------------

const inputs = {}
function buildPanel() {
  const root = document.getElementById('controls')
  for (const c of CONTROLS) {
    if (c.pills) {
      const lbl = document.createElement('div')
      lbl.className = 'group-lbl'
      lbl.textContent = c.k[0].toUpperCase() + c.k.slice(1)
      const row = document.createElement('div')
      row.className = 'pills'
      for (const v of c.pills) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = v
        b.addEventListener('click', () => { current[c.k] = v; currentName = 'Custom'; sync() })
        row.appendChild(b)
      }
      root.append(lbl, row)
      inputs[c.k] = row
    } else {
      const row = document.createElement('label')
      row.className = 'row'
      row.innerHTML = `<span class="lbl"><span></span><b></b></span><input type="range">`
      row.querySelector('.lbl span').textContent = c.label
      const r = row.querySelector('input')
      Object.assign(r, { min: c.min, max: c.max, step: c.step })
      r.addEventListener('input', () => { current[c.k] = +r.value; currentName = 'Custom'; sync() })
      root.appendChild(row)
      inputs[c.k] = row
    }
  }
  document.getElementById('copy').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(location.href) } catch {}
    e.target.textContent = 'Copied'
    setTimeout(() => (e.target.textContent = 'Copy link'), 1400)
  })
}

function syncPanel() {
  document.getElementById('panel-name').textContent = currentName
  for (const c of CONTROLS) {
    const el = inputs[c.k]
    if (c.pills) {
      for (const b of el.children) b.setAttribute('aria-pressed', String(b.textContent === current[c.k]))
    } else {
      el.querySelector('input').value = current[c.k]
      el.querySelector('b').textContent = (+current[c.k]).toFixed(c.step < 1 ? (c.step < 0.01 ? 3 : 2) : 0)
    }
  }
  for (const t of tiles) t.el.setAttribute('aria-pressed', String(t.p.name === currentName))
}

// --- link: the settings live in the address, so a pick can be sent back -----

function writeHash() {
  const keys = CONTROLS.map((c) => c.k)
  const q = new URLSearchParams({ v: currentName })
  for (const k of keys) q.set(k, current[k])
  history.replaceState(null, '', '#' + q.toString())
}

function readHash() {
  if (!location.hash) return
  const q = new URLSearchParams(location.hash.slice(1))
  const named = PRESETS.find((p) => p.name === q.get('v'))
  if (named) { current = { ...DEFAULTS, ...named.o }; currentName = named.name }
  for (const c of CONTROLS) {
    if (!q.has(c.k)) continue
    current[c.k] = c.pills ? q.get(c.k) : +q.get(c.k)
  }
  // links made before the mode was saved in them: the sheet sliders mean a sheet
  if (!q.has('mode') && !named && q.has('angle')) current.mode = 'sheet'
  if (q.get('v')) currentName = q.get('v')
}

// --- loop ------------------------------------------------------------------

let pending = false
function sync() {
  syncPanel()
  writeHash()
  if (pending) return
  pending = true
  requestAnimationFrame(async () => {
    pending = false
    await drawCorner()
    await drawHero()
  })
}

const still = new URLSearchParams(location.search).has('still')
let t0 = performance.now()
async function tick(now) {
  const phase = (now - t0) / 1000
  if (current.motion !== 'still') { await drawCorner(phase); await drawHero(phase) }
  await drawTiles(phase, true)
  requestAnimationFrame(tick)
}

async function start() {
  buildGrid()
  buildPanel()
  readHash()
  syncPanel()
  await document.fonts.ready
  await drawCorner()
  await drawHero()
  await drawTiles()
  document.documentElement.dataset.ready = '1'
  if (!still && !matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(tick)
}

let resizeT
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { drawHero() }, 150) })

start()
