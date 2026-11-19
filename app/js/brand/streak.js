// Streaked name mark. The name is set in Kertas, then one slice of it (a
// column or a row of pixels) is pulled out long along a bent path, the way
// the board's window walls smear the edge of a picture (Spike Jonze's
// stretching room in "Welcome Home"). Everything is plain canvas drawImage:
// no blur, no shader.
//
// Lengths are in em (multiples of the font size) so a mark looks the same at
// 19px in the corner and at 90px in the lab.

const FONT_URL = new URL('../../fonts/Kertas.woff2', import.meta.url).href

export const PALETTES = {
  ink: ['#1C1B1A', '#1C1B1A'],
  sunset: ['#E8735A', '#F4B183', '#E58FA5', '#A99BD6'],
  peach: ['#F08A6C', '#F7C59F', '#FBE3CF'],
  dusk: ['#5B4B8A', '#C27BA0', '#F2B5A0'],
  lagoon: ['#2F7F8F', '#7FC8C9', '#CFE8E0'],
  'ink to sunset': ['#1C1B1A', '#E8735A', '#F4B183', '#E58FA5'],
  // thin-film colours, for the sheets: pink, mint, lilac, butter, sky
  iridescent: ['#FF9CC6', '#8FEBC8', '#B39CFF', '#FFD98A', '#8CCFFF', '#FF9CC6'],
  opal: ['#F6D3E4', '#D6F1E8', '#DCD5FA', '#F9EBD3', '#F6D3E4'],
  // solid stripes, from Ikram's references: slate, navy, orange, cream,
  // plum, red, mint, butter
  film: ['#8FA3BF', '#1F2A5C', '#E8803F', '#F1EBDD', '#3B2350', '#D2373C', '#7CCBA8', '#E9D57A', '#5C6F9A', '#F4B183'],
}

export const SHAPES = {
  // where the path sits at t (0 at the cut, 1 at the far end), in units of bend
  lean: (t) => t,
  swoop: (t) => t * t,
  hook: (t) => 1 - (1 - t) * (1 - t),
  arch: (t) => Math.sin(Math.PI * t),
  wave: (t) => Math.sin(2 * Math.PI * t),
}

let fontData = null
async function fontURL() {
  if (fontData) return fontData
  const buf = await (await fetch(FONT_URL)).arrayBuffer()
  let bin = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  fontData = 'data:font/woff2;base64,' + btoa(bin)
  return fontData
}

// Width of a word as the page would set it, so the SVG is cut to size.
function measure(text, px, weight, hand) {
  const s = document.createElement('span')
  s.textContent = text
  s.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:Kertas;font-size:${px}px;font-weight:${weight};font-variation-settings:"wght" ${weight},"HAND" ${hand}`
  document.body.appendChild(s)
  const w = s.getBoundingClientRect().width
  s.remove()
  return w
}

// Canvas can't reach the custom HAND axis, so the word is drawn as an SVG
// image with the font inside it, then copied onto a canvas.
const textCache = new Map()
export async function textCanvas(text, px, weight, hand) {
  const key = [text, px, weight, hand].join('|')
  if (textCache.has(key)) return textCache.get(key)
  const p = (async () => {
    await document.fonts.load(`${weight} ${px}px Kertas`)
    const url = await fontURL()
    const pad = Math.ceil(px * 0.25)
    const w = Math.ceil(measure(text, px, weight, hand)) + pad * 2
    const h = Math.ceil(px * 1.35) + pad * 2
    const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><style>@font-face{font-family:K;src:url(${url}) format("woff2");font-weight:300 700}text{font-family:K;font-size:${px}px;font-weight:${weight};font-variation-settings:"wght" ${weight},"HAND" ${hand};fill:#1C1B1A;white-space:pre}</style><text x="${pad}" y="${pad + px * 1.02}">${esc}</text></svg>`
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    await img.decode()
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0)
    return trim(c)
  })()
  textCache.set(key, p)
  return p
}

