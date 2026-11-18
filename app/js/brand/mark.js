// The name in the top-left corner, drawn as a sheet: the name swept through
// space in soap-film colours, landing on a second "Ikram Hakim". Chosen in
// /logo-lab/ (Ikram's settings, 2026-11-18). The h1 keeps the real text for
// screen readers and as the fallback if anything here fails.
import { render, DEFAULTS } from './streak.js'

export const MARK = {
  ...DEFAULTS,
  mode: 'sheet', face: 'ink', end: 'ink', shape: 'arch', palette: 'iridescent', motion: 'still',
  cut: 0.735, angle: -71, twist: 0.15, sheen: 4, density: 0.19, glow: 1.05, slant: -0.03,
  length: 1.9, bend: -3, spread: -0.6, fade: 1, weight: 630, hand: 100,
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
}

mount().catch(() => {})
