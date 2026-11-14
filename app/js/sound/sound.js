// The sound engine. Silent until the visitor's first tap, click or key (browsers
// require it, and nothing should ever start on its own). A speaker button in
// the corner turns it off and on, and is remembered.
//
// It listens rather than being called: cues from the bar, board and input
// (see cue.js), focus changes from the director, and the camera's speed once a
// frame for the whoosh of a flight. It goes to sleep after a few quiet seconds
// so an idle page costs nothing.

import { getSettings, subscribe } from '../settings.js'
import { VOICES, noiseBuffer, roomImpulse } from './voices.js'
import { distanceGain, flightShape, panFor } from './mix.js'

const STORE = 'ikram-sound'
const MAX_VOICES = 14
const SLEEP_AFTER = 4000

function remembered() {
  try {
    return localStorage.getItem(STORE) !== 'off'
  } catch {
    return true
  }
}

export function createSound({ camera, director, button }) {
  let on = remembered()
  let ctx = null
  let bus = null
  let master = null
  let tone = null
  let wet = null
  let room = null
  let flight = null
  let roomSize = -1
  let voices = 0
  let sleepTimer = 0
  let lastFocus = director.getState().focus
  let lastPanel = director.getState().panel
  const played = [] // every cue actually played, newest last (for checks)

  // ---- the graph ---------------------------------------------------------------

  function build() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return false
    ctx = new AudioCtx({ latencyHint: 'interactive' })
    master = ctx.createGain()
    tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    bus = ctx.createGain()
    room = ctx.createConvolver()
    wet = ctx.createGain()
    bus.connect(tone)
    tone.connect(master)
    tone.connect(room)
    room.connect(wet)
    wet.connect(master)
    master.connect(ctx.destination)

    // The flight: a looping hiss through a moving band filter, silent at rest.
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx)
    src.loop = true
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 0.9
    const gain = ctx.createGain()
    gain.gain.value = 0
    src.connect(band).connect(gain).connect(bus)
    src.start()
    flight = { band, gain, level: 0 }
    applySettings()
    return true
  }

  function applySettings() {
    if (!ctx) return
    const s = getSettings()
    const t = ctx.currentTime
    master.gain.setTargetAtTime(on ? s.soundLevel : 0, t, 0.05)
    tone.frequency.setTargetAtTime(2500 + 12000 * s.soundBrightness, t, 0.05)
    wet.gain.setTargetAtTime(s.soundRoom * 0.6, t, 0.05)
    // Rebuilding the room is the one costly step, so only when its size changes.
    if (Math.abs(s.soundRoom - roomSize) > 0.02) {
      roomSize = s.soundRoom
      room.buffer = roomImpulse(ctx, roomSize)
    }
  }

  // ---- waking and sleeping ---------------------------------------------------

  function awake() {
    if (!ctx || !on) return false
    if (ctx.state === 'suspended') ctx.resume()
    clearTimeout(sleepTimer)
    sleepTimer = setTimeout(() => {
      if (ctx && ctx.state === 'running' && flight.level < 0.01 && voices === 0) ctx.suspend()
    }, SLEEP_AFTER)
    return true
  }

  function unlock() {
    if (!ctx && !build()) return
    awake()
    removeEventListener('pointerdown', unlock, true)
    removeEventListener('keydown', unlock, true)
    removeEventListener('touchend', unlock, true)
  }
  addEventListener('pointerdown', unlock, true)
  addEventListener('keydown', unlock, true)
  addEventListener('touchend', unlock, true)

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ctx && ctx.state === 'running') ctx.suspend()
  })

  // ---- playing ----------------------------------------------------------------

  // Where a world point sits in the mix: left/right from the screen, quieter
  // with distance from the camera.
  function placeOf(detail) {
    if (detail.z == null || detail.x == null) {
      return { pan: panFor(detail.px, camera.view.w), gain: 1 }
    }
    const screen = camera.worldToScreen(detail.x, detail.y, detail.z)
    return { pan: panFor(screen.x, camera.view.w), gain: distanceGain(camera.distanceTo(detail.z)) }
  }

  function play(name, detail = {}) {
    const voice = VOICES[name]
    // When it gets busy, only the small repeated sounds (key ticks, deal
    // flicks) give way. Focus, close, confirm and the rest always play.
    const minor = name === 'type' || name === 'deal'
    if (!voice || !awake() || (minor && voices >= MAX_VOICES)) return
    const s = getSettings()
    const place = placeOf(detail)
    const pan = ctx.createStereoPanner()
    pan.pan.value = place.pan
    pan.connect(bus)
    const length = voice(ctx, pan, ctx.currentTime + 0.005, {
      level: s.soundTicks * place.gain * (detail.level ?? 1),
      pitch: detail.pitch || 1,
      brightness: s.soundBrightness,
    })
    voices++
    played.push(name)
    if (played.length > 200) played.shift()
    setTimeout(() => {
      voices--
      pan.disconnect()
    }, (length + 0.08) * 1000)
  }

  addEventListener('cue', (e) => {
    const { name } = e.detail
    if (name === 'type') {
      // Slightly different every time, so a sentence does not machine-gun.
      play('type', { pitch: 0.85 + Math.random() * 0.35 })
    } else if (name === 'deal') {
      play('deal', { ...e.detail, pitch: 1.12 - Math.min(18, e.detail.index || 0) * 0.018, level: 0.8 })
    } else {
      play(name, e.detail)
    }
  })

  director.subscribe((state) => {
    if (state.panel && state.panel !== lastPanel) play('focus', { pitch: 0.9 })
    else if (state.focus && state.focus !== lastFocus) play('focus')
    else if (!state.focus && lastFocus && !state.panel) play('close')
    else if (!state.panel && lastPanel && !state.focus) play('close')
    lastFocus = state.focus
    lastPanel = state.panel
  })

  // ---- the flight, once a frame while the camera moves --------------------------

  function update() {
    if (!ctx || !on || ctx.state !== 'running') return false
    const v = camera.velocity
    const scale = camera.scaleAt(camera.pivot)
    const shape = flightShape(Math.hypot(v.x, v.y) * scale, v.z)
    const level = shape.level * getSettings().soundFlight * 0.2
    const t = ctx.currentTime
    flight.gain.gain.setTargetAtTime(level, t, 0.07)
    flight.band.frequency.setTargetAtTime(shape.freq, t, 0.07)
    flight.level = level
    if (level > 0.005) {
      awake()
      if (!flight.on) played.push('flight')
      flight.on = true
    } else {
      flight.on = false
    }
    return false
  }

  // When the camera stops, the ticker stops calling us: make sure the hiss
  // fades even then.
  setInterval(() => {
    if (ctx && flight.level > 0 && Math.hypot(camera.velocity.x, camera.velocity.y, camera.velocity.z) < 1) {
      flight.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08)
      flight.level = 0
      flight.on = false
    }
  }, 250)

  // ---- the speaker button ------------------------------------------------------

  function paint() {
    if (!button) return
    button.setAttribute('aria-pressed', on ? 'true' : 'false')
    button.setAttribute('aria-label', on ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on')
    button.title = on ? 'Sound on' : 'Sound off'
    button.classList.toggle('is-off', !on)
  }

  function setOn(next) {
    on = next
    try {
      localStorage.setItem(STORE, on ? 'on' : 'off')
    } catch {
      // Private mode still works; it just won't remember.
    }
    if (on) unlock()
    applySettings()
    if (!on && ctx) {
      flight.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03)
      flight.level = 0
    }
    paint()
  }

  if (button) {
    button.addEventListener('click', (e) => {
      e.stopPropagation()
      setOn(!on)
      if (on) play('confirm', { level: 0.6 })
    })
  }
  subscribe(() => applySettings())
  paint()

  return {
    update,
    setOn,
    get on() { return on },
    get state() { return ctx ? ctx.state : 'locked' },
    played,
  }
}
