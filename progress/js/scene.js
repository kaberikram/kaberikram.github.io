// Curved field of 1.8:1 glass tiles. Layout math matches the v25.17 prototype:
// a sphere projection, a forward pop on the focused tile, and depth blur toward the rim.

import { GREY, codeAt, imgUrl, workByCode, LINE } from './works.js'
import { effectMotion, getSettings } from './settings.js'

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]))
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function initScene({ glass, caption }) {
  const stage = document.getElementById('stage')
  const world = document.getElementById('world')
  const detail = document.getElementById('detail')
  const lens = document.getElementById('lens')
  const nav = document.getElementById('nav')

  let pool = []
  let NC = 0
  let NR = 0
  let x = 0
  let y = 0
  let tx = 0
  let ty = 0
  let dragging = false
  let lastInput = 0
  let snapping = false
  let focus = null
  let focusedEl = null
  let capOn = 'A'
  let captionShown = false
  let pointerX = null
  let pointerY = null
  let touch = false
  let fx = 0
  let fy = 0
  let ox = 0
  let oy = 0
  let sk = 0
  let skv = 0
  let st = 0
  let stv = 0
  let px = 0
  let py = 0
  let pt = 0
  let moved = 0

  function metrics() {
    const s = getSettings()
    const mob = innerWidth < 700
    const T = mob ? 150 : 240
    const TH = Math.round(T * 0.75)
    const LH = Math.round(T / 1.8)
    const gap = mob ? Math.round(s.gap * 32 / 56) : s.gap
    const S = T + gap
    const SY = LH + gap
    const curve = s.curvature * (mob ? 1.05 / 0.95 : 1)
    const R = Math.max(innerWidth, innerHeight) * curve
    const Zf = (mob ? 60 : 130) * (s.focusScale / 0.14)
    return { mob, T, TH, LH, S, SY, R, Zf, focusScale: s.focusScale, radiusRatio: s.radiusRatio }
  }

  function placeCaps() {
    const mob = innerWidth < 700
    if (nav) nav.style.display = mob ? 'none' : 'flex'
    for (const id of ['capA', 'capB']) {
      const el = document.getElementById(id)
      el.style.top = 'auto'
      el.style.bottom = `${mob ? 34 : 30}px`
    }
  }

  function build() {
    world.innerHTML = ''
    pool = []
    const { S, SY } = metrics()
    NC = Math.ceil(innerWidth / S) + 4
    NR = Math.ceil(innerHeight / SY) + 4
    for (let k = 0; k < NC * NR; k++) {
      const e = document.createElement('div')
      e.className = 'tile'
      world.appendChild(e)
      pool.push({ e, code: null, blur: -1, sized: '' })
    }
    if (focusedEl) focusedEl.classList.remove('foc')
    focusedEl = null
  }

  function paint(cell, code) {
    if (cell.code === code) return
    cell.code = code
    const work = workByCode(code)
    const el = cell.e
    if (work.im) {
      const url = imgUrl(work.im)
      el.className = `tile${GREY.has(code) ? ' grey' : ''}`
      el.innerHTML = `<div class="pic"><div class="lens"><div class="im" data-src="${url}" style="background-image:url(&quot;${url}&quot;)"></div></div></div><div class="ir"></div><div class="gl"></div><div class="halo"></div>`
      glass.bindTile(el)
    } else {
      el.className = 'tile ty'
      el.innerHTML = `<div class="pic"><b>${escapeHtml(work.t)}</b><span class="m">picture soon</span></div><div class="ir"></div><div class="gl"></div><div class="halo"></div>`
    }
    cell.blur = -1
    cell.sized = ''
  }

  function capHTML(work) {
    const { mob } = metrics()
    const s = getSettings()
    const maxc = mob ? 16 : 24
    const words = work.t.split(' ')
    const lines = []
    let cur = ''
    for (const word of words) {
      if (cur && `${cur} ${word}`.length > maxc) {
        lines.push(cur)
        cur = word
      } else {
        cur = cur ? `${cur} ${word}` : word
      }
    }
    lines.push(cur)
    const longest = Math.max(...lines.map((line) => line.length))
    const fs = Math.min(mob ? 30 : 42, (innerWidth * 0.62) / (longest * 0.8)) * (s.fontScale || 1)
    let q = 0
    const html = lines.map((line) => {
      const chars = [...line]
      const body = chars.map((ch, i) => {
        const u = chars.length > 1 ? ((i - (chars.length - 1) / 2) / ((chars.length - 1) / 2)) : 0
        const delay = (q++) * 28
        const text = ch === ' ' ? '&nbsp;' : escapeHtml(ch)
        return `<span class="ch" style="animation-delay:${delay}ms"><span class="g" data-u="${u.toFixed(3)}">${text}</span></span>`
      }).join('')
      return `<div class="ln">${body}</div>`
    }).join('')
    const when = work.y === '[TBC]' ? '' : `, ${work.y}`
    const sub = `${work.l.replace(/\.$/, '')}${when}`
    // data-fs stays unscaled so the type spring can apply fontScale live.
    const base = fs / (s.fontScale || 1)
    return `<div class="t" data-fs="${base.toFixed(1)}" style="font-size:${fs.toFixed(1)}px">${html}</div><div class="l">${escapeHtml(sub)}</div>`
  }

  function showCaption(code) {
    const work = workByCode(code)
    const html = capHTML(work)
    if (!captionShown) {
      const first = document.getElementById('capA')
      first.innerHTML = html
      first.style.opacity = '1'
      document.getElementById('capB').style.opacity = '0'
      capOn = 'A'
      captionShown = true
      return
    }
    const current = document.getElementById(`cap${capOn}`)
    const nextId = capOn === 'A' ? 'B' : 'A'
    const next = document.getElementById(`cap${nextId}`)
    next.innerHTML = html
    next.style.opacity = '1'
    current.style.opacity = '0'
    capOn = nextId
  }

  function openDetail(code) {
    const work = workByCode(code)
    if (!work) return
    const index = LINE.indexOf(code) + 1
    const picture = work.im
      ? `style="background-image:url('${imgUrl(work.im)}')${GREY.has(code) ? ';filter:grayscale(1)' : ''}"`
      : ''
    const shot = work.im
      ? ''
      : `<div class="soon"><div>${escapeHtml(work.t)}</div><div class="m">no picture yet</div></div>`
    document.getElementById('dbody').innerHTML = `<div><div class="dimg" ${picture}>${shot}</div></div>
      <div><div class="m mu">${index} of ${LINE.length}</div>
      <h2>${escapeHtml(work.t)}</h2>
      <p class="blurb">${escapeHtml(work.l)}. <span class="mu">More on this soon.</span></p>
      <div class="facts">
        <div><span class="mu">Ref</span><span>${work.c}</span></div>
        <div><span class="mu">What</span><span>${escapeHtml(work.cat)}</span></div>
        <div><span class="mu">When</span><span>${work.y === '[TBC]' ? 'Not sure yet' : escapeHtml(work.y)}</span></div>
      </div>
      <p class="m mail"><a href="mailto:ikramandhakim@gmail.com">ikramandhakim@gmail.com</a></p>
      </div>`
    detail.classList.add('on')
  }

  function closeDetail() {
    detail.classList.remove('on')
  }

  function clickAt(cx, cy) {
    const { T, TH, S, SY } = metrics()
    const dx = cx - innerWidth / 2
    const dy = cy - innerHeight / 2
    if (Math.abs(dx) < T * 0.65 && Math.abs(dy) < TH * 0.65) {
      openDetail(focus)
      return
    }
    tx = Math.round((x + dx * 1.1) / S) * S
    ty = Math.round((y + dy * 1.1) / SY) * SY
    snapping = true
  }

  function toneType() {
    const cap = document.getElementById(`cap${capOn}`)
    if (!cap) return
    const dvx = x - ox
    const dvy = y - oy
    const targetSk = clamp(-dvx * 0.55, -16, 16)
    const targetSt = clamp(Math.abs(dvy) * 0.012 - Math.abs(dvx) * 0.003, -0.22, 0.22)
    const motion = effectMotion() > 0.01 ? 1 : 0
    skv += (targetSk * motion - sk) * 0.14
    skv *= 0.78
    sk += skv
    stv += (targetSt * motion - st) * 0.14
    stv *= 0.78
    st += stv
    const title = cap.querySelector('.t')
    if (!title) return
    const fs = (+title.dataset.fs || 42) * getSettings().fontScale
    cap.querySelectorAll('.ln').forEach((line) => {
      line.style.transform = `skewX(${sk.toFixed(2)}deg) scale(${(1 - st * 0.35).toFixed(3)},${(1 + st).toFixed(3)})`
    })
    let near = false
    const reach = touch ? 150 : 110
    cap.querySelectorAll('.g').forEach((glyph) => {
      const u = +glyph.dataset.u
      let k = 0.78 + 0.34 * (1 - u * u)
      if (pointerX !== null && pointerX > -900) {
        const r = glyph.getBoundingClientRect()
        const d = Math.hypot(r.left + r.width / 2 - pointerX, r.top + r.height / 2 - pointerY)
        if (d < reach) {
          k += 0.32 * (1 - d / reach) ** 2
          near = true
        }
      }
      const prev = +(glyph.dataset.k || k)
      const kk = prev + (k - prev) * 0.25
      glyph.dataset.k = kk.toFixed(4)
      glyph.style.fontSize = `${(fs * kk).toFixed(1)}px`
    })
    lens.classList.toggle('big', near && !touch)
  }

  function frame() {
    const now = performance.now()
    const m = metrics()
    const need = Math.ceil(innerWidth / m.S) + 4 !== NC || Math.ceil(innerHeight / m.SY) + 4 !== NR
    if (need) build()
    if (!dragging) {
      if (now - lastInput > 140 && !snapping && Math.hypot(tx - x, ty - y) < m.SY * 0.35) snapping = true
      if (snapping) {
        tx += (Math.round(tx / m.S) * m.S - tx) * 0.18
        ty += (Math.round(ty / m.SY) * m.SY - ty) * 0.18
      }
      x += (tx - x) * 0.11
      y += (ty - y) * 0.11
    }
    const ci = Math.floor(x / m.S)
    const cj = Math.floor(y / m.SY)
    const i0 = ci - Math.floor(NC / 2)
    const j0 = cj - Math.floor(NR / 2)
    let k = 0
    let best = null
    let bestEl = null
    let bd = 1e9
    for (let b = 0; b < NR; b++) {
      for (let a = 0; a < NC; a++) {
        const i = i0 + a
        const j = j0 + b
        const cell = pool[k++]
        const code = codeAt(i, j)
        paint(cell, code)
        const w = m.T
        const h = m.LH
        const sizeKey = `${w}x${h}`
        if (cell.sized !== sizeKey) {
          cell.e.style.width = `${w + 60}px`
          cell.e.style.height = `${h + 60}px`
          cell.e.style.marginLeft = `${-w / 2 - 30}px`
          cell.e.style.marginTop = `${-h / 2 - 30}px`
          cell.sized = sizeKey
        }
        cell.e.style.setProperty('--r', `${h * m.radiusRatio}px`)
        const sx = i * m.S - x
        const sy = j * m.SY - y
        const d = Math.hypot(sx, sy * m.S / m.SY)
        const ax = sx / m.R
        const ay = sy / m.R
        const X = m.R * Math.sin(ax)
        const Y = m.R * Math.sin(ay) * Math.cos(ax * 0.5)
        const Z = m.R * (Math.cos(ax) * Math.cos(ay) - 1) * 1.25 + m.Zf * Math.exp(-(d * d) / (m.S * m.S * 0.55))
        const sc = (1 - 0.15 * Math.min(1, (d / m.R) ** 2)) * (1 + m.focusScale * Math.exp(-(d * d) / (m.S * m.S * 0.5)))
        const rotY = Math.atan(1.25 * Math.tan(clamp(ax, -1.4, 1.4))) * 57.3
        const rotX = -Math.atan(1.25 * Math.tan(clamp(ay, -1.4, 1.4))) * 57.3
        cell.e.style.transform = `translate3d(${X.toFixed(1)}px,${Y.toFixed(1)}px,${Z.toFixed(1)}px) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) scale(${sc.toFixed(3)})`
        const blur = Math.min(6, Math.floor(d / (m.S * 0.9)))
        if (blur !== cell.blur || GREY.has(code)) {
          cell.blur = blur
          const parts = []
          if (blur) parts.push(`blur(${blur * (m.mob ? 0.7 : 1)}px)`)
          if (GREY.has(code)) parts.push('grayscale(1)')
          cell.e.style.filter = parts.join(' ') || 'none'
        }
        cell.e.style.opacity = Math.max(0.25, 1 - d / (m.R * 1.15)).toFixed(2)
        cell.e.style.zIndex = String(1000 - Math.round(d / 10))
        if (d < bd) {
          bd = d
          best = code
          bestEl = cell.e
        }
      }
    }
    if (bestEl !== focusedEl) {
      if (focusedEl) {
        focusedEl.classList.remove('foc')
        focusedEl.style.removeProperty('--dx')
        focusedEl.style.removeProperty('--dy')
      }
      focusedEl = bestEl
      if (focusedEl) focusedEl.classList.add('foc')
    }
    if (best !== focus) {
      focus = best
      showCaption(best)
    }
    const frameVx = x - ox
    const frameVy = y - oy
    if (focusedEl) {
      let tdx = clamp(frameVx * 0.5, -9, 9)
      let tdy = clamp(frameVy * 0.5, -9, 9)
      if (pointerX !== null) {
        tdx += clamp((pointerX - innerWidth / 2) / innerWidth * 14, -6, 6)
        tdy += clamp((pointerY - innerHeight / 2) / innerHeight * 14, -6, 6)
      }
      fx += (tdx - fx) * 0.12
      fy += (tdy - fy) * 0.12
      focusedEl.style.setProperty('--dx', fx.toFixed(2))
      focusedEl.style.setProperty('--dy', fy.toFixed(2))
    }
    toneType()
    ox = x
    oy = y
    glass.sync({ focusedEl, x, y })
    caption.sync()
    requestAnimationFrame(frame)
  }

  stage.addEventListener('pointerdown', (e) => {
    if (detail.classList.contains('on')) return
    dragging = true
    stage.classList.add('drag')
    px = e.clientX
    py = e.clientY
    pt = performance.now()
    moved = 0
    tx = x
    ty = y
    snapping = false
    pointerX = e.clientX
    pointerY = e.clientY
    touch = e.pointerType === 'touch'
    stage.setPointerCapture(e.pointerId)
  })
  stage.addEventListener('pointermove', (e) => {
    pointerX = e.clientX
    pointerY = e.clientY
    touch = e.pointerType === 'touch'
    if (!touch) {
      lens.style.left = `${e.clientX}px`
      lens.style.top = `${e.clientY}px`
      lens.classList.add('on')
    }
    if (!dragging) return
    const dx = e.clientX - px
    const dy = e.clientY - py
    moved += Math.abs(dx) + Math.abs(dy)
    tx -= dx
    ty -= dy
    x = tx
    y = ty
    px = e.clientX
    py = e.clientY
    pt = performance.now()
    lastInput = pt
  })
  stage.addEventListener('pointerup', (e) => {
    dragging = false
    stage.classList.remove('drag')
    lastInput = performance.now()
    if (e.pointerType === 'touch') {
      pointerX = null
      pointerY = null
    }
    if (moved < 6) clickAt(e.clientX, e.clientY)
  })
  stage.addEventListener('pointerleave', () => lens.classList.remove('on'))
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return
    pointerX = e.clientX
    pointerY = e.clientY
  })
  addEventListener('wheel', (e) => {
    if (detail.classList.contains('on')) return
    if (e.target.closest && e.target.closest('#debug-panel, #debug-toggle')) return
    e.preventDefault()
    const k = e.deltaMode === 1 ? 30 : 1
    tx += e.deltaX * k * (e.shiftKey ? 0 : 1) + (e.shiftKey ? e.deltaY * k : 0)
    ty += e.shiftKey ? 0 : e.deltaY * k
    lastInput = performance.now()
    snapping = false
  }, { passive: false })
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('#debug-panel')) return
    const key = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (key && !detail.classList.contains('on')) {
      const { S, SY } = metrics()
      tx = Math.round(tx / S) * S + key[0] * S
      ty = Math.round(ty / SY) * SY + key[1] * SY
      snapping = true
    }
    if (e.key === 'Escape') closeDetail()
    if (e.key === 'Enter' && focus && !detail.classList.contains('on')) openDetail(focus)
  })
  document.getElementById('close').addEventListener('click', closeDetail)
  for (const id of ['cam', 'mic']) {
    document.getElementById(id).addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(id === 'cam' ? { video: true } : { audio: true })
        const button = document.getElementById(id)
        button.style.background = '#151615'
        button.querySelector('svg').style.stroke = '#fff'
        button.classList.add('live')
        window[`_${id}`] = stream
      } catch {
        // Permission denied leaves the crossed icon as-is.
      }
    })
  }
  addEventListener('resize', () => {
    build()
    placeCaps()
  })

  placeCaps()
  build()
  requestAnimationFrame(frame)

  return {
    rebuildCaption() {
      if (focus) {
        captionShown = false
        showCaption(focus)
      }
    },
  }
}
