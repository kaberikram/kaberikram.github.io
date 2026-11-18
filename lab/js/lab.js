const IMG = {
  room: '../progress/img/b26f.jpg',
  stretch: '../progress/img/stretch.jpg',
  peel: '../progress/img/live-momnts.jpg',
  ghost: '../progress/img/ghost.jpg',
  sheets: [
    '../progress/img/a2.jpg',
    '../progress/img/a8.jpg',
    '../progress/img/a14.jpg',
    '../progress/img/a20.jpg',
    '../progress/img/a26.jpg',
  ],
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (reducedMotion) document.documentElement.classList.add('is-still')

const clock = {
  time: 0.28,
  listeners: new Set(),
}

function setTime(next) {
  const time = clamp(next, 0, 1)
  if (time === clock.time) return
  clock.time = time
  for (const fn of clock.listeners) fn(time)
}

function onTime(fn) {
  clock.listeners.add(fn)
  fn(clock.time)
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.max(1, Math.round(rect.width * dpr))
  const h = Math.max(1, Math.round(rect.height * dpr))
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  return { w, h, dpr, cssW: rect.width, cssH: rect.height }
}

function pointerIn(el, event) {
  const rect = el.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    w: rect.width,
    h: rect.height,
  }
}

function bindPointer(el, { onDown, onMove, onUp }) {
  let active = false
  let pointerId = null

  function down(event) {
    if (event.button != null && event.button !== 0) return
    active = true
    pointerId = event.pointerId
    el.setPointerCapture?.(event.pointerId)
    onDown?.(event)
  }

  function move(event) {
    if (!active || (pointerId != null && event.pointerId !== pointerId)) return
    onMove?.(event)
  }

  function up(event) {
    if (!active || (pointerId != null && event.pointerId !== pointerId)) return
    active = false
    pointerId = null
    onUp?.(event)
  }

  el.addEventListener('pointerdown', down)
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
}

const rafs = new Set()
function onFrame(fn) {
  rafs.add(fn)
}

let lastNow = performance.now()
function loop(now) {
  const dt = Math.min(32, now - lastNow)
  lastNow = now
  for (const fn of rafs) fn(now, dt)
  requestAnimationFrame(loop)
}

