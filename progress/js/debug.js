// Hidden tune panel. Opens from the corner button, the D key, or ?debug.
// Every control writes the shared settings object, which CSS variables and the
// shaders read on the next frame.

import {
  applyPreset,
  getSettings,
  PRESETS,
  replaceSettings,
  resetSettings,
  updateSettings,
  wantsDebug,
} from './settings.js'

const GROUPS = [
  {
    label: 'Vignette',
    controls: [
      { key: 'vignetteMode', type: 'select', label: 'Mode', options: [['rothko', 'Rothko colour field'], ['black', 'Black'], ['none', 'None']] },
      { key: 'vignetteHeight', type: 'range', label: 'Height', min: 80, max: 640, step: 1, unit: 'px' },
      { key: 'vignetteSoftness', type: 'range', label: 'Softness', min: 0, max: 1, step: 0.01 },
      { key: 'vignetteOpacity', type: 'range', label: 'Opacity', min: 0, max: 1, step: 0.01 },
      { key: 'blackColor', type: 'color', label: 'Black colour' },
    ],
  },
  {
    label: 'Rothko field',
    controls: [
      { key: 'rothko1', type: 'color', label: 'Bloom 1' },
      { key: 'rothko2', type: 'color', label: 'Bloom 2' },
      { key: 'rothko3', type: 'color', label: 'Bloom 3' },
      { key: 'rothko4', type: 'color', label: 'Bloom 4' },
      { key: 'bloom1', type: 'range', label: 'Bloom 1 size', min: 10, max: 140, step: 1, unit: '%' },
      { key: 'bloom2', type: 'range', label: 'Bloom 2 size', min: 10, max: 140, step: 1, unit: '%' },
      { key: 'bloom3', type: 'range', label: 'Bloom 3 size', min: 10, max: 140, step: 1, unit: '%' },
      { key: 'bloom4', type: 'range', label: 'Bloom 4 size', min: 10, max: 140, step: 1, unit: '%' },
      { key: 'breatheSpeed', type: 'range', label: 'Breathing speed', min: 0, max: 30, step: 0.5, unit: 's' },
    ],
  },
  {
    label: 'Caption',
    controls: [
      { key: 'captionStyle', type: 'select', label: 'Style', options: [['glass', 'Glass white'], ['pastel', 'Pastel gradient']] },
      { key: 'fontWeight', type: 'range', label: 'Font weight', min: 300, max: 800, step: 10 },
      { key: 'fontScale', type: 'range', label: 'Font size', min: 0.7, max: 1.6, step: 0.01 },
      { key: 'glassStrength', type: 'range', label: 'Glass strength', min: 0, max: 2.5, step: 0.01 },
      { key: 'rimIntensity', type: 'range', label: 'Rainbow rim', min: 0, max: 2.5, step: 0.01 },
      { key: 'specular', type: 'range', label: 'Specular highlight', min: 0, max: 2.5, step: 0.01 },
      { key: 'pastelAmount', type: 'range', label: 'Pastel tint', min: 0, max: 1, step: 0.01 },
      { key: 'pastel1', type: 'color', label: 'Pastel 1' },
      { key: 'pastel2', type: 'color', label: 'Pastel 2' },
      { key: 'pastel3', type: 'color', label: 'Pastel 3' },
      { key: 'pastel4', type: 'color', label: 'Pastel 4' },
      { key: 'bloom', type: 'range', label: 'Bloom / glow', min: 0, max: 2.5, step: 0.01 },
      { key: 'motionSpeed', type: 'range', label: 'Motion speed', min: 0, max: 3, step: 0.01 },
    ],
  },
  {
    label: 'Tiles',
    controls: [
      { key: 'warp', type: 'range', label: 'Glass warp', min: 0, max: 2.5, step: 0.01 },
      { key: 'tileRim', type: 'range', label: 'Rim intensity', min: 0, max: 2, step: 0.01 },
      { key: 'radiusRatio', type: 'range', label: 'Corner radius', min: 0.06, max: 0.48, step: 0.01 },
      { key: 'gap', type: 'range', label: 'Gap', min: 12, max: 120, step: 1, unit: 'px' },
      { key: 'curvature', type: 'range', label: 'Grid curvature', min: 0.5, max: 1.6, step: 0.01 },
      { key: 'focusScale', type: 'range', label: 'Focused scale', min: 0, max: 0.4, step: 0.01 },
    ],
  },
  {
    label: 'Page',
    controls: [
      { key: 'pageBg', type: 'color', label: 'Background' },
    ],
  },
]

function formatValue(control, value) {
  if (control.type !== 'range') return ''
  const n = Number(value)
  const text = control.step < 1 ? n.toFixed(2) : String(Math.round(n))
  return control.unit ? `${text}${control.unit}` : text
}

