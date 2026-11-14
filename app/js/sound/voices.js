// Every sound on the site, generated: no files. Each voice schedules a few
// nodes on any audio context (a live one, or an offline one for rendering to a
// file) and connects to `out`. `o.level` scales it, `o.pitch` shifts it, and
// `o.brightness` (0 to 1) opens or closes its filter.
//
// Kept short and soft on purpose: paper, air and a little glass, never beeps.

const noiseCache = new WeakMap()

export function noiseBuffer(c) {
  let buffer = noiseCache.get(c)
  if (buffer) return buffer
  buffer = c.createBuffer(1, Math.round(c.sampleRate * 2), c.sampleRate)
  const data = buffer.getChannelData(0)
  // Seeded so offline renders match the live sound exactly.
  let seed = 7
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647
    data[i] = (seed / 2147483647) * 2 - 1
  }
  noiseCache.set(c, buffer)
  return buffer
}

// A gain that rises in `attack` seconds to `peak`, then falls away over `decay`.
function envelope(c, t, peak, attack, decay) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  return g
}

function tone(c, out, t, { freq, type = 'sine', peak, attack = 0.004, decay = 0.12, glide = 0 }) {
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (glide) osc.frequency.exponentialRampToValueAtTime(freq * glide, t + attack + decay)
  const env = envelope(c, t, peak, attack, decay)
  osc.connect(env).connect(out)
  osc.start(t)
  osc.stop(t + attack + decay + 0.05)
  return attack + decay
}

function hiss(c, out, t, { from, to = from, q = 1.2, peak, attack = 0.003, decay = 0.05, type = 'bandpass', offset = 0 }) {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c)
  const filter = c.createBiquadFilter()
  filter.type = type
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, t)
  if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, t + attack + decay)
  const env = envelope(c, t, peak, attack, decay)
  src.connect(filter).connect(env).connect(out)
  src.start(t, offset % 1.5)
  src.stop(t + attack + decay + 0.05)
  return attack + decay
}

const bright = (o, low, high) => low + (high - low) * (o.brightness ?? 0.6)

export const VOICES = {
  // A card comes into focus: two soft glassy notes stepping up.
  focus(c, out, t, o) {
    const p = o.pitch || 1
    const l = o.level ?? 1
    tone(c, out, t, { freq: 784 * p, peak: 0.319 * l, decay: 0.18 })
    tone(c, out, t + 0.07, { freq: 1175 * p, peak: 0.239 * l, decay: 0.26 })
    hiss(c, out, t, { from: bright(o, 2500, 6000), peak: 0.040 * l, decay: 0.04 })
    return 0.4
  },

  // Stepping back out: one lower note that settles.
  close(c, out, t, o) {
    const l = o.level ?? 1
    tone(c, out, t, { freq: 587 * (o.pitch || 1), peak: 0.239 * l, decay: 0.2, glide: 0.94 })
    return 0.3
  },

  // A key press: a tiny dry tick, pitch varied by the caller.
  type(c, out, t, o) {
    const l = o.level ?? 1
    hiss(c, out, t, { from: 3200 * (o.pitch || 1), q: 3, peak: 0.313 * l, attack: 0.001, decay: 0.018 })
    return 0.03
  },

  // A word was understood: a faint upward glint.
  understood(c, out, t, o) {
    tone(c, out, t, { freq: 1320 * (o.pitch || 1), peak: 0.141 * (o.level ?? 1), attack: 0.01, decay: 0.12, glide: 1.12 })
    return 0.15
  },

  // Enter, understood: a soft open fifth.
  confirm(c, out, t, o) {
    const p = o.pitch || 1
    const l = o.level ?? 1
    tone(c, out, t, { freq: 660 * p, peak: 0.239 * l, decay: 0.22 })
    tone(c, out, t + 0.03, { freq: 990 * p, peak: 0.180 * l, decay: 0.3 })
    return 0.36
  },

  // Enter, not understood: a neutral, slightly hollow tone. Not an error buzz.
  unsure(c, out, t, o) {
    tone(c, out, t, { freq: 440 * (o.pitch || 1), type: 'triangle', peak: 0.160 * (o.level ?? 1), attack: 0.012, decay: 0.22, glide: 0.97 })
    return 0.26
  },

  // The bar changes shape: a short breath of air.
  shape(c, out, t, o) {
    hiss(c, out, t, { from: 500, to: bright(o, 1400, 2600), q: 0.8, peak: 0.357 * (o.level ?? 1), attack: 0.06, decay: 0.14 })
    return 0.22
  },

  // A card leaves the pile: a quick paper flick.
  deal(c, out, t, o) {
    const p = o.pitch || 1
    const l = o.level ?? 1
    hiss(c, out, t, { from: bright(o, 1600, 3000) * p, to: 900 * p, q: 1.6, peak: 0.450 * l, attack: 0.002, decay: 0.045, offset: p })
    return 0.06
  },

  // Picking a card up: a rising lift of air with a hint of body.
  lift(c, out, t, o) {
    const l = o.level ?? 1
    hiss(c, out, t, { from: 500, to: bright(o, 1300, 2200), q: 1, peak: 0.213 * l, attack: 0.04, decay: 0.08 })
    tone(c, out, t, { freq: 330, peak: 0.142 * l, attack: 0.02, decay: 0.08, glide: 1.25 })
    return 0.14
  },

  // Putting it down: a soft low tap.
  drop(c, out, t, o) {
    const l = o.level ?? 1
    tone(c, out, t, { freq: 150, peak: 0.285 * l, attack: 0.002, decay: 0.09, glide: 0.7 })
    hiss(c, out, t, { from: 900, q: 0.9, peak: 0.071 * l, attack: 0.001, decay: 0.03 })
    return 0.12
  },
}