function initTime() {
  const slider = document.getElementById('time-slider')
  const line = document.getElementById('ruler-line')
  const ticks = document.getElementById('ruler-ticks')
  const clockEl = document.getElementById('time-clock')
  const frameEl = document.getElementById('time-frame')

  ticks.innerHTML = ''
  for (let hour = 0; hour <= 24; hour += 1) {
    const tick = document.createElement('span')
    tick.className = 'tick ' + (hour % 6 === 0 ? 'major' : 'hour')
    tick.style.left = `${(hour / 24) * 100}%`
    ticks.appendChild(tick)
    if (hour % 6 === 0) {
      const label = document.createElement('span')
      label.className = 'tick-label'
      label.style.left = `${(hour / 24) * 100}%`
      label.textContent = String(hour).padStart(2, '0')
      ticks.appendChild(label)
    }
  }
  for (let i = 0; i < 24; i += 1) {
    const mid = document.createElement('span')
    mid.className = 'tick minor'
    mid.style.left = `${((i + 0.5) / 24) * 100}%`
    ticks.appendChild(mid)
  }

  function paint(time) {
    slider.value = String(Math.round(time * 1000))
    line.style.left = `${time * 100}%`
    const minutes = Math.round(time * 24 * 60)
    const hh = Math.floor(minutes / 60)
    const mm = minutes % 60
    clockEl.textContent = hh >= 24 ? '24:00' : `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    frameEl.textContent = `f.${String(Math.round(time * 120)).padStart(3, '0')}`
  }

  slider.addEventListener('input', () => {
    setTime(Number(slider.value) / 1000)
  })

  onTime(paint)
}

function initFrame() {
  const stage = document.getElementById('frame-stage')
  const back = document.getElementById('frame-back')
  const front = document.getElementById('frame-front')
  const capture = document.getElementById('capture')
  const pill = document.getElementById('capture-pill')
  const handle = document.getElementById('capture-handle')

  back.style.backgroundImage = `url("${IMG.ghost}")`
  front.style.backgroundImage = `url("${IMG.ghost}")`

  const frame = { x: 0.18, y: 0.16, w: 0.42, h: 0.46 }
  let lookX = 0
  let lookY = 0
  let targetX = 0
  let targetY = 0

  function layout() {
    const rect = stage.getBoundingClientRect()
    const left = frame.x * rect.width
    const top = frame.y * rect.height
    const width = frame.w * rect.width
    const height = frame.h * rect.height
    capture.style.left = `${left}px`
    capture.style.top = `${top}px`
    capture.style.width = `${width}px`
    capture.style.height = `${height}px`
    pill.textContent = `${Math.round(width)} × ${Math.round(height)}`
  }

  function applyParallax() {
    const depth = 8 + clock.time * 10
    back.style.transform = `translate3d(${lookX * -depth}px, ${lookY * -depth}px, 0) scale(${1.04 + clock.time * 0.06})`
    front.style.transform = `translate3d(${lookX * depth * 1.5}px, ${lookY * depth * 1.5}px, 0) scale(${1.08 + clock.time * 0.04})`
    front.style.opacity = String(0.72 + clock.time * 0.2)
  }

  stage.addEventListener('pointermove', (event) => {
    const p = pointerIn(stage, event)
    targetX = (p.x / p.w) * 2 - 1
    targetY = (p.y / p.h) * 2 - 1
  })

  stage.addEventListener('pointerleave', () => {
    targetX = 0
    targetY = 0
  })

  let resizing = false
  bindPointer(handle, {
    onDown(event) {
      resizing = true
      event.preventDefault()
      event.stopPropagation()
    },
    onMove(event) {
      if (!resizing) return
      const p = pointerIn(stage, event)
      frame.w = clamp((p.x - frame.x * p.w) / p.w, 0.16, 0.78)
      frame.h = clamp((p.y - frame.y * p.h) / p.h, 0.16, 0.78)
      layout()
    },
    onUp() {
      resizing = false
    },
  })

  onTime(() => {
    applyParallax()
  })

  onFrame((_, dt) => {
    const ease = reducedMotion ? 1 : 1 - Math.pow(0.86, dt / 16)
    lookX += (targetX - lookX) * ease
    lookY += (targetY - lookY) * ease
    applyParallax()
  })

  window.addEventListener('resize', layout)
  layout()
}

function initPeel() {
  const stage = document.getElementById('peel-stage')
  const sticker = document.getElementById('sticker')
  const curl = document.getElementById('sticker-curl')
  const handle = document.getElementById('sticker-handle')
  const photo = sticker.querySelector('.sticker-photo')
  photo.style.backgroundImage = `url("${IMG.peel}")`

  const home = { x: 0, y: 0 }
  const pos = { x: 0, y: 0 }
  let peel = 0
  let mode = 'idle'
  let grabX = 0
  let grabY = 0
  let stuck = false

  function setPeel(next) {
    peel = clamp(next, 0, 1)
    const size = peel * Math.min(sticker.offsetWidth, sticker.offsetHeight) * 0.72
    sticker.style.setProperty('--peel', `${size}px`)
    const hide = size * 0.98
    photo.style.clipPath = peel > 0.01
      ? `polygon(0 0, 100% 0, 100% calc(100% - ${hide}px), calc(100% - ${hide}px) 100%, 0 100%)`
      : 'none'
    curl.style.opacity = peel > 0.02 ? '1' : '0'
  }

  function place() {
    const light = 1.04 - clock.time * 0.28
    const tilt = (clock.time - 0.5) * 4
    const squish = sticker.classList.contains('is-squish') ? ' scale(1.03, 0.93)' : ''
    sticker.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${tilt}deg)${squish}`
    sticker.style.filter = `brightness(${light}) saturate(${1.05 - clock.time * 0.15})`
  }

  function stickHere() {
    stuck = true
    sticker.classList.add('is-stuck', 'is-squish')
    place()
    window.setTimeout(() => {
      sticker.classList.remove('is-squish')
      place()
    }, reducedMotion ? 0 : 220)
  }

  function reset() {
    stuck = false
    mode = 'idle'
    pos.x = home.x
    pos.y = home.y
    sticker.classList.remove('is-stuck', 'is-squish')
    setPeel(0)
    place()
  }

  bindPointer(handle, {
    onDown(event) {
      mode = 'peel'
      const p = pointerIn(sticker, event)
      grabX = p.x
      grabY = p.y
      event.preventDefault()
      event.stopPropagation()
    },
    onMove(event) {
      if (mode !== 'peel') return
      const p = pointerIn(sticker, event)
      const fromCorner = Math.hypot(sticker.offsetWidth - p.x, sticker.offsetHeight - p.y)
      const max = Math.max(1, Math.hypot(sticker.offsetWidth, sticker.offsetHeight))
      setPeel(fromCorner / (max * 0.48))
      if (peel > 0.28) {
        const stageRect = stage.getBoundingClientRect()
        pos.x = event.clientX - stageRect.left - sticker.offsetWidth * 0.82
        pos.y = event.clientY - stageRect.top - sticker.offsetHeight * 0.82
        place()
      }
    },
    onUp() {
      if (mode !== 'peel') return
      mode = 'idle'
      if (peel > 0.18) {
        setPeel(0.22)
        stickHere()
      } else {
        setPeel(0)
        if (!stuck) {
          pos.x = home.x
          pos.y = home.y
          place()
        }
      }
    },
  })

  bindPointer(sticker, {
    onDown(event) {
      if (event.target === handle) return
      mode = 'move'
      const rect = sticker.getBoundingClientRect()
      grabX = event.clientX - rect.left
      grabY = event.clientY - rect.top
      event.preventDefault()
    },
    onMove(event) {
      if (mode !== 'move') return
      const stageRect = stage.getBoundingClientRect()
      const rect = sticker.getBoundingClientRect()
      pos.x = event.clientX - stageRect.left - grabX
      pos.y = event.clientY - stageRect.top - grabY
      const maxX = stageRect.width - rect.width
      const maxY = stageRect.height - rect.height
      pos.x = clamp(pos.x, -12, maxX + 12)
      pos.y = clamp(pos.y, -12, maxY + 12)
      place()
    },
    onUp() {
      if (mode !== 'move') return
      mode = 'idle'
      stickHere()
    },
  })

  sticker.addEventListener('dblclick', (event) => {
    event.preventDefault()
    reset()
  })

  onTime(place)
  setPeel(0.14)
  place()
}

