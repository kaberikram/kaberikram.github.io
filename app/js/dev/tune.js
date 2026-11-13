// Hidden tune panel. Opens from the corner button, the D key, or ?debug.
// Every control writes the shared settings object, which CSS variables, the
// camera, the board and the arrangements read straight away.

import {
  getSettings,
  replaceSettings,
  resetSettings,
  updateSettings,
  wantsDebug,
} from '../settings.js'

const GROUPS = [
  {
    label: 'Canvas',
    controls: [
      { key: 'canvas', type: 'color', label: 'Background' },
      { key: 'bloom1', type: 'color', label: 'Sunset, wide' },
      { key: 'bloom2', type: 'color', label: 'Sunset, core' },
      { key: 'bloom3', type: 'color', label: 'Sky corner' },
      { key: 'bloomOpacity', type: 'range', label: 'Bloom strength', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    label: 'Cards',
    controls: [
      { key: 'paper', type: 'color', label: 'Paper' },
      { key: 'ink', type: 'color', label: 'Ink' },
      { key: 'cardRadius', type: 'range', label: 'Corner radius', min: 0, max: 36, step: 1, unit: 'px' },
      { key: 'labelSize', type: 'range', label: 'Label size', min: 12, max: 64, step: 1, unit: 'px' },
      { key: 'breathe', type: 'range', label: 'Idle drift', min: 0, max: 1, step: 1 },
    ],
  },
  {
    label: 'Space',
    controls: [
      { key: 'spread', type: 'range', label: 'Spacing', min: 0.3, max: 2, step: 0.01 },
      { key: 'depth', type: 'range', label: 'Depth', min: 0, max: 2.5, step: 0.01 },
      { key: 'tilt', type: 'range', label: 'Lean to pointer', min: 0, max: 10, step: 0.1, unit: '°' },
      { key: 'bank', type: 'range', label: 'Lean into moves', min: 0, max: 3, step: 0.01 },
    ],
  },
  {
    label: 'Motion',
    controls: [
      { key: 'camStiffness', type: 'range', label: 'Camera pull', min: 20, max: 300, step: 1 },
      { key: 'camDamping', type: 'range', label: 'Camera settle', min: 4, max: 50, step: 0.5 },
      { key: 'cardStiffness', type: 'range', label: 'Card pull', min: 20, max: 400, step: 1 },
      { key: 'cardDamping', type: 'range', label: 'Card settle', min: 4, max: 50, step: 0.5 },
      { key: 'stagger', type: 'range', label: 'Deal gap', min: 0, max: 100, step: 1, unit: 'ms' },
    ],
  },
]

function formatValue(control, value) {
  if (control.type !== 'range') return ''
  const n = Number(value)
  const text = control.step < 1 ? n.toFixed(2) : String(Math.round(n))
  return control.unit ? `${text}${control.unit}` : text
}

// `views` is a list of [label, action] shortcuts shown at the top of the panel.
export function initTune({ views = [] } = {}) {
  const button = document.createElement('button')
  button.id = 'tune-toggle'
  button.type = 'button'
  button.textContent = 'Tune'
  button.title = 'Tune the board (D)'
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-controls', 'tune-panel')

  const panel = document.createElement('aside')
  panel.id = 'tune-panel'
  panel.hidden = true
  panel.setAttribute('aria-label', 'Tune panel')

  const inputs = new Map()

  const head = document.createElement('div')
  head.className = 'tune-head'
  const title = document.createElement('strong')
  title.textContent = 'Tune'
  const hint = document.createElement('span')
  hint.textContent = 'D to close'
  const close = document.createElement('button')
  close.type = 'button'
  close.textContent = 'Close'
  head.append(title, hint, close)

  const status = document.createElement('p')
  status.className = 'tune-status'
  status.textContent = 'Changes save in this browser'

  const shortcuts = document.createElement('div')
  shortcuts.className = 'tune-views'
  for (const [label, action] of views) {
    const view = document.createElement('button')
    view.type = 'button'
    view.textContent = label
    view.addEventListener('click', () => {
      action()
      status.textContent = label
    })
    shortcuts.append(view)
  }

  const body = document.createElement('div')
  body.className = 'tune-body'
  for (const group of GROUPS) {
    const section = document.createElement('section')
    const heading = document.createElement('h2')
    heading.textContent = group.label
    section.append(heading)
    for (const control of group.controls) {
      const row = document.createElement('label')
      row.className = 'tune-row'
      const span = document.createElement('span')
      span.textContent = control.label
      const output = document.createElement('output')
      span.append(output)
      row.append(span)
      const input = document.createElement('input')
      if (control.type === 'color') {
        input.type = 'color'
      } else {
        input.type = 'range'
        input.min = String(control.min)
        input.max = String(control.max)
        input.step = String(control.step)
      }
      const publish = () => {
        const value = control.type === 'range' ? Number(input.value) : input.value
        updateSettings({ [control.key]: value })
        output.textContent = formatValue(control, input.value)
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
  actions.className = 'tune-actions'
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
  box.className = 'tune-json'
  box.hidden = true
  box.spellcheck = false
  box.setAttribute('aria-label', 'Settings JSON')
  const load = document.createElement('button')
  load.type = 'button'
  load.textContent = 'Load JSON'
  load.hidden = true

  function fill() {
    const s = getSettings()
    for (const [key, entry] of inputs) {
      entry.input.value = String(s[key])
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
    status.textContent = 'Loaded'
  }

  reset.addEventListener('click', () => {
    resetSettings()
    fill()
    status.textContent = 'Reset to defaults'
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
      status.textContent = 'Clipboard blocked. The JSON is selected below'
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

  panel.append(head, shortcuts, body, actions, box, load, status)
  document.body.append(button, panel)
  fill()
  if (wantsDebug()) setOpen(true)

  return { fill, setOpen }
}
