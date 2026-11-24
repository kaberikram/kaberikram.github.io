// Live look-and-feel settings. One object, saved in this browser, pushed to CSS
// as custom properties and read by the camera, the board and the arrangements.
// The Tune panel (D key, or ?debug) edits it.

// Bumped when defaults change meaning, so stale saved values are dropped.
const STORAGE_KEY = 'ikram-board-v7'
const LEAN_QUERY = '(max-width: 768px), (pointer: coarse)'

export const DEFAULTS = {
  canvas: '#FFFFFF',
  bloom1: '#FBE3D8',
  bloom2: '#F7C4B4',
  bloom3: '#DCE4F8',
  bloomOpacity: 0.55,
  cardStyle: 0,
  palette: 1,
  edge: 2.2,
  portal: 0.16,
  roomTilt: 9,
  paper: '#FFFFFF',
  ink: '#1C1B1A',
  cardRadius: 0,
  labelSize: 20,
  hand: 35,
  spread: 0.6,
  depth: 1.8,
  tilt: 5,
  bank: 1,
  camStiffness: 58,
  camDamping: 16,
  glide: 500,
  cardStiffness: 130,
  cardDamping: 19,
  stagger: 26,
  breathe: 1,
  soundLevel: 0.7,
  soundFlight: 0.5,
  soundFlightSpace: 0.5,
  soundTicks: 0.35,
  soundBrightness: 0.91,
  soundRoom: 0.5,
}

// How a work is drawn. A/B test: switch in the Tune panel or with ?card=name.
export const CARD_STYLES = ['bare', 'file', 'paper']

// Colour directions to compare. 'custom' uses the four colour pickers in Tune;
// the rest replace them. Switch in Tune (Canvas, Palette) or with ?palette=name.
// None is warm cream or peach, which is the colour of everything Claude makes.
// bloom1 is the wide haze, bloom2 the core of the horizon glow, bloom3 the sky
// in the top corner. `ink` is the text and bar colour.
export const PALETTES = [
  { name: 'custom' },
  // The reference: white air, a cool blue lifting off the floor.
  { name: 'daylight', canvas: '#FFFFFF', bloom1: '#DDE8FA', bloom2: '#BFD3F5', bloom3: '#EEF3FC', opacity: 0.75, ink: '#16181C' },
  // Pure white and nothing else. Colour comes only from the works.
  { name: 'gallery', canvas: '#FFFFFF', bloom1: '#F2F2F2', bloom2: '#E6E6E6', bloom3: '#FAFAFA', opacity: 0.6, ink: '#111111' },
  // Pastel dusk from your colour reference: lilac air, a pink-gold horizon.
  { name: 'dusk', canvas: '#FFFFFF', bloom1: '#E6DDF7', bloom2: '#F6C9DA', bloom3: '#D5E3FA', opacity: 0.8, ink: '#1B1727' },
  // Sea and sky from the same reference: soft blue-green, a warm edge of sand.
  { name: 'lagoon', canvas: '#FFFFFF', bloom1: '#D6ECEE', bloom2: '#F3E2B8', bloom3: '#DCEAF8', opacity: 0.75, ink: '#12201F' },
  // The warm peach we had. Kept as the baseline to judge the others against.
  { name: 'peach', canvas: '#FFFFFF', bloom1: '#FBE3D8', bloom2: '#F7C4B4', bloom3: '#DCE4F8', opacity: 0.55, ink: '#1C1B1A' },
]

const BOUNDS = {
  palette: [0, PALETTES.length - 1],
  cardStyle: [0, CARD_STYLES.length - 1],
  bloomOpacity: [0, 1],
  cardRadius: [0, 40],
  edge: [0, 6],
  portal: [0, 0.35],
  roomTilt: [0, 20],
  labelSize: [12, 64],
  hand: [0, 100],
  spread: [0.3, 2],
  depth: [0, 2.5],
  tilt: [0, 10],
  bank: [0, 3],
  camStiffness: [20, 400],
  camDamping: [4, 60],
  glide: [0, 1200],
  cardStiffness: [20, 500],
  cardDamping: [4, 60],
  stagger: [0, 120],
  breathe: [0, 1],
  soundLevel: [0, 1],
  soundFlight: [0, 1.5],
  soundFlightSpace: [0, 1],
  soundTicks: [0, 1.5],
  soundBrightness: [0, 1],
  soundRoom: [0, 1],
}

const COLOR_KEYS = ['canvas', 'bloom1', 'bloom2', 'bloom3', 'paper', 'ink']

// Keys that change where cards sit, so the board must be laid out again.
export const LAYOUT_KEYS = ['spread', 'depth', 'roomTilt']