function initSlit(room) {
  const canvas = document.getElementById('slit-canvas')
  const ctx = canvas.getContext('2d', { alpha: false })
  const source = room || null
  let dirty = true

  function draw() {
    const { w, h } = fitCanvas(canvas)
    ctx.fillStyle = '#eceee8'
    ctx.fillRect(0, 0, w, h)
    if (!source) return

    const smear = 0.22 + clock.time * 0.78
    const step = Math.max(1, Math.round(w / 220))
    for (let x = 0; x < w; x += step) {
      const u = x / w
      const srcX = clamp(
        (0.38 + (u - 0.5) * (1 - smear) + clock.time * 0.55) * source.width,
        0,
        source.width - 1,
      )
      ctx.drawImage(source, srcX, 0, 1, source.height, x, 0, step, h)
    }
    dirty = false
  }

  onTime(() => {
    dirty = true
  })
  onFrame(() => {
    if (dirty) draw()
  })
  window.addEventListener('resize', () => {
    dirty = true
  })
  draw()
}

function initWarp(room) {
  const canvas = document.getElementById('warp-canvas')
  const ctx = canvas.getContext('2d', { alpha: false })
  const source = room || null
  let dirty = true

  function draw() {
    const { w, h } = fitCanvas(canvas)
    ctx.fillStyle = '#eceee8'
    ctx.fillRect(0, 0, w, h)
    if (!source) return

    const slices = 72
    const t = clock.time
    const sw = source.width / slices
    for (let i = 0; i < slices; i += 1) {
      const u = i / (slices - 1)
      const wave = Math.sin(u * Math.PI)
      const pull = (u - 0.5) * t * w * 1.05
        const dw = (w / slices) * (1 + wave * t * 2.6) + 2
      const x = u * w + pull - dw / 2
      const dy = -h * t * 0.2 * wave
      ctx.drawImage(source, i * sw, 0, sw, source.height, x, dy, dw, h * (1 + t * 0.28))
    }
    dirty = false
  }

  onTime(() => {
    dirty = true
  })
  onFrame(() => {
    if (dirty) draw()
  })
  window.addEventListener('resize', () => {
    dirty = true
  })
  draw()
}

function mix(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ]
}

