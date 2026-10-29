// Live look settings. Defaults reproduce v25.17 (Rothko field, white glass caption).
// The v25.16 preset switches the bottom field to black and the caption to the pastel gradient.

const STORAGE_KEY = 'ikram-progress-field-v1'

export const DEFAULTS = {
  pageBg: '#F3F4F1',
  vignetteMode: 'rothko',
  vignetteHeight: 360,
  vignetteSoftness: 1,
  vignetteOpacity: 1,
  rothko1: '#DE7030',
  rothko2: '#96221E',
  rothko3: '#581C2C',
  rothko4: '#BE4628',
  bloom1: 34,
  bloom2: 52,
  bloom3: 70,
  bloom4: 90,
  breatheSpeed: 14,
  blackColor: '#060608',
  captionStyle: 'glass',
  fontWeight: 650,
  fontScale: 1,
  glassStrength: 1,
  rimIntensity: 1,
  specular: 1,
  pastelAmount: 0.05,
  pastel1: '#F2B394',
  pastel2: '#EDD98C',
  pastel3: '#94D6BD',
  pastel4: '#99BDED',
  bloom: 1,
  motionSpeed: 1,
  warp: 1,
  tileRim: 1,
  radiusRatio: 0.28,
  gap: 56,
  curvature: 0.95,
  focusScale: 0.14,
}

const V25_16 = {
  ...DEFAULTS,
  vignetteMode: 'black',
  vignetteHeight: 300,
  vignetteSoftness: 0.62,
  vignetteOpacity: 1,
  blackColor: '#060608',
  captionStyle: 'pastel',
  fontWeight: 560,
  fontScale: 1,
  glassStrength: 1,
  rimIntensity: 1,
  specular: 1,
  pastelAmount: 1,
  pastel1: '#EFA888',
  pastel2: '#8CC8D6',
  pastel3: '#ECD58A',
  pastel4: '#B9A0E0',
  bloom: 1,
  motionSpeed: 1,
}

export const PRESETS = {
  'v25.17 Rothko': { ...DEFAULTS },
  'v25.16 Black': V25_16,
}

const BOUNDS = {
  vignetteHeight: [40, 900],
  vignetteSoftness: [0, 1],
  vignetteOpacity: [0, 1],
  bloom1: [8, 160],
  bloom2: [8, 160],
  bloom3: [8, 160],
  bloom4: [8, 160],
  breatheSpeed: [0, 40],
  fontWeight: [300, 800],
  fontScale: [0.55, 1.8],
  glassStrength: [0, 3],
  rimIntensity: [0, 3],
  specular: [0, 3],
  pastelAmount: [0, 1],
  bloom: [0, 3],
  motionSpeed: [0, 4],
  warp: [0, 3],
  tileRim: [0, 3],
  radiusRatio: [0.04, 0.5],
  gap: [8, 160],
  curvature: [0.4, 1.8],
  focusScale: [0, 0.5],
}

const COLOR_KEYS = [
  'pageBg', 'rothko1', 'rothko2', 'rothko3', 'rothko4', 'blackColor',
  'pastel1', 'pastel2', 'pastel3', 'pastel4',
]

const BLOOMS = [
  { key: 'bloom1', color: 'rothko1', y: '78%', ratio: 30 / 34, alpha: 0.85 },
  { key: 'bloom2', color: 'rothko2', y: '100%', ratio: 44 / 52, alpha: 0.95 },
  { key: 'bloom3', color: 'rothko3', y: '112%', ratio: 1, alpha: 0.95 },
  { key: 'bloom4', color: 'rothko4', y: '100%', ratio: 55 / 90, alpha: 0.35 },
]

let state = { ...DEFAULTS }
let motionUnlocked = false
let saveTimer = 0
const listeners = new Set()

export function reducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function effectMotion() {
  if (reducedMotion() && !motionUnlocked) return 0
  return state.motionSpeed
}

export function breatheSeconds() {
  if (reducedMotion() && !motionUnlocked) return 0
  return state.breatheSpeed
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

export function hexVec(hex) {
  const [r, g, b] = hexRgb(hex)
  return [r / 255, g / 255, b / 255]
}

function luminance(hex) {
  const [r, g, b] = hexRgb(hex)
  return r * 0.299 + g * 0.587 + b * 0.114
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function sanitize(partial, base) {
  const next = { ...base }
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in partial)) continue
    const value = partial[key]
    if (key === 'vignetteMode') {
      if (value === 'rothko' || value === 'black' || value === 'none') next[key] = value
      continue
    }
    if (key === 'captionStyle') {
      if (value === 'glass' || value === 'pastel') next[key] = value
      continue
    }
    if (COLOR_KEYS.includes(key)) {
      if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) next[key] = value
      continue
    }
    if (typeof DEFAULTS[key] === 'number') {
      const n = Number(value)
      if (!Number.isFinite(n)) continue
      const bounds = BOUNDS[key]
      next[key] = bounds ? clamp(n, bounds[0], bounds[1]) : n
    }
  }
  return next
}

