// Tile glass. One WebGL pass bakes each picture (rim refraction, barrel, spectral split).
// The focused tile is redrawn every frame so warp, rim, and radius sliders are immediate.
// Technique follows the v25.17 prototype (rounded-rect SDF, ported from the vitrio approach).

import { WORKS, imgUrl } from './works.js'
import { getSettings, subscribe } from './settings.js'

const VS = `attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;v.y=1.-v.y;gl_Position=vec4(a,0.,1.);}`

const FS = `precision highp float;varying vec2 v;uniform sampler2D tx;uniform vec2 res;uniform vec4 cov;uniform float amp,bez,rad,bar,tm,wob,ch;
float sdf(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
vec3 smp(vec2 q){vec2 u=q/res+.5;u=u*cov.xy+cov.zw;return texture2D(tx,clamp(u,0.,1.)).rgb;}
void main(){vec2 p=(v-.5)*res,hb=res*.5;float d=sdf(p,hb,rad);vec2 e=vec2(1.,0.);
 vec2 n=normalize(vec2(sdf(p+e.xy,hb,rad)-sdf(p-e.xy,hb,rad),sdf(p+e.yx,hb,rad)-sdf(p-e.yx,hb,rad))+1e-5);
 float t=clamp(-d/bez,0.,1.),ed=pow(1.-t,1.8);vec2 u=p/hb;float rr=dot(u,u);
 vec2 q=p-n*ed*amp-u*rr*bar*hb.x*.07;q+=wob*vec2(sin(p.y*.045+tm*7.),cos(p.x*.04+tm*6.))*3.;
 vec3 c=vec3(smp(q+n*ed*ch).r,smp(q).g,smp(q-n*ed*ch).b);float aa=clamp(.5-d,0.,1.);gl_FragColor=vec4(c*aa,aa);}`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    return null
  }
  return shader
}

function makePainter(canvas) {
  const gl = canvas.getContext('webgl', {
    premultipliedAlpha: true,
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
  })
  if (!gl) return null
  const vs = compile(gl, gl.VERTEX_SHADER, VS)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FS)
  if (!vs || !fs) return null
  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    return null
  }
  gl.useProgram(program)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  const U = {}
  for (const name of ['res', 'cov', 'amp', 'bez', 'rad', 'bar', 'tm', 'wob', 'ch']) {
    U[name] = gl.getUniformLocation(program, name)
  }
  let current = null
  function draw(img, width, height, opts) {
    const dpr = Math.min(2, devicePixelRatio || 1)
    const bw = Math.max(2, Math.round(width * dpr))
    const bh = Math.max(2, Math.round(height * dpr))
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    if (current !== img) {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      current = img
    }
    gl.viewport(0, 0, canvas.width, canvas.height)
    const ia = img.width / img.height
    const ta = width / height
    let sx = 1
    let sy = 1
    if (ia > ta) sx = ta / ia
    else sy = ia / ta
    const radius = height * getSettings().radiusRatio
    gl.uniform2f(U.res, width, height)
    gl.uniform4f(U.cov, sx, sy, (1 - sx) * 0.5, (1 - sy) * 0.4)
    gl.uniform1f(U.amp, opts.amp)
    gl.uniform1f(U.bez, opts.bez)
    gl.uniform1f(U.rad, radius)
    gl.uniform1f(U.bar, opts.bar)
    gl.uniform1f(U.tm, performance.now() / 1000)
    gl.uniform1f(U.wob, opts.wob || 0)
    gl.uniform1f(U.ch, opts.ch)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  return { draw }
}

function sdf(px, py, hw, hh, r) {
  const qx = Math.abs(px) - hw + r
  const qy = Math.abs(py) - hh + r
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r
}