export function initDebug({ onCaptionShape }) {
  const button = document.createElement('button')
  button.id = 'debug-toggle'
  button.type = 'button'
  button.textContent = 'Tune'
  button.title = 'Tune the field (D)'
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-controls', 'debug-panel')

  const panel = document.createElement('aside')
  panel.id = 'debug-panel'
  panel.hidden = true
  panel.setAttribute('aria-label', 'Field trip tune panel')

  const inputs = new Map()

  const head = document.createElement('div')
  head.className = 'dbg-head'
  const title = document.createElement('strong')
  title.textContent = 'Tune'
  const hint = document.createElement('span')
  hint.textContent = 'D to close'
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'dbg-x'
  close.textContent = 'Close'
  head.append(title, hint, close)

  const presets = document.createElement('div')
  presets.className = 'dbg-presets'
  for (const name of Object.keys(PRESETS)) {
    const preset = document.createElement('button')
    preset.type = 'button'
    preset.textContent = name
    preset.addEventListener('click', () => {
      applyPreset(name)
      fill()
      onCaptionShape()
      status.textContent = name
    })
    presets.append(preset)
  }

  const body = document.createElement('div')
  body.className = 'dbg-body'
  for (const group of GROUPS) {
    const section = document.createElement('section')
    const heading = document.createElement('h2')
    heading.textContent = group.label
    section.append(heading)
    for (const control of group.controls) {
      const row = document.createElement('label')
      row.className = 'dbg-row'
      const span = document.createElement('span')
      span.textContent = control.label
      const output = document.createElement('output')
      span.append(output)
      row.append(span)
      let input
      if (control.type === 'select') {
        input = document.createElement('select')
        for (const [value, label] of control.options) {
          const option = document.createElement('option')
          option.value = value
          option.textContent = label
          input.append(option)
        }
      } else if (control.type === 'color') {
        input = document.createElement('input')
        input.type = 'color'
      } else {
        input = document.createElement('input')
        input.type = 'range'
        input.min = String(control.min)
        input.max = String(control.max)
        input.step = String(control.step)
      }
      input.dataset.key = control.key
      const publish = () => {
        const value = control.type === 'range' ? Number(input.value) : input.value
        updateSettings({ [control.key]: value })
        output.textContent = formatValue(control, input.value)
        if (control.key === 'fontScale') onCaptionShape()
      }
      input.addEventListener('input', publish)
      input.addEventListener('change', publish)
      row.append(input)
      section.append(row)
      inputs.set(control.key, { input, output, control })
    }
    body.append(section)
  }

  const actions = document.createElement('div')
  actions.className = 'dbg-actions'
  const reset = document.createElement('button')
  reset.type = 'button'
  reset.textContent = 'Reset'
  const copy = document.createElement('button')
  copy.type = 'button'
  copy.textContent = 'Copy JSON'
  const paste = document.createElement('button')
  paste.type = 'button'
  paste.textContent = 'Paste JSON'
  actions.append(reset, copy, paste)

  const box = document.createElement('textarea')
  box.className = 'dbg-json'
  box.hidden = true
  box.spellcheck = false
  box.setAttribute('aria-label', 'Settings JSON')
  const load = document.createElement('button')
  load.type = 'button'
  load.textContent = 'Load JSON'
  load.hidden = true
  const status = document.createElement('p')
  status.className = 'dbg-status'
  status.textContent = 'Changes save in this browser'

  function fill() {
    const s = getSettings()
    for (const [key, entry] of inputs) {
      const value = s[key]
      if (entry.control.type === 'color') entry.input.value = String(value).slice(0, 7)
      else entry.input.value = String(value)
      entry.output.textContent = formatValue(entry.control, entry.input.value)
    }
  }

  function setOpen(open) {
    panel.hidden = !open
    button.setAttribute('aria-expanded', open ? 'true' : 'false')
    button.classList.toggle('on', open)
  }

  function loadText(text) {
    let data
    try {
      data = JSON.parse(text)
    } catch {
      status.textContent = 'Could not read that JSON'
      return
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      status.textContent = 'JSON should be an object of settings'
      return
    }
    replaceSettings(data)
    fill()
    onCaptionShape()
    status.textContent = 'Loaded'
  }

  reset.addEventListener('click', () => {
    resetSettings()
    fill()
    onCaptionShape()
    status.textContent = 'Reset to v25.17'
  })
  copy.addEventListener('click', async () => {
    const text = JSON.stringify(getSettings(), null, 2)
    try {
      await navigator.clipboard.writeText(text)
      status.textContent = 'Copied'
    } catch {
      box.hidden = false
      load.hidden = false
      box.value = text
      box.focus()
      box.select()
      status.textContent = 'Clipboard blocked — the JSON is selected below'
    }
  })
  paste.addEventListener('click', async () => {
    let text = ''
    try {
      text = await navigator.clipboard.readText()
    } catch {
      text = ''
    }
    if (!text.trim()) {
      box.hidden = false
      load.hidden = false
      box.focus()
      status.textContent = 'Paste JSON below, then Load'
      return
    }
    loadText(text)
  })
  load.addEventListener('click', () => loadText(box.value))

  button.addEventListener('click', () => setOpen(panel.hidden))
  close.addEventListener('click', () => setOpen(false))
  addEventListener('keydown', (e) => {
    if (e.key !== 'd' && e.key !== 'D') return
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
    const tag = e.target && e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    e.preventDefault()
    setOpen(panel.hidden)
  })

  panel.append(head, presets, body, actions, box, load, status)
  document.body.append(button, panel)
  fill()
  if (wantsDebug()) setOpen(true)

  return { fill, setOpen }
}
