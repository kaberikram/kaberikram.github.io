// Caption. Glass-white (v25.17) refracts a procedural colour field in WebGL.
// Pastel-gradient (v25.16) is CSS background-clip text plus an SVG displacement / bloom filter.
// Both read the same live settings.

import { effectMotion, getSettings, hexVec, subscribe } from './settings.js'

const VS = `attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;v.y=1.-v.y;gl_Position=vec4(a,0.,1.);}`

const FS = `precision highp float;varying vec2 v;uniform sampler2D M;uniform sampler2D B;uniform vec2 res;uniform float tm,dp,uGlass,uRim,uSpec,uPastel,uBloom,uMode;uniform vec3 uPage,uBlack,uC1,uC2,uC3,uC4,uP0,uP1,uP2,uP3;
float blob(vec2 u,vec2 o){vec2 d=(u-o)*vec2(3.,1.6);return exp(-dot(d,d)*3.);}
vec3 pastel(vec2 u,float t){vec3 c=vec3(0.);float w=0.;
 vec2 o0=vec2(.18+.08*sin(t*.55),.5+.35*sin(t*.4));float k0=blob(u,o0);c+=uP0*k0;w+=k0;
 vec2 o1=vec2(.38+.08*sin(t*.55+1.7),.5+.35*sin(t*.4+2.3));float k1=blob(u,o1);c+=uP1*k1;w+=k1;
 vec2 o2=vec2(.58+.08*sin(t*.55+3.4),.5+.35*sin(t*.4+4.6));float k2=blob(u,o2);c+=uP2*k2;w+=k2;
 vec2 o3=vec2(.78+.08*sin(t*.55+5.1),.5+.35*sin(t*.4+6.9));float k3=blob(u,o3);c+=uP3*k3;w+=k3;
 return c/max(w,1e-3);}
vec3 rawField(vec2 u,float t){if(uMode<.5)return uPage;if(uMode<1.5){float y=smoothstep(.1,1.,u.y);return mix(uPage,uBlack,y);}
 float y=u.y;vec3 c=mix(uC1,uC2,smoothstep(.35,.85,y+.06*sin(u.x*5.+t*.3)));c=mix(c,uC3,smoothstep(.8,1.1,y));
 vec3 hi=mix(uC1,vec3(.98,.78,.62),.55);c=mix(c,hi,smoothstep(.25,.0,y)*.6);float sw=.5+.5*sin(u.x*9.+t*.4+sin(y*6.));return c*(.92+.12*sw);}
vec3 back(vec2 u,float t){vec3 wht=vec3(.985,.975,.965);float frost=uMode<.5?.9:.72;return mix(rawField(u,t),wht,frost)+(pastel(u,t)-.75)*uPastel;}
void main(){vec2 px=1./res;float m=texture2D(M,v).a;float h=texture2D(B,v).a;
 float hx=texture2D(B,v+vec2(px.x*1.5,0.)).a-texture2D(B,v-vec2(px.x*1.5,0.)).a;
 float hy=texture2D(B,v+vec2(0.,px.y*1.5)).a-texture2D(B,v-vec2(0.,px.y*1.5)).a;
 vec2 n=vec2(hx,hy);float gln=length(n);vec2 nn=n/(gln+1e-4);float ed=pow(clamp(1.-h,0.,1.),1.4);
 vec2 wob=vec2(sin(v.y*18.+tm*.9)+sin(v.x*7.-tm*.6),cos(v.x*11.+tm*.7))*.0025;
 vec2 q=v+nn*ed*(.055*uGlass)*vec2(res.y/res.x,1.)+(v-.5)*(-.03*uGlass)+wob;
 float ch=.006*ed*uGlass;
 vec3 c=vec3(back(q+nn*ch,tm).r,back(q,tm).g,back(q-nn*ch,tm).b);
 float hue=atan(nn.y,nn.x)*1.2+tm*.35+v.x*6.;vec3 ir=.5+.5*cos(hue+vec3(0.,2.1,4.2));
 float rim=smoothstep(.45,.85,ed)*m;c=mix(c,c*.8+ir*.3,rim*uRim);
 float sp=pow(max(0.,dot(nn,normalize(vec2(-.5,-.85)))),6.)*smoothstep(.3,.8,ed)*m;c+=sp*uSpec;
 c*=1.-.10*ed;float e=smoothstep(0.,.5,m)*(1.-smoothstep(.5,1.,m));c=mix(c,vec3(.45,.14,.14),e*.35);
 c+=h*max(uBloom-.16,0.)*.8;
 float sh=texture2D(B,v-vec2(0.,px.y*3.*dp)).a*(1.-m)*uBloom;
 float al=m;gl_FragColor=vec4(c*al,al+sh*(1.-al));}`

