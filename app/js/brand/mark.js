// The name in the top-left corner, drawn as a sheet: the name swept through
// space as a lagoon-coloured sheet that arcs up and back over it, breathing
// slowly. Chosen in /logo-lab/ (Ikram's settings, 2026-11-18). The h1 keeps
// the real text for screen readers and as the fallback if anything here fails.
import { render, turnInSpace, DEFAULTS } from './streak.js'

export const MARK = {
  ...DEFAULTS,
  mode: 'sheet', face: 'ink', end: 'none', shape: 'arch', palette: 'film', bands: 'on', motion: 'breathe',
  // the breathing sheet Ikram tuned, in the stripe colours from their references
  // (one flat colour per stroke), 2026-11-19. Solid 'stretch' stripes were tried and dropped.
  cut: 0.735, angle: -79, twist: 0.2, sheen: 0.8, density: 0.35, glow: 0.15, slant: -0.03,
  reach: 0.55, length: 1.9, bend: -3, spread: -0.6, fade: 1, weight: 630, hand: 100,
  // turned in space so it doesn't read as a flat face
  turn: 14, tip: -16, depth: 12,
  caps: 'off', // capitals tried and dropped (Ikram, 2026-11-18)
}

const FONT_PX = 19
const NAME_TOP = 5 // where the letters sit inside the header, as the plain h1 did

async function mount() {
  const header = document.querySelector('.brand')
  if (!header) return
  const dpr = Math.min(3, window.devicePixelRatio || 1)
  const px = Math.round(FONT_PX * dpr)
  const c = document.createElement('canvas')
  c.className = 'brand-mark'
  c.setAttribute('aria-hidden', 'true')

  let box
  let extra = { turn: 0, tip: 0 }
  // the canvas changes size as the sheet breathes, so it is re-pinned to the
  // letters every frame
  const draw = async (phase) => {
    box = await render(c, MARK, px, phase)
    c.style.width = c.width / dpr + 'px'
    c.style.left = -box.ox / dpr + 'px'
    c.style.top = NAME_TOP - box.oy / dpr + 'px'
    turnInSpace(c, box, MARK, dpr, FONT_PX, extra)
  }
  await draw(0)
  header.appendChild(c)
  header.classList.add('has-mark')

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  // a few degrees more as the pointer moves, like the room on the board
  let want = { turn: 0, tip: 0 }
  addEventListener('pointermove', (e) => {
    want = { turn: (e.clientX / innerWidth - 0.5) * 16, tip: -(e.clientY / innerHeight - 0.5) * 10 }
  }, { passive: true })

  const moving = MARK.motion !== 'still'
  const t0 = performance.now()
  let last = 0, busy = false
  const tick = async (now) => {
    requestAnimationFrame(tick)
    extra = { turn: extra.turn + (want.turn - extra.turn) * 0.08, tip: extra.tip + (want.tip - extra.tip) * 0.08 }
    if (moving && !document.hidden && now - last > 33 && !busy) {
      // the breath is slow, so 30 redraws a second is plenty
      busy = true
      last = now
      await draw((now - t0) / 1000)
      busy = false
    } else if (box) {
      turnInSpace(c, box, MARK, dpr, FONT_PX, extra)
    }
  }
  requestAnimationFrame(tick)
}

mount().catch(() => {})