// Soft noise for the flight: pink, then gently darkened toward brown, so its
// energy falls with pitch (white noise is what made the old one hiss). Seeded,
// four seconds long so the loop is never heard, one buffer per seed.
const softCache = new WeakMap()

export function softNoise(c, seed = 1) {
  let bySeed = softCache.get(c)
  if (!bySeed) softCache.set(c, (bySeed = new Map()))
  if (bySeed.has(seed)) return bySeed.get(seed)
  const length = Math.round(c.sampleRate * 4)
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)
  let r = 1 + seed * 7919
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, brown = 0
  for (let i = 0; i < length; i++) {
    r = (r * 16807) % 2147483647
    const white = (r / 2147483647) * 2 - 1
    // Paul Kellet's pink filter.
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
    b6 = white * 0.115926
    brown = 0.985 * brown + pink * 0.06
    data[i] = pink * 0.35 + brown * 0.65
  }
  // Crossfade the ends so the loop point is seamless.
  const fade = Math.round(c.sampleRate * 0.05)
  for (let i = 0; i < fade; i++) {
    const k = i / fade
    data[i] = data[i] * k + data[length - fade + i] * (1 - k)
  }
  // Remove the slow drift (brown noise wanders), then set a steady level by
  // average loudness and gently round off the rare spikes, so the noise has
  // no sudden peaks.
  let prevIn = 0
  let prevOut = 0
  let sum = 0
  for (let i = 0; i < length; i++) {
    const y = 0.995 * (prevOut + data[i] - prevIn)
    prevIn = data[i]
    prevOut = y
    data[i] = y
    sum += y * y
  }
  const rms = Math.sqrt(sum / length) || 1
  for (let i = 0; i < length; i++) data[i] = Math.tanh((data[i] / rms) * 0.28) / 0.9
  bySeed.set(seed, buffer)
  return buffer
}