function pastelImage(s) {
  const cols = [s.pastel1, s.pastel2, s.pastel3, s.pastel4]
  const amount = clamp(s.pastelAmount, 0, 1)
  const layers = []
  for (let i = 0; i < 12; i++) {
    const [r, g, b] = hexRgb(cols[i % 4])
    const x = (33 + i * (34 / 11)).toFixed(1)
    const phase = (i * 0.29).toFixed(2)
    const y = (90.5 + (i % 2) * 1.7).toFixed(1)
    const ySin = i % 2 === 0
      ? `sin(var(--a) * 1turn + ${phase}turn)`
      : `sin(var(--a) * 2turn + ${phase}turn)`
    layers.push(
      `radial-gradient(70px 34px at calc(${x}% + 45px * cos(var(--a) * 1turn + ${phase}turn)) calc(${y}% + 14px * ${ySin}), rgba(${r},${g},${b},${amount}) 20%, transparent 75%)`,
    )
  }
  return layers.join(',')
}

function rothkoGradient(s) {
  const hold = Math.round((1 - clamp(s.vignetteSoftness, 0, 1)) * 55)
  return BLOOMS.map((bloom) => {
    const width = s[bloom.key]
    const height = width * bloom.ratio
    const [r, g, b] = hexRgb(s[bloom.color])
    return `radial-gradient(${width}% ${height.toFixed(2)}% at 50% ${bloom.y}, rgba(${r},${g},${b},${bloom.alpha}) ${hold}%, rgba(${r},${g},${b},0) 100%)`
  }).join(',')
}

function blackGradient(s) {
  const soft = clamp(s.vignetteSoftness, 0, 1)
  const mid = (8 + soft * 43.5).toFixed(2)
  const end = (42 + soft * 53).toFixed(2)
  const [r, g, b] = hexRgb(s.blackColor)
  return `radial-gradient(70% 100% at 50% 100%, rgba(${r},${g},${b},0.96) 0%, rgba(${r},${g},${b},0.85) ${mid}%, rgba(${r},${g},${b},0) ${end}%)`
}

function paintField(s) {
  const field = document.getElementById('field')
  if (!field) return
  const mode = s.vignetteMode
  field.dataset.mode = mode
  field.style.height = `${s.vignetteHeight}px`
  field.style.opacity = mode === 'none' ? '0' : String(s.vignetteOpacity)
  const breathe = breatheSeconds()
  if (mode === 'rothko' && breathe > 0.05) {
    field.style.animationName = 'rothko'
    field.style.animationDuration = `${breathe}s`
  } else {
    field.style.animationName = 'none'
  }
  if (mode === 'black') field.style.background = blackGradient(s)
  else if (mode === 'rothko') field.style.background = rothkoGradient(s)
  else field.style.background = 'none'
  field.style.backgroundRepeat = 'no-repeat'
}

export function applyCss() {
  const root = document.documentElement
  const s = state
  const still = effectMotion() <= 0.01
  root.style.setProperty('--page', s.pageBg)
  root.style.setProperty('--cap-w', String(s.fontWeight))
  root.style.setProperty('--tile-rim', String(s.tileRim))
  root.style.setProperty('--pastel-img', pastelImage(s))
  root.style.setProperty('--pastel-sat', (0.45 + 0.55 * s.rimIntensity).toFixed(3))
  root.style.setProperty('--pastel-hi', (0.2 * s.specular).toFixed(3))
  root.style.setProperty('--drift', still ? '0s' : `${11 / Math.max(s.motionSpeed, 0.05)}s`)
  root.dataset.vig = s.vignetteMode
  root.classList.toggle('caption-glass', s.captionStyle === 'glass')
  root.classList.toggle('caption-pastel', s.captionStyle === 'pastel')
  root.classList.toggle('is-still', still)
  root.classList.toggle('allow-motion', motionUnlocked || !reducedMotion())
  root.classList.toggle('page-dark', luminance(s.pageBg) < 150)
  paintField(s)
}

function emit() {
  for (const fn of listeners) fn(state)
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

function commit(next, { save = true, user = false } = {}) {
  if (user) motionUnlocked = true
  state = next
  if (save) scheduleSave()
  applyCss()
  emit()
}

export function updateSettings(partial, opts) {
  commit(sanitize(partial, state), { save: true, user: true, ...opts })
}

export function replaceSettings(partial, opts) {
  commit(sanitize(partial, DEFAULTS), { save: true, user: true, ...opts })
}

export function resetSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  motionUnlocked = false
  state = { ...DEFAULTS }
  applyCss()
  emit()
}

export function applyPreset(name) {
  const preset = PRESETS[name]
  if (!preset) return false
  commit({ ...preset }, { save: true, user: true })
  return true
}

export function bootSettings() {
  const params = new URLSearchParams(location.search)
  if (!params.has('fresh')) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          state = sanitize(parsed, DEFAULTS)
        }
      }
    } catch {
      state = { ...DEFAULTS }
    }
  }
  const preset = params.get('preset')
  if (preset === 'black' || preset === 'v25.16') state = { ...PRESETS['v25.16 Black'] }
  if (preset === 'rothko' || preset === 'v25.17') state = { ...PRESETS['v25.17 Rothko'] }
  applyCss()
}

export function wantsDebug() {
  return new URLSearchParams(location.search).has('debug')
}