const PAD = 26

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

function modeValue(mode) {
  if (mode === 'none') return 0
  if (mode === 'black') return 1
  return 2
}

export function initCaption() {
  const canvas = document.createElement('canvas')
  canvas.id = 'capgl'
  document.body.appendChild(canvas)
  const gl = canvas.getContext('webgl', {
    premultipliedAlpha: true,
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
  })
  const mask = document.createElement('canvas')
  const maskCtx = mask.getContext('2d')
  const blur = document.createElement('canvas')
  const blurCtx = blur.getContext('2d')
  const turb = document.getElementById('herturb')
  const disp = document.getElementById('herdisp')
  const herb1 = document.getElementById('herb1')
  const herb2 = document.getElementById('herb2')
  const slope = document.getElementById('herslope')
  let ready = false
  let drew = false
  let started = 0
  let frozenTime = 3

  function painter() {
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
    function makeTex(unit) {
      const tex = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      return tex
    }
    makeTex(0)
    makeTex(1)
    const U = {}
    for (const name of ['M', 'B', 'res', 'tm', 'dp', 'uGlass', 'uRim', 'uSpec', 'uPastel', 'uBloom', 'uMode', 'uPage', 'uBlack', 'uC1', 'uC2', 'uC3', 'uC4', 'uP0', 'uP1', 'uP2', 'uP3']) {
      U[name] = gl.getUniformLocation(program, name)
    }
    gl.uniform1i(U.M, 0)
    gl.uniform1i(U.B, 1)
    function upload(unit, source) {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    }
    function draw(width, height, dpr, time) {
      const s = getSettings()
      gl.viewport(0, 0, width, height)
      gl.uniform2f(U.res, width, height)
      gl.uniform1f(U.dp, dpr)
      gl.uniform1f(U.tm, time)
      gl.uniform1f(U.uGlass, s.glassStrength)
      gl.uniform1f(U.uRim, 0.3 * s.rimIntensity)
      gl.uniform1f(U.uSpec, 0.75 * s.specular)
      gl.uniform1f(U.uPastel, s.pastelAmount)
      gl.uniform1f(U.uBloom, 0.16 * s.bloom)
      gl.uniform1f(U.uMode, modeValue(s.vignetteMode))
      const put = (name, hex) => gl.uniform3fv(U[name], hexVec(hex))
      put('uPage', s.pageBg)
      put('uBlack', s.blackColor)
      put('uC1', s.rothko1)
      put('uC2', s.rothko2)
      put('uC3', s.rothko3)
      put('uC4', s.rothko4)
      put('uP0', s.pastel1)
      put('uP1', s.pastel2)
      put('uP2', s.pastel3)
      put('uP3', s.pastel4)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    return { upload, draw }
  }

  const gpu = painter()
  if (!gpu) document.documentElement.classList.add('nocap')

  function updateSvg() {
    const s = getSettings()
    const motion = effectMotion()
    const locked = motion <= 0.01 && s.captionStyle === 'pastel'
    if (disp) disp.setAttribute('scale', locked ? '0' : (3 * s.glassStrength).toFixed(2))
    if (herb1) herb1.setAttribute('stdDeviation', (7 * s.bloom).toFixed(2))
    if (herb2) herb2.setAttribute('stdDeviation', (2.2 * s.bloom).toFixed(2))
    if (slope) slope.setAttribute('slope', String(Math.min(1.2, 0.6 * Math.max(s.bloom, 0))))
    if (!turb) return
    if (s.captionStyle !== 'pastel' || motion <= 0.01) {
      turb.setAttribute('baseFrequency', '0.012 0.03')
      return
    }
    const k = (performance.now() - started) / 1000 * motion
    const a = k * 2 * Math.PI / 11
    turb.setAttribute(
      'baseFrequency',
      `${(0.012 + 0.004 * Math.sin(a)).toFixed(5)} ${(0.03 + 0.008 * Math.cos(a * 2 + 1)).toFixed(5)}`,
    )
  }

  function visibleCaption() {
    return [...document.querySelectorAll('.cap')].find((el) => el.style.opacity !== '0' && el.querySelector('.g'))
  }

  function sync() {
    updateSvg()
    if (!ready || !gpu) return
    const s = getSettings()
    if (s.captionStyle !== 'glass') {
      canvas.style.display = 'none'
      drew = true
      return
    }
    const cap = visibleCaption()
    const title = cap && cap.querySelector('.t')
    if (!title) {
      canvas.style.display = 'none'
      return
    }
    canvas.style.display = 'block'
    const rect = title.getBoundingClientRect()
    const cssW = Math.ceil(rect.width + PAD * 2)
    const cssH = Math.ceil(rect.height + PAD * 2)
    const dpr = Math.min(2, devicePixelRatio || 1)
    canvas.style.left = `${rect.left - PAD}px`
    canvas.style.top = `${rect.top - PAD}px`
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`
    const width = Math.max(2, Math.round(cssW * dpr))
    const height = Math.max(2, Math.round(cssH * dpr))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = mask.width = blur.width = width
      canvas.height = mask.height = blur.height = height
    }
    maskCtx.setTransform(1, 0, 0, 1, 0, 0)
    maskCtx.clearRect(0, 0, width, height)
    maskCtx.setTransform(dpr, 0, 0, dpr, -(rect.left - PAD) * dpr, -(rect.top - PAD) * dpr)
    maskCtx.fillStyle = '#fff'
    maskCtx.textBaseline = 'alphabetic'
    const weight = Math.round(s.fontWeight)
    title.querySelectorAll('.g').forEach((glyph) => {
      const text = glyph.textContent
      if (!text || !text.trim()) return
      const style = getComputedStyle(glyph)
      const box = glyph.getBoundingClientRect()
      const size = parseFloat(style.fontSize)
      const line = glyph.closest('.ln')
      const transform = line ? getComputedStyle(line).transform : 'none'
      const chip = glyph.parentElement
      const opacity = chip ? parseFloat(getComputedStyle(chip).opacity) : 1
      maskCtx.save()
      maskCtx.globalAlpha = Number.isFinite(opacity) ? opacity : 1
      maskCtx.font = `${weight} ${size}px Inter, "Helvetica Neue", Helvetica, sans-serif`
      const metrics = maskCtx.measureText(text)
      const asc = metrics.fontBoundingBoxAscent || size * 0.97
      const dsc = metrics.fontBoundingBoxDescent || size * 0.24
      const cx = box.left + box.width / 2
      const base = box.top + box.height / 2 + (asc - dsc) / 2
      maskCtx.translate(cx, base)
      if (transform && transform !== 'none') {
        const m = new DOMMatrix(transform)
        maskCtx.transform(m.a, m.b, m.c, m.d, 0, 0)
      }
      maskCtx.textAlign = 'center'
      maskCtx.fillText(text, 0, 0)
      maskCtx.restore()
    })
    blurCtx.clearRect(0, 0, width, height)
    blurCtx.filter = `blur(${(5 * dpr).toFixed(1)}px)`
    blurCtx.drawImage(mask, 0, 0)
    blurCtx.filter = 'none'
    gpu.upload(0, mask)
    gpu.upload(1, blur)
    const motion = effectMotion()
    const time = motion <= 0.01 ? frozenTime : (performance.now() - started) / 1000 * motion
    gpu.draw(width, height, dpr, time)
    drew = true
  }

  subscribe(() => updateSvg())

  const fonts = document.fonts
    ? document.fonts.load('650 42px Inter').then(() => document.fonts.ready)
    : Promise.resolve()
  Promise.race([
    fonts,
    new Promise((resolve) => { setTimeout(resolve, 2500) }),
  ]).then(() => {
    started = performance.now()
    ready = true
  })

  return {
    sync,
    isReady() { return drew || document.documentElement.classList.contains('nocap') },
  }
}