// The flight: a lasting voice, not a one-shot. Two soft noise layers spread left
// and right through a gentle low-pass (the air), and a low detuned fifth
// underneath (the body). `dry` takes it straight to the master, past the
// brightness filter; `send` feeds the room. Returns controls the engine calls
// each frame, plus the impact at the start of a long flight and the landing.
export function createFlight(c, dry, send) {
  // A gentle compressor holds the peaks and glues air, body and impact into one
  // sound. `out` is the level control in front of it.
  const out = c.createGain()
  const glue = c.createDynamicsCompressor()
  glue.threshold.value = -26
  glue.knee.value = 12
  glue.ratio.value = 3.5
  glue.attack.value = 0.012
  glue.release.value = 0.3
  const trim = c.createGain()
  trim.gain.value = 0.45
  out.connect(glue).connect(trim)
  trim.connect(dry)
  trim.connect(send)

  const air = c.createGain()
  air.gain.value = 0
  air.connect(out)
  const filters = []
  for (const [seed, side] of [[3, -0.65], [8, 0.65]]) {
    const src = c.createBufferSource()
    src.buffer = softNoise(c, seed)
    src.loop = true
    const low = c.createBiquadFilter()
    low.type = 'lowpass'
    low.Q.value = 0.7
    low.frequency.value = 250
    // Soft noise carries a lot of rumble near zero hertz; trim it so the air
    // reads as air, not as a boom.
    const high = c.createBiquadFilter()
    high.type = 'highpass'
    high.Q.value = 0.6
    high.frequency.value = 140
    const pan = c.createStereoPanner()
    pan.pan.value = side
    src.connect(high).connect(low).connect(pan).connect(air)
    src.start(0, seed * 0.37)
    filters.push(low)
  }

  const body = c.createGain()
  body.gain.value = 0
  body.connect(out)
  // An octave above sub-bass, so laptop and phone speakers can still play it.
  const tones = [[110, 0], [165, 4]].map(([freq, cents]) => {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.detune.value = cents
    osc.connect(body)
    osc.start()
    return { osc, freq }
  })

  return {
    out,
    // level 0 to 1, filter in Hz, lift 0 to 1 (one semitone up at full).
    set(level, freq, lift, t) {
      air.gain.setTargetAtTime(level * 1.6, t, 0.05)
      body.gain.setTargetAtTime(level ** 1.5 * 0.05, t, 0.08)
      for (const low of filters) low.frequency.setTargetAtTime(freq, t, 0.08)
      for (const { osc, freq: base } of tones) osc.frequency.setTargetAtTime(base * 2 ** (lift / 12), t, 0.12)
    },
    // A long flight sets off: one soft, deep push with a long tail.
    impact(t, size = 1) {
      const osc = c.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(160, t)
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.7)
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.13 * size, t + 0.03)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
      osc.connect(g).connect(out)
      osc.start(t)
      osc.stop(t + 1.2)
      // Its octave, quieter, so the push is felt even on small speakers.
      const over = c.createOscillator()
      over.type = 'sine'
      over.frequency.setValueAtTime(320, t)
      over.frequency.exponentialRampToValueAtTime(160, t + 0.6)
      const og = c.createGain()
      og.gain.setValueAtTime(0.0001, t)
      og.gain.linearRampToValueAtTime(0.035 * size, t + 0.03)
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
      over.connect(og).connect(out)
      over.start(t)
      over.stop(t + 0.9)
      const src = c.createBufferSource()
      src.buffer = softNoise(c, 5)
      const low = c.createBiquadFilter()
      low.type = 'lowpass'
      low.frequency.setValueAtTime(1400, t)
      low.frequency.exponentialRampToValueAtTime(300, t + 0.6)
      const n = c.createGain()
      n.gain.setValueAtTime(0.0001, t)
      n.gain.linearRampToValueAtTime(0.16 * size, t + 0.04)
      n.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
      const trim = c.createBiquadFilter()
      trim.type = 'highpass'
      trim.frequency.value = 90
      src.connect(trim).connect(low).connect(n).connect(out)
      src.start(t, 1.3)
      src.stop(t + 0.8)
    },
    // The flight settles: a quiet low breath.
    land(t) {
      const src = c.createBufferSource()
      src.buffer = softNoise(c, 11)
      const low = c.createBiquadFilter()
      low.type = 'lowpass'
      low.frequency.setValueAtTime(650, t)
      low.frequency.exponentialRampToValueAtTime(200, t + 0.45)
      const n = c.createGain()
      n.gain.setValueAtTime(0.0001, t)
      n.gain.linearRampToValueAtTime(0.09, t + 0.05)
      n.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      const trim = c.createBiquadFilter()
      trim.type = 'highpass'
      trim.frequency.value = 90
      src.connect(trim).connect(low).connect(n).connect(out)
      src.start(t, 0.6)
      src.stop(t + 0.6)
      const osc = c.createOscillator()
      osc.frequency.setValueAtTime(130, t)
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.35)
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.04, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
      osc.connect(g).connect(out)
      osc.start(t)
      osc.stop(t + 0.5)
    },
  }
}

// A room: a short, soft, generated reverb tail. `size` 0 to 1.
export function roomImpulse(c, size = 0.3) {
  const seconds = 0.4 + size * 1.6
  const length = Math.round(c.sampleRate * seconds)
  const buffer = c.createBuffer(2, length, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let seed = 11 + ch * 97
    for (let i = 0; i < length; i++) {
      seed = (seed * 16807) % 2147483647
      const decay = (1 - i / length) ** 3
      data[i] = ((seed / 2147483647) * 2 - 1) * decay
    }
  }
  return buffer
}