let state = { ...DEFAULTS }
let saveTimer = 0
const listeners = new Set()

export function reducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Phones and touch devices get the cheaper look: no blur, no idle drift.
export function isLean() {
  return matchMedia(LEAN_QUERY).matches
}

export function getSettings() {
  return state
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function sanitize(partial, base) {
  const next = { ...base }
  if (!partial || typeof partial !== 'object') return next
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in partial)) continue
    const value = partial[key]
    if (COLOR_KEYS.includes(key)) {
      if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) next[key] = value
      continue
    }
    const n = Number(value)
    if (!Number.isFinite(n)) continue
    const bounds = BOUNDS[key]
    next[key] = bounds ? clamp(n, bounds[0], bounds[1]) : n
    if (key === 'cardStyle' || key === 'palette') next[key] = Math.round(next[key])
  }
  return next
}

function rgba(hex, alpha) {
  const [r, g, b] = hexRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

// The room behind the board: an endless white studio at sunset. Pale overhead,
// warming toward a soft glowing horizon low in the frame, then a paler floor
// running back toward you. There is no line anywhere, only light, so the eye
// reads distance and never a surface. main.js slides this with the camera's
// lean, so the horizon behaves like something very far away.
function bloomGradient(s) {
  return [
    `radial-gradient(70% 7% at 50% 78%, ${rgba(s.bloom2, 0.6)} 0%, ${rgba(s.bloom2, 0)} 100%)`,
    `linear-gradient(to bottom, ${rgba(s.bloom1, 0)} 55%, ${rgba(s.bloom1, 0.5)} 78%, ${rgba(s.bloom1, 0.25)} 100%)`,
    `radial-gradient(60% 40% at 96% -6%, ${rgba(s.bloom3, 0.55)} 0%, ${rgba(s.bloom3, 0)} 100%)`,
  ].join(',')
}

// ?card=bare|file|paper shows one style without saving it, for comparing and filming.
function cardStyleName(s) {
  const asked = new URLSearchParams(location.search).get('card')
  return CARD_STYLES.includes(asked) ? asked : CARD_STYLES[s.cardStyle] || CARD_STYLES[0]
}

// ?palette=name shows one direction without saving it, for comparing and filming.
function activePalette(s) {
  const asked = new URLSearchParams(location.search).get('palette')
  const named = PALETTES.find((p) => p.name === asked)
  const chosen = named || PALETTES[s.palette] || PALETTES[0]
  if (!chosen.canvas) return s
  return { ...s, canvas: chosen.canvas, bloom1: chosen.bloom1, bloom2: chosen.bloom2, bloom3: chosen.bloom3, bloomOpacity: chosen.opacity, ink: chosen.ink }
}

export function applyCss() {
  const root = document.documentElement
  const s = activePalette(state)
  root.style.setProperty('--canvas', s.canvas)
  root.style.setProperty('--paper', s.paper)
  root.style.setProperty('--ink', s.ink)
  root.style.setProperty('--card-radius', `${s.cardRadius}px`)
  root.style.setProperty('--label-size', `${s.labelSize}px`)
  root.style.setProperty('--hand', String(s.hand))
  root.style.setProperty('--portal', String(s.portal))
  root.style.setProperty('--bloom', bloomGradient(s))
  root.style.setProperty('--bloom-opacity', String(s.bloomOpacity))
  root.dataset.card = cardStyleName(s)
  root.classList.toggle('is-lean', isLean())
  root.classList.toggle('no-breathe', s.breathe < 0.5 || isLean() || reducedMotion())
  root.classList.toggle('reduced-motion', reducedMotion())
}

function emit(changed) {
  for (const fn of listeners) fn(state, changed)
}

function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Private mode and blocked storage still run live; they just won't persist.
    }
  }, 60)
}

function commit(next) {
  const changed = Object.keys(DEFAULTS).filter((key) => next[key] !== state[key])
  state = next
  scheduleSave()
  applyCss()
  emit(changed)
}

export function updateSettings(partial) {
  commit(sanitize(partial, state))
}

export function replaceSettings(partial) {
  commit(sanitize(partial, DEFAULTS))
}

export function resetSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  const changed = Object.keys(DEFAULTS).filter((key) => DEFAULTS[key] !== state[key])
  state = { ...DEFAULTS }
  applyCss()
  emit(changed)
}

export function bootSettings() {
  const params = new URLSearchParams(location.search)
  if (!params.has('fresh')) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) state = sanitize(JSON.parse(raw), DEFAULTS)
    } catch {
      state = { ...DEFAULTS }
    }
  }
  applyCss()
  addEventListener('resize', applyCss)
}

export function wantsDebug() {
  return new URLSearchParams(location.search).has('debug')
}