// Crop to the ink, keeping a 2px margin, and note where the ink sits.
function trim(c) {
  const { width: w, height: h } = c
  const d = c.getContext('2d').getImageData(0, 0, w, h).data
  let x0 = w, x1 = 0, y0 = h, y1 = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 24) {
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  const m = 2
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m)
  x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m)
  const out = document.createElement('canvas')
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  out.getContext('2d', { willReadFrequently: true }).drawImage(c, -x0, -y0)
  return out
}

function gradient(ctx, x0, y0, x1, y1, colors) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  colors.forEach((c, i) => g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), c))
  return g
}

// Colour and fade a layer that holds the streak in plain ink.
function tint(layer, from, to, colors, fade) {
  const ctx = layer.getContext('2d')
  ctx.save()
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = gradient(ctx, from[0], from[1], to[0], to[1], colors)
  ctx.fillRect(0, 0, layer.width, layer.height)
  if (fade > 0) {
    ctx.globalCompositeOperation = 'destination-in'
    const g = ctx.createLinearGradient(from[0], from[1], to[0], to[1])
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(0.35, `rgba(0,0,0,${1 - fade * 0.35})`)
    g.addColorStop(1, `rgba(0,0,0,${Math.max(0, 1 - fade)})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, layer.width, layer.height)
  }
  ctx.restore()
}

function lerpColor(colors, t) {
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const f = t * (colors.length - 1)
  const i = Math.min(colors.length - 2, Math.floor(f))
  const a = hex(colors[i]), b = hex(colors[Math.min(colors.length - 1, i + 1)])
  const k = f - i
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(',')})`
}

function tintedCopies(src, colors, n) {
  return Array.from({ length: n }, (_, i) => {
    const c = new OffscreenCanvas(src.width, src.height)
    const x = c.getContext('2d')
    x.drawImage(src, 0, 0)
    x.globalCompositeOperation = 'source-in'
    x.fillStyle = lerpColor(colors, i / (n - 1))
    x.fillRect(0, 0, c.width, c.height)
    return c
  })
}

export const DEFAULTS = {
  text: 'Ikram Hakim',
  mode: 'smear',      // smear | drip | bridge | tunnel | sheet | stretch
  cut: 0.96,          // where the slice is taken, 0..1 across (smear) or down (drip)
  length: 6,          // em
  bend: 0.8,          // em, how far the path bows away from straight
  shape: 'swoop',
  spread: 0.4,        // how much the streak opens up as it runs (perspective)
  fade: 0.7,
  palette: 'sunset',
  weight: 560,
  hand: 35,
  motion: 'still',    // still | breathe | sway
  angle: 40,          // sheets: direction of the sweep in degrees (0 right, 90 down)
  twist: 0.5,         // sheets: how many half-folds the sheet turns through
  sheen: 1.2,         // sheets: how many times the colours cycle along the sweep
  density: 0.07,      // sheets: how see-through each layer is
  glow: 0.5,          // sheets: soft smeared halo under the sheet
  face: 'ink',        // sheets: the letters on top, ink or pearl
  end: 'none',        // sheets: a second name where the sweep lands (none | ink | pearl)
  caps: 'off',        // 'on' sets the name in capitals
  bands: 'off',       // sheets: 'on' gives each stroke one flat colour instead of a blended film
  gaps: 'filled',     // stretch: spaces between strokes become stripes too (filled = colour | pale | clear)
  reach: 1,           // scales the streak's length and bend together: below 1 pulls it in close
  turn: 0,            // 3D: degrees the whole mark turns away around its upright axis
  tip: 0,             // 3D: degrees it tips back around its level axis
  depth: 14,          // 3D: camera distance in em; smaller means stronger perspective
  slant: 0,           // tilt of the slice; a tilted slice crosses several strokes, so the streak breaks into lines
}

// One slice of the name, 1px thick. Straight (slant 0) it is a plain column or
// row; tilted, it cuts across neighbouring strokes and each crossing becomes
// its own line in the streak.
function slice(src, at, slant, vertical) {
  const W = src.width, H = src.height
  const d = src.getContext('2d').getImageData(0, 0, W, H).data
  const n = vertical ? W : H
  const out = vertical ? new OffscreenCanvas(W, 1) : new OffscreenCanvas(1, H)
  const oc = out.getContext('2d')
  const img = oc.createImageData(out.width, out.height)
  for (let i = 0; i < n; i++) {
    const off = slant * (vertical ? H : W) * (i / n - 0.5)
    const a = Math.round(Math.min((vertical ? H : W) - 1, Math.max(0, at + off)))
    const x = vertical ? i : a, y = vertical ? a : i
    const k = (y * W + x) * 4
    for (let c = 0; c < 4; c++) img.data[i * 4 + c] = d[k + c]
  }
  oc.putImageData(img, 0, 0)
  return out
}

// Room needed around the name for the streak, in em.
function room(o) {
  const L = o.length, B = Math.abs(o.bend) + 0.2, S = Math.max(0, o.spread) * 0.6
  switch (o.mode) {
    case 'smear': return { l: 0.1, r: L + 0.2, t: B + S, b: B + S }
    case 'drip': return { l: B + S, r: B + S, t: 0.1, b: L + 0.2 }
    case 'bridge': return { l: 0.1, r: 0.2, t: B + S, b: B + S }
    case 'tunnel': return { l: B + 0.2, r: L * 0.45 + B, t: B + 0.2, b: L * 0.55 + B }
  }
}

// Draw the mark into `canvas`. `px` is the font size in device pixels.
// `phase` (seconds) drives motion; pass 0 for a still frame.
export async function render(canvas, opts, px, phase = 0) {
  const o = { ...DEFAULTS, ...opts }
  if (o.caps === 'on') o.text = o.text.toUpperCase()
  o.length *= o.reach
  o.bend *= o.reach
  const shape = SHAPES[o.shape] || SHAPES.swoop
  let bend = o.bend
  if (o.motion === 'breathe') bend *= 0.55 + 0.45 * Math.sin(phase * 0.9)
  if (o.motion === 'sway') bend *= Math.sin(phase * 0.7)
  const colors = PALETTES[o.palette] || PALETTES.sunset
  const em = px

  if (o.mode === 'bridge') return renderBridge(canvas, o, px, bend, shape, colors)
  if (o.mode === 'sheet') return renderSheet(canvas, o, px, bend, shape, colors, phase)
  if (o.mode === 'stretch') return renderStretch(canvas, o, px, bend, shape, colors)

  const src = await textCanvas(o.text, px, o.weight, o.hand)
  const W = src.width, H = src.height
  const r = room(o)
  const ox = Math.ceil(r.l * em), oy = Math.ceil(r.t * em)
  canvas.width = Math.ceil(W + (r.l + r.r) * em)
  canvas.height = Math.ceil(H + (r.t + r.b) * em)
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const layer = new OffscreenCanvas(canvas.width, canvas.height)
  const lc = layer.getContext('2d')
  const L = o.length * em

  if (o.mode === 'smear') {
    const cx = Math.round(Math.min(W - 1, Math.max(0, o.cut * W)))
    // the name up to the cut stays as it is
    ctx.drawImage(src, 0, 0, cx, H, ox, oy, cx, H)
    const sl = slice(src, cx, o.slant, false)
    for (let i = 0; i < L; i++) {
      const t = i / L
      const s = 1 + o.spread * t
      const dy = bend * em * shape(t)
      lc.drawImage(sl, 0, 0, 1, H, ox + cx + i, oy + H / 2 - (H * s) / 2 + dy, 1.6, H * s)
    }
    tint(layer, [ox + cx, 0], [ox + cx + L, 0], colors, o.fade)
  } else if (o.mode === 'drip') {
    const cy = Math.round(Math.min(H - 1, Math.max(0, o.cut * H)))
    ctx.drawImage(src, 0, 0, W, cy, ox, oy, W, cy)
    const sl = slice(src, cy, o.slant, true)
    for (let i = 0; i < L; i++) {
      const t = i / L
      const s = 1 + o.spread * t
      const dx = bend * em * shape(t)
      lc.drawImage(sl, 0, 0, W, 1, ox + W / 2 - (W * s) / 2 + dx, oy + cy + i, W * s, 1.6)
    }
    tint(layer, [0, oy + cy], [0, oy + cy + L], colors, o.fade)
  } else if (o.mode === 'tunnel') {
    // copies of the name, each smaller and further along a bent line toward a
    // vanishing point, so every edge of every letter draws a streak
    const steps = Math.ceil(L * 1.2)
    const vx = L * 0.45, vy = L * 0.55
    // each copy takes the colour of its depth, so the walls shade from the
    // first colour at the letters to the last at the back
    const tints = tintedCopies(src, colors, 16)
    for (let i = steps; i >= 1; i--) {
      const t = i / steps
      const s = 1 - (0.85 - o.spread * 0.3) * t
      const x = ox + vx * t + (W * (1 - s)) / 2 + bend * em * shape(t)
      const y = oy + vy * t + (H * (1 - s)) / 2
      lc.globalAlpha = Math.max(0, 1 - o.fade * t)
      lc.drawImage(tints[Math.min(15, Math.floor(t * 16))], x, y, W * s, H * s)
    }
    lc.globalAlpha = 1
  }
  ctx.drawImage(layer, 0, 0)
  if (o.mode === 'tunnel') ctx.drawImage(src, ox, oy)
  return { ox, oy, W, H }
}

// "Ikram" and "Hakim" joined by the streak of Ikram's last stroke melting
// into Hakim's first.
async function renderBridge(canvas, o, px, bend, shape, colors) {
  const [first, ...rest] = o.text.split(' ')
  const a = await textCanvas(first, px, o.weight, o.hand)
  const b = await textCanvas(rest.join(' ') || first, px, o.weight, o.hand)
  const em = px
  const L = Math.max(0.6, o.length) * em
  const r = room(o)
  const ox = Math.ceil(r.l * em), oy = Math.ceil(r.t * em)
  const H = Math.max(a.height, b.height)
  const endDy = bend * em * shape(1)
  canvas.width = Math.ceil(a.width + L + b.width + (r.l + r.r) * em)
  canvas.height = Math.ceil(H + (r.t + r.b) * em + Math.abs(endDy))
  const top = oy + Math.max(0, -endDy)
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const layer = new OffscreenCanvas(canvas.width, canvas.height)
  const lc = layer.getContext('2d')
  const ca = Math.round(a.width * Math.min(1, o.cut)) - 3
  const cb = 3
  const x0 = ox + ca
  for (let i = 0; i < L; i++) {
    const t = i / L
    const s = 1 + o.spread * Math.sin(Math.PI * t)
    const dy = bend * em * shape(t)
    const y = top + H / 2 - (H * s) / 2 + dy
    lc.globalAlpha = 1 - t
    lc.drawImage(a, ca, 0, 1, a.height, x0 + i, y, 1.6, a.height * s)
    lc.globalAlpha = t
    lc.drawImage(b, cb, 0, 1, b.height, x0 + i, y, 1.6, b.height * s)
  }
  lc.globalAlpha = 1
  tint(layer, [x0, 0], [x0 + L, 0], colors, 0)
  if (o.fade > 0) {
    // the middle of the bridge thins out, both ends stay solid
    lc.globalCompositeOperation = 'destination-in'
    const g = lc.createLinearGradient(x0, 0, x0 + L, 0)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(0.5, `rgba(0,0,0,${1 - o.fade * 0.8})`)
    g.addColorStop(1, 'rgba(0,0,0,1)')
    lc.fillStyle = g
    lc.fillRect(0, 0, layer.width, layer.height)
  }
  ctx.drawImage(a, 0, 0, ca, a.height, ox, top, ca, a.height)
  ctx.drawImage(layer, 0, 0)
  ctx.drawImage(b, cb, 0, b.width - cb, b.height, x0 + L, top + endDy, b.width - cb, b.height)
  return { ox, oy: top, W: a.width + L + b.width, H }
}

// Sheets: the whole name swept through space as hundreds of faint layers,
// each one a little further along a bent path, folding (scaled flat and back)
// as it goes, and coloured like a soap film. The stems of the letters pile up
// into translucent ribbons; where they overlap the colour deepens.
function filmCopies(src, colors, n) {
  return Array.from({ length: n }, (_, i) => {
    const c = new OffscreenCanvas(src.width, src.height)
    const x = c.getContext('2d')
    x.drawImage(src, 0, 0)
    x.globalCompositeOperation = 'source-in'
    // a diagonal gradient that rolls with i, so the film shifts colour both
    // along the sweep and across each letter
    const g = x.createLinearGradient(0, 0, c.width * 0.35, c.height)
    const k = colors.length
    for (let j = 0; j <= 8; j++) {
      const f = (j / 8 + i / n) % 1
      g.addColorStop(j / 8, lerpColor(colors, f))
    }
    x.fillStyle = g
    x.fillRect(0, 0, c.width, c.height)
    return c
  })
}

// One flat colour per stroke: a row is read across the name, each stroke it
// crosses gets the next palette colour, with hard edges halfway between
// strokes. The sheet keeps those colours all the way along, so it comes out
// as solid bands instead of a blended film.
function bandedCopy(src, colors) {
  const W = src.width, H = src.height
  const d = src.getContext('2d').getImageData(0, 0, W, H).data
  const row = Math.round(H * 0.62)
  const runs = []
  let inside = false, a = 0
  for (let x = 0; x <= W; x++) {
    const on = x < W && d[(row * W + x) * 4 + 3] > 110
    if (on && !inside) { a = x; inside = true }
    if (!on && inside) { runs.push([a, x]); inside = false }
  }
  // paint the bands on their own, then keep them only where the letters are
  // (one source-in pass: several would each wipe out the previous band)
  const bandsC = new OffscreenCanvas(W, H)
  const bx = bandsC.getContext('2d')
  runs.forEach((r, i) => {
    const from = i ? (runs[i - 1][1] + r[0]) / 2 : 0
    const to = i < runs.length - 1 ? (r[1] + runs[i + 1][0]) / 2 : W
    bx.fillStyle = colors[i % colors.length]
    bx.fillRect(Math.floor(from), 0, Math.ceil(to - from) + 1, H)
  })
  const c = new OffscreenCanvas(W, H)
  const x = c.getContext('2d')
  x.drawImage(src, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.drawImage(bandsC, 0, 0)
  return [c]
}

const filmCache = new Map()
async function renderSheet(canvas, o, px, bend, shape, colors, phase) {
  const src = await textCanvas(o.text, px, o.weight, o.hand)
  const W = src.width, H = src.height
  const em = px
  const L = o.length * em
  const a = (o.angle * Math.PI) / 180
  const ux = Math.cos(a), uy = Math.sin(a)   // along the sweep
  const nx = -uy, ny = ux                    // across it, for the bend
  const steps = Math.max(8, Math.ceil(L))
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const b = bend * em * shape(t)
    // with a second name at the end the sweep comes back to full size there
    const s = o.end !== 'none'
      ? Math.max(0.05, 1 + (o.spread * 0.5 - 0.3) * Math.sin(Math.PI * t))
      : Math.max(0.05, 1 + o.spread * t * 0.5 - 0.45 * t)
    const fold = Math.cos(Math.PI * o.twist * t + phase * 0.6 * (o.motion === 'sway' ? 1 : 0))
    pts.push({ t, x: ux * L * t + nx * b, y: uy * L * t + ny * b, s, fx: Math.max(0.04, Math.abs(fold)) })
  }
  // bounds of every layer, so the canvas fits the whole sweep
  let x0 = 0, y0 = 0, x1 = W, y1 = H
  for (const p of pts) {
    const w = W * p.s, h = H * p.s
    x0 = Math.min(x0, p.x + W / 2 - w / 2); x1 = Math.max(x1, p.x + W / 2 + w / 2)
    y0 = Math.min(y0, p.y + H / 2 - h / 2); y1 = Math.max(y1, p.y + H / 2 + h / 2)
  }
  const pad = Math.ceil(em * 0.4)
  const ox = Math.ceil(-x0) + pad, oy = Math.ceil(-y0) + pad
  canvas.width = Math.ceil(x1 - x0) + pad * 2
  canvas.height = Math.ceil(y1 - y0) + pad * 2
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const key = [o.text, px, o.weight, o.hand, o.palette, o.bands].join('|')
  if (!filmCache.has(key)) filmCache.set(key, o.bands === 'on' ? bandedCopy(src, colors) : filmCopies(src, colors, 24))
  const film = filmCache.get(key)
  const roll = o.motion === 'breathe' ? phase * 0.08 : 0

  const layer = new OffscreenCanvas(canvas.width, canvas.height)
  const lc = layer.getContext('2d')
  for (let i = pts.length - 1; i >= 1; i--) {
    const p = pts[i]
    const f = (p.t * o.sheen + roll) % 1
    // joining two names, the ribbon is fullest at both ends and thins between
    const thin = o.end !== 'none' ? Math.sin(Math.PI * p.t) : p.t
    lc.globalAlpha = Math.max(0, o.density * (1 - o.fade * thin))
    const cx = ox + p.x + W / 2, cy = oy + p.y + H / 2
    lc.setTransform(p.s * p.fx, 0, 0, p.s, cx, cy)
    lc.drawImage(film[Math.floor(f * film.length) % film.length], -W / 2, -H / 2)
  }
  lc.setTransform(1, 0, 0, 1, 0, 0)
  lc.globalAlpha = 1

  if (o.glow > 0) {
    ctx.save()
    ctx.filter = `blur(${(em * 0.12 * o.glow).toFixed(1)}px)`
    ctx.globalAlpha = Math.min(1, o.glow)
    ctx.drawImage(layer, 0, 0)
    ctx.restore()
  }
  ctx.drawImage(layer, 0, 0)
  if (o.face === 'pearl') {
    ctx.drawImage(film[Math.floor(roll * film.length) % film.length], ox, oy)
    ctx.globalAlpha = 0.22
    ctx.drawImage(src, ox, oy)
    ctx.globalAlpha = 1
  } else if (o.face !== 'none') {
    ctx.drawImage(src, ox, oy)
  }
  if (o.end !== 'none') {
    const p = pts[pts.length - 1]
    const ex = ox + p.x + (W * (1 - p.s)) / 2, ey = oy + p.y + (H * (1 - p.s)) / 2
    if (o.end === 'pearl') ctx.drawImage(film[0], ex, ey, W * p.s, H * p.s)
    else ctx.drawImage(src, ex, ey, W * p.s, H * p.s)
  }
  return { ox, oy, W, H }
}

// Solid stripes. A line is cut across the name, square to the sweep; every
// stroke it crosses becomes a band of flat colour, and the bands run off along
// the bent path, narrowing toward a vanishing point. No transparency, no blur:
// hard edges, like a picture's edge smeared down a wall.
function stripes(src, P0, ux, uy, nx, ny, slant, gaps, colors) {
  const W = src.width, H = src.height
  const d = src.getContext('2d').getImageData(0, 0, W, H).data
  const half = (Math.abs(nx) * W + Math.abs(ny) * H) / 2 + 1
  const ink = []
  for (let k = -half; k <= half; k++) {
    const along = slant * half * (k / half)
    const x = Math.round(P0.x + nx * k + ux * along), y = Math.round(P0.y + ny * k + uy * along)
    const on = x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 110
    ink.push(on)
  }
  // runs of ink and of gap, as offsets across the sweep
  const runs = []
  let start = 0
  for (let i = 1; i <= ink.length; i++) {
    if (i === ink.length || ink[i] !== ink[start]) {
      runs.push({ a: start - half, b: i - half, ink: ink[start] })
      start = i
    }
  }
  const first = runs.findIndex((r) => r.ink)
  const last = runs.length - 1 - [...runs].reverse().findIndex((r) => r.ink)
  if (first < 0) return []
  const bands = []
  let c = 0, g = 0
  const pale = ['#ECE5D6', '#BCC8D8', '#F6F2EA', '#D9D0E8']
  for (let i = first; i <= last; i++) {
    const r = runs[i]
    // filled: strokes and the spaces between them all take a colour, so the
    // stripes come out wide and narrow; pale: spaces are soft paper tones
    if (r.ink || gaps === 'filled') bands.push({ a: r.a, b: r.b, color: colors[c++ % colors.length] })
    else if (gaps === 'pale') bands.push({ a: r.a, b: r.b, color: pale[g++ % pale.length] })
  }
  return bands
}

// fine lines inside a band: the same colour, a touch lighter or darker
function shade(hex, k) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${v.map((x) => Math.round(k > 0 ? x + (255 - x) * k : x * (1 + k))).join(',')})`
}

async function renderStretch(canvas, o, px, bend, shape, colors) {
  const src = await textCanvas(o.text, px, o.weight, o.hand)
  const W = src.width, H = src.height
  const em = px
  const L = o.length * em
  const a = (o.angle * Math.PI) / 180
  const ux = Math.cos(a), uy = Math.sin(a)
  const nx = -uy, ny = ux
  // the cut line sits `cut` of the way through the name along the sweep
  const ext = Math.abs(ux) * W + Math.abs(uy) * H
  const P0 = { x: W / 2 + ux * (o.cut - 0.5) * ext, y: H / 2 + uy * (o.cut - 0.5) * ext }
  const bands = stripes(src, P0, ux, uy, nx, ny, o.slant, o.gaps, colors)

  const steps = Math.max(12, Math.ceil(L / 2))
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const b = bend * em * shape(t)
    pts.push({ x: P0.x + ux * L * t + nx * b, y: P0.y + uy * L * t + ny * b, s: Math.max(0.02, 1 + o.spread * t * 0.5 - 0.45 * t) })
  }
  // the bands keep one direction across (like the smear's upright slices), so
  // a strong bend shears the ribbon instead of folding it over itself
  pts.forEach((p) => { p.nx = nx; p.ny = ny })
  const at = (p, off) => [p.x + p.nx * off * p.s, p.y + p.ny * off * p.s]

  let x0 = 0, y0 = 0, x1 = W, y1 = H
  if (bands.length) {
    const lo = bands[0].a, hi = bands[bands.length - 1].b
    for (const p of pts) for (const off of [lo, hi]) {
      const [x, y] = at(p, off)
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
    }
  }
  const pad = Math.ceil(em * 0.3)
  const ox = Math.ceil(-x0) + pad, oy = Math.ceil(-y0) + pad
  canvas.width = Math.ceil(x1 - x0) + pad * 2
  canvas.height = Math.ceil(y1 - y0) + pad * 2
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.translate(ox, oy)

  const strip = (a, b, fill) => {
    ctx.beginPath()
    pts.forEach((p, i) => { const [x, y] = at(p, a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
    for (let i = pts.length - 1; i >= 0; i--) { const [x, y] = at(pts[i], b); ctx.lineTo(x, y) }
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
  }
  // a hair of overlap so neighbouring bands never show a seam
  const seam = 0.35
  const fine = Math.max(1, em * 0.07)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (const band of bands) {
    strip(band.a - seam, band.b + seam, band.color)
    // fine lines inside each band
    for (let x = band.a + fine; x < band.b - fine * 0.5; x += fine * (0.8 + rnd() * 1.4)) {
      const w = Math.min(band.b - x, fine * (0.3 + rnd() * 0.5))
      strip(x, x + w, shade(band.color, (rnd() - 0.5) * 0.22))
    }
  }
  ctx.restore()
  if (o.face === 'pearl') {
    ctx.globalAlpha = 0.85
    ctx.drawImage(src, ox, oy)
    ctx.globalAlpha = 1
  } else if (o.face !== 'none') {
    ctx.drawImage(src, ox, oy)
  }
  return { ox, oy, W, H }
}

// Turn the drawn mark in space with a CSS 3D transform, hinged on the left
// edge of the name, so the letters and the sheet swing round together.
// `extra` adds a little more turn (the corner uses it to follow the pointer).
export function turnInSpace(canvas, box, o, dpr, cssPx, extra = { turn: 0, tip: 0 }) {
  const t = (o.turn || 0) + extra.turn, k = (o.tip || 0) + extra.tip
  if (!t && !k) { canvas.style.transform = ''; return }
  const ox = box.ox / dpr, oy = (box.oy + box.H / 2) / dpr
  canvas.style.transformOrigin = `${ox}px ${oy}px`
  canvas.style.transform = `perspective(${((o.depth || 14) * cssPx).toFixed(0)}px) rotateY(${t}deg) rotateX(${k}deg)`
}
