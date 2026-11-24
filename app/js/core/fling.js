// How fast the hand was moving when it let go, and how far that throws the board.
//
// The speed is the slope of a straight line fitted through the last moments of
// the drag, not the gap between the last two events: phones report touches in
// uneven bursts, and two points make a jittery throw. A hand that stopped before
// lifting throws nothing.

// Look back this far for the fit (ms).
export const FIT_WINDOW = 100
// No sample within this long of letting go means the hand had stopped (ms).
export const STALE = 40
// Slower than this is a placement, not a throw (px/s).
export const MIN_SPEED = 50
// Fast flicks are capped so one swipe cannot send the board off the map (px/s).
export const MAX_SPEED = 8000

// samples: [{ t, x, y }] in event time (ms) and screen px, oldest first.
// Returns { x, y } in px/s.
export function releaseVelocity(samples, now) {
  const none = { x: 0, y: 0 }
  const n = samples.length
  const last = samples[n - 1]
  if (!last || now - last.t > STALE) return none
  let first = n - 1
  while (first > 0 && last.t - samples[first - 1].t <= FIT_WINDOW) first--
  const count = n - first
  if (count < 2) return none

  let mt = 0
  let mx = 0
  let my = 0
  for (let i = first; i < n; i++) {
    mt += samples[i].t / count
    mx += samples[i].x / count
    my += samples[i].y / count
  }
  let tt = 0
  let tx = 0
  let ty = 0
  for (let i = first; i < n; i++) {
    const dt = samples[i].t - mt
    tt += dt * dt
    tx += dt * (samples[i].x - mx)
    ty += dt * (samples[i].y - my)
  }
  if (!tt) return none
  // px/ms to px/s.
  let vx = (tx / tt) * 1000
  let vy = (ty / tt) * 1000
  const speed = Math.hypot(vx, vy)
  if (speed < MIN_SPEED) return none
  if (speed > MAX_SPEED) {
    vx *= MAX_SPEED / speed
    vy *= MAX_SPEED / speed
  }
  return { x: vx, y: vy }
}

// Keep only what the next fit can use.
export function trimSamples(samples) {
  const last = samples[samples.length - 1]
  if (!last) return
  let drop = 0
  while (drop < samples.length - 2 && last.t - samples[drop].t > FIT_WINDOW * 2) drop++
  if (drop) samples.splice(0, drop)
}

// Speed after gliding for dt seconds with time constant tau, and the distance
// covered on the way. Exact for any frame length, so 60 and 120 Hz glide alike.
export function glideStep(v, dt, tau) {
  const k = Math.exp(-dt / tau)
  return { v: v * k, travel: v * tau * (1 - k) }
}
