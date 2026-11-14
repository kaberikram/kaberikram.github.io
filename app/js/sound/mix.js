// Pure numbers for the sound engine: how loud and how open a flight is, when it
// lands, where a sound sits left to right, and how distance quiets it. No audio
// here, so the tests can check these in Node.

export const clamp01 = (n) => Math.min(1, Math.max(0, n))

// The flight never opens its filter past this, so it can never turn to hiss.
export const FLIGHT_FILTER = { min: 320, max: 1700 }

// Camera speed (screen pixels per second, sideways) and depth speed (world
// units per second, + is forward) become a target for the flight: level 0 to 1,
// how far its filter opens, and how much its low body rises (0 to 1, one
// semitone at full). Slow drifts stay silent; flying in opens a little more
// than flying back.
export function flightShape(sideways, forward) {
  const speed = Math.hypot(sideways, forward * 1.4)
  const level = clamp01((speed - 200) / 2600) ** 1.25
  const lean = Math.max(-1, Math.min(1, forward / Math.max(1, speed)))
  const open = level * (1 + 0.25 * lean)
  const freq = Math.min(FLIGHT_FILTER.max, FLIGHT_FILTER.min + (FLIGHT_FILTER.max - FLIGHT_FILTER.min) * open)
  return { level, freq, lift: level }
}

// Smooths the flight so it breathes with the camera instead of twitching:
// swells in over about a quarter second, eases out over about half a second.
// Reports 'impact' once when a flight gets properly going (short hops never
// do) and 'land' once when that flight has eased back to rest.
export function createFlightTracker({ attack = 0.25, release = 0.5, impactAt = 0.3, landAt = 0.04 } = {}) {
  let level = 0
  let launched = false
  return function step(target, dt) {
    const time = target > level ? attack : release
    level += (target - level) * (1 - Math.exp(-Math.max(0, dt) / time))
    const events = []
    if (!launched && target >= impactAt) {
      launched = true
      events.push('impact')
    } else if (launched && level < landAt && target < landAt) {
      launched = false
      events.push('land')
    }
    return { level, events, launched }
  }
}

// Screen x to stereo position, -1 left to 1 right, kept off the hard edges.
export function panFor(x, width) {
  if (!Number.isFinite(x) || !(width > 0)) return 0
  return Math.max(-0.8, Math.min(0.8, (x / width) * 2 - 1))
}

// Distance from the eye to loudness: full when near, never below a whisper.
export function distanceGain(distance) {
  if (!Number.isFinite(distance)) return 1
  return Math.max(0.3, Math.min(1, 600 / Math.max(1, distance)))
}
