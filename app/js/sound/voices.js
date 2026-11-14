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
