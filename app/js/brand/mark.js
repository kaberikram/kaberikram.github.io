// The name in the top-left corner, drawn as a sheet: the name swept through
// space as a lagoon-coloured sheet that arcs up and over. Chosen in
// /logo-lab/ (Ikram's settings, 2026-11-18). The h1 keeps the real text for
// screen readers and as the fallback if anything here fails.
import { render, turnInSpace, DEFAULTS } from './streak.js'

export const MARK = {
  ...DEFAULTS,
  mode: 'sheet', face: 'ink', end: 'none', shape: 'arch', palette: 'lagoon', motion: 'still',
  cut: 0.735, angle: -71, twist: 0.15, sheen: 4, density: 0.19, glow: 1.05, slant: -0.03,
  length: 1.9, bend: -3, spread: -0.6, fade: 1, weight: 630, hand: 100,
  // turned in space so it doesn't read as a flat face (Ikram, 2026-11-18)
  turn: 28, tip: 14, depth: 12,
}

const FONT_PX = 19
const TOP = 14 // the mark's top edge, from the top of the window

async function mount() {
  const header = document.querySelector('.brand')
  if (!header) return
  const dpr = Math.min(3, window.devicePixelRatio || 1)
  const c = document.createElement('canvas')
  c.className = 'brand-mark'
  c.setAttribute('aria-hidden', 'true')
  const box = await render(c, MARK, Math.round(FONT_PX * dpr))
  c.style.width = c.width / dpr + 'px'
  c.style.left = -box.ox / dpr + 'px'
  c.style.top = TOP - header.getBoundingClientRect().top + 'px'
  header.appendChild(c)
  header.classList.add('has-mark')
  turnInSpace(c, box, MARK, dpr, FONT_PX)

  // a few degrees more as the pointer moves, like the room on the board
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  let want = { turn: 0, tip: 0 }, now = { turn: 0, tip: 0 }, raf = 0
  const step = () => {
    now.turn += (want.turn - now.turn) * 0.08
    now.tip += (want.tip - now.tip) * 0.08
    turnInSpace(c, box, MARK, dpr, FONT_PX, now)
    raf = Math.abs(want.turn - now.turn) + Math.abs(want.tip - now.tip) > 0.02 ? requestAnimationFrame(step) : 0
  }
  addEventListener('pointermove', (e) => {
    want = { turn: (e.clientX / innerWidth - 0.5) * 16, tip: -(e.clientY / innerHeight - 0.5) * 10 }
    if (!raf) raf = requestAnimationFrame(step)
  }, { passive: true })
}

mount().catch(() => {})