function specUrl(width, height, radius) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.round(width))
  canvas.height = Math.max(2, Math.round(height))
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(canvas.width, canvas.height)
  const hw = canvas.width / 2
  const hh = canvas.height / 2
  const bez = Math.min(canvas.width, canvas.height) * 0.32
  const r = Math.min(radius, hw, hh)
  for (let j = 0; j < canvas.height; j++) {
    for (let i = 0; i < canvas.width; i++) {
      const px = i + 0.5 - hw
      const py = j + 0.5 - hh
      const d = sdf(px, py, hw, hh, r)
      let v = 0
      if (d < 0 && -d < bez * 0.7) {
        const gx = sdf(px + 1, py, hw, hh, r) - sdf(px - 1, py, hw, hh, r)
        const gy = sdf(px, py + 1, hw, hh, r) - sdf(px, py - 1, hw, hh, r)
        const len = Math.hypot(gx, gy) || 1
        const nx = gx / len
        const ny = gy / len
        const light = Math.max(0, -ny * 0.92 - nx * 0.4)
        const light2 = Math.max(0, ny * 0.95) * 0.5
        const t = 1 + d / (bez * 0.7)
        v = (light ** 2 + light2 ** 3) * t ** 5
      }
      const o = (j * canvas.width + i) * 4
      image.data[o] = 255
      image.data[o + 1] = 255
      image.data[o + 2] = 255
      image.data[o + 3] = Math.min(255, v * 230)
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function failed() {
  document.documentElement.classList.add('noglass')
  return {
    bindTile() {},
    bakedUrl() { return null },
    sync() {},
    rebuild() {},
    isReady() { return true },
  }
}

export function initGlass() {
  const bakeCanvas = document.createElement('canvas')
  const liveCanvas = document.createElement('canvas')
  liveCanvas.className = 'glc'
  const bake = makePainter(bakeCanvas)
  const live = makePainter(liveCanvas)
  if (!bake || !live) return failed()

  const images = new Map()
  const cache = new Map()
  let bakeGen = 0
  let host = null
  let wob = 0
  let ox = 0
  let oy = 0
  let focusDrawn = false
  let specKey = ''

  function tileSize() {
    const mob = innerWidth < 700
    const T = mob ? 150 : 240
    const LH = Math.round(T / 1.8)
    return { T, LH, mob }
  }

  function cacheKey(url) {
    const { T, LH } = tileSize()
    const s = getSettings()
    return [url, T, LH, s.warp.toFixed(3), s.tileRim.toFixed(3), s.radiusRatio.toFixed(3)].join('|')
  }

  function bakedUrl(url) {
    const hit = cache.get(url)
    if (!hit || hit.key !== cacheKey(url)) return null
    return hit.blobUrl
  }

  function applyBaked(url, blobUrl) {
    document.querySelectorAll('.im').forEach((el) => {
      if (el.dataset.src !== url) return
      el.style.backgroundImage = `url("${blobUrl}")`
      el.closest('.tile')?.classList.add('gc')
    })
  }

  function updateSpec() {
    const { T, LH } = tileSize()
    const s = getSettings()
    const key = `${T}x${LH}x${s.radiusRatio.toFixed(3)}`
    if (key === specKey) return
    specKey = key
    const url = specUrl(T, LH, LH * s.radiusRatio)
    document.documentElement.style.setProperty('--spec', `url(${url})`)
  }

  function opts(kind, velocity) {
    const { mob } = tileSize()
    const s = getSettings()
    const k = mob ? 0.62 : 1
    if (kind === 'focus') {
      return {
        amp: (34 * k + Math.min(10, velocity * 0.4)) * s.warp,
        bez: 50 * k,
        bar: 1.05 * s.warp,
        ch: 1.6 * s.tileRim,
        wob,
      }
    }
    return {
      amp: 24 * k * s.warp,
      bez: 40 * k,
      bar: 0.8 * s.warp,
      ch: 1.2 * s.tileRim,
      wob: 0,
    }
  }

  function bakeOne(url, img, gen) {
    const { T, LH } = tileSize()
    const key = cacheKey(url)
    const cached = cache.get(url)
    if (cached && cached.key === key) {
      applyBaked(url, cached.blobUrl)
      return Promise.resolve()
    }
    bake.draw(img, T, LH, opts('base', 0))
    return new Promise((resolve) => {
      bakeCanvas.toBlob((blob) => {
        if (!blob || gen !== bakeGen) {
          resolve()
          return
        }
        if (cached?.blobUrl) URL.revokeObjectURL(cached.blobUrl)
        const blobUrl = URL.createObjectURL(blob)
        cache.set(url, { key, blobUrl })
        applyBaked(url, blobUrl)
        resolve()
      }, 'image/png')
    })
  }

  function bindTile(tile) {
    const im = tile.querySelector('.im')
    if (!im) return
    const url = im.dataset.src
    const baked = url && bakedUrl(url)
    if (!baked) return
    im.style.backgroundImage = `url("${baked}")`
    tile.classList.add('gc')
  }

  function sync(view) {
    const velocity = Math.hypot(view.x - ox, view.y - oy)
    ox = view.x
    oy = view.y
    wob += (Math.min(1, velocity * 0.05) - wob) * 0.08
    const tile = view.focusedEl
    const im = tile && tile.querySelector('.im')
    const src = im && im.dataset.src
    const img = src && images.get(src)
    if (tile !== host) {
      if (host) host.classList.remove('gl-on')
      liveCanvas.remove()
      host = tile || null
    }
    if (!host || !img) {
      if (host) host.classList.remove('gl-on')
      return
    }
    const pic = host.querySelector('.pic')
    if (pic && liveCanvas.parentElement !== pic) pic.prepend(liveCanvas)
    const width = host.offsetWidth - 60
    const height = host.offsetHeight - 60
    if (width < 8 || height < 8) return
    live.draw(img, width, height, opts('focus', velocity))
    host.classList.add('gl-on')
    focusDrawn = true
  }

  updateSpec()

  let chain = Promise.resolve()
  function enqueue(task) {
    chain = chain.catch(() => {}).then(task)
    return chain
  }

  async function bakeAll() {
    const gen = ++bakeGen
    updateSpec()
    for (const [url, img] of images) {
      enqueue(async () => {
        if (gen !== bakeGen) return
        await bakeOne(url, img, gen)
      })
    }
  }

  const ordered = [...WORKS].filter((work) => work.im)
  ordered.sort((a, b) => (a.c === 'IH0204' ? -1 : b.c === 'IH0204' ? 1 : 0))
  for (const work of ordered) {
    const url = imgUrl(work.im)
    enqueue(async () => {
      const img = await loadImage(url)
      if (!img) return
      images.set(url, img)
      await bakeOne(url, img, bakeGen)
    })
  }

  let bakeTimer = 0
  let prev = getSettings()
  subscribe((next) => {
    const changed = next.warp !== prev.warp || next.tileRim !== prev.tileRim || next.radiusRatio !== prev.radiusRatio
    prev = next
    if (!changed) return
    clearTimeout(bakeTimer)
    bakeTimer = setTimeout(() => { bakeAll() }, 180)
    updateSpec()
  })

  addEventListener('resize', () => {
    clearTimeout(bakeTimer)
    bakeTimer = setTimeout(() => { bakeAll() }, 180)
  })

  return {
    bindTile,
    bakedUrl,
    sync,
    rebuild: bakeAll,
    isReady() { return focusDrawn },
  }
}