function rgb(c) {
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

function initLight() {
  const canvas = document.getElementById('light-canvas')
  const ctx = canvas.getContext('2d', { alpha: false })
  const stars = Array.from({ length: 42 }, (_, i) => ({
    x: (Math.sin(i * 12.9898) * 43758.5453) % 1,
    y: (Math.sin(i * 78.233) * 24634.834) % 1,
    r: 0.4 + ((i * 17) % 7) * 0.18,
  }))
  let dirty = true

  function draw() {
    const { w, h } = fitCanvas(canvas)
    const t = clock.time
    const top = mix([168, 205, 232], [11, 18, 36], t)
    const mid = mix([232, 214, 176], [46, 58, 96], Math.min(1, t * 1.15))
    const low = mix([246, 232, 206], [18, 22, 34], t)
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, rgb(top))
    sky.addColorStop(0.55, rgb(mid))
    sky.addColorStop(1, rgb(low))
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    const ground = h * 0.78
    ctx.fillStyle = rgb(mix([210, 214, 204], [22, 26, 32], t))
    ctx.fillRect(0, ground, w, h - ground)

    const night = clamp((t - 0.46) / 0.4, 0, 1)
    ctx.fillStyle = `rgba(255,255,255,${night * 0.85})`
    for (const star of stars) {
      if (star.y > 0.72) continue
      ctx.beginPath()
      ctx.arc(star.x * w, star.y * ground, star.r * (w / 280), 0, Math.PI * 2)
      ctx.fill()
    }

    const sunX = w * (0.14 + t * 0.78)
    const sunY = ground - Math.sin(Math.PI * (1 - t)) * (h * 0.52)
    const sunR = Math.max(8, w * 0.045)
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 4)
    const sunColor = mix([255, 214, 122], [255, 146, 88], t)
    glow.addColorStop(0, `rgba(${sunColor[0]}, ${sunColor[1]}, ${sunColor[2]}, 0.55)`)
    glow.addColorStop(1, 'rgba(255,180,80,0)')
    ctx.fillStyle = glow
    ctx.fillRect(sunX - sunR * 4, sunY - sunR * 4, sunR * 8, sunR * 8)
    ctx.fillStyle = rgb(sunColor)
    ctx.beginPath()
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2)
    ctx.fill()

    if (t > 0.58) {
      const moonT = clamp((t - 0.58) / 0.42, 0, 1)
      const moonX = w * (0.78 - moonT * 0.18)
      const moonY = ground * (0.42 - moonT * 0.16)
      ctx.fillStyle = `rgba(236, 239, 244, ${0.2 + moonT * 0.8})`
      ctx.beginPath()
      ctx.arc(moonX, moonY, sunR * 0.72, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.strokeStyle = `rgba(23,25,22,${0.08 + t * 0.08})`
    ctx.beginPath()
    ctx.moveTo(0, ground + 0.5)
    ctx.lineTo(w, ground + 0.5)
    ctx.stroke()
    dirty = false
  }

  onTime(() => {
    dirty = true
  })
  onFrame(() => {
    if (dirty) draw()
  })
  window.addEventListener('resize', () => {
    dirty = true
  })
  draw()
}

function initAmbient() {
  const root = document.getElementById('sheets')
  const counter = document.getElementById('fc-value')
  const nodes = IMG.sheets.map((src, index) => {
    const el = document.createElement('div')
    el.className = 'sheet'
    el.style.backgroundImage = `url("${src}")`
    el.style.zIndex = String(index + 1)
    root.appendChild(el)
    return el
  })

  let elapsed = 0
  let frames = 1284

  function paint(now) {
    const t = clock.time
    const pulse = reducedMotion ? 0 : Math.sin(now / 1400)
    nodes.forEach((el, index) => {
      const spread = 18 + t * 28
      const x = (index - 2) * spread + pulse * (8 - index * 2)
      const y = (index - 2) * (10 + t * 10) + pulse * 4
      const z = (index - 2) * (16 + t * 22)
      const scale = 0.72 + index * 0.05 + t * 0.05
      el.style.setProperty('--x', `${x}px`)
      el.style.setProperty('--y', `${y}px`)
      el.style.setProperty('--z', `${z}px`)
      el.style.setProperty('--s', String(scale))
      el.style.opacity = String(0.42 + index * 0.12)
    })
  }

  onTime(() => paint(performance.now()))
  onFrame((now, dt) => {
    paint(now)
    if (reducedMotion) return
    elapsed += dt
    if (elapsed > 80) {
      elapsed = 0
      frames += 1
      const total = frames / 30
      const mm = Math.floor(total / 60)
      const ss = Math.floor(total % 60)
      const ff = frames % 30
      counter.textContent = `00:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ff).padStart(2, '0')}`
    }
  })
}

async function boot() {
  initTime()
  initFrame()
  initPeel()
  initAmbient()

  const [room, stretch] = await Promise.all([
    loadImage(IMG.room),
    loadImage(IMG.stretch),
  ])
  initSlit(stretch || room)
  initWarp(room || stretch)
  initLight()
  requestAnimationFrame(loop)
}

boot()
