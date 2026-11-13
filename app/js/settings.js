// Live look-and-feel settings. One object, saved in this browser, pushed to CSS
// as custom properties and read by the camera, the board and the arrangements.
// The Tune panel (D key, or ?debug) edits it.

// Bumped when defaults change meaning, so stale saved values are dropped.
const STORAGE_KEY = 'ikram-board-v2'
const LEAN_QUERY = '(max-width: 768px), (pointer: coarse)'

export const DEFAULTS = {
  canvas: '#F1E7E2',
  bloom1: '#FFFFFF',
  bloom2: '#FFFFFF',
  bloom3: '#FFFFFF',
  bloomOpacity: 0.8,
  paper: '#FFFFFF',
  ink: '#1C1B1A',
  cardRadius: 0,
  labelSize: 20,
  spread: 0.6,
  depth: 1,
  tilt: 5,
  bank: 1,
  camStiffness: 58,
  camDamping: 16,
  cardStiffness: 130,
  cardDamping: 19,
  stagger: 26,
  breathe: 1,
}

const BOUNDS = {
  bloomOpacity: [0, 1],
  cardRadius: [0, 40],
  labelSize: [12, 64],
  spread: [0.3, 2],
  depth: [0, 2.5],
  tilt: [0, 10],
  bank: [0, 3],
  camStiffness: [20, 400],
  camDamping: [4, 60],
  cardStiffness: [20, 500],
  cardDamping: [4, 60],
  stagger: [0, 120],
  breathe: [0, 1],
}

const COLOR_KEYS = ['canvas', 'bloom1', 'bloom2', 'bloom3', 'paper', 'ink']

// Keys that change where cards sit, so the board must be laid out again.
export const LAYOUT_KEYS = ['spread', 'depth']

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
  }
  return next
}

function rgba(hex, alpha) {
  const [r, g, b] = hexRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

// The warm field behind the board: a sunset low in the frame, a cool sky
// corner above it. Three soft blooms, same idea as the old Rothko field.
function bloomGradient(s) {
  return [
    `radial-gradient(46% 42% at 50% 104%, ${rgba(s.bloom2, 0.85)} 0%, ${rgba(s.bloom2, 0)} 100%)`,
    `radial-gradient(78% 58% at 46% 100%, ${rgba(s.bloom1, 0.9)} 0%, ${rgba(s.bloom1, 0)} 100%)`,
    `radial-gradient(60% 55% at 92% 2%, ${rgba(s.bloom3, 0.6)} 0%, ${rgba(s.bloom3, 0)} 100%)`,
  ].join(',')
}

export function applyCss() {
  const root = document.documentElement
  const s = state
  root.style.setProperty('--canvas', s.canvas)
  root.style.setProperty('--paper', s.paper)
  root.style.setProperty('--ink', s.ink)
  root.style.setProperty('--card-radius', `${s.cardRadius}px`)
  root.style.setProperty('--label-size', `${s.labelSize}px`)
  root.style.setProperty('--bloom', bloomGradient(s))
  root.style.setProperty('--bloom-opacity', String(s.bloomOpacity))
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
