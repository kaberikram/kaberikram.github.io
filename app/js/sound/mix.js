// Pure numbers for the sound engine: how loud and bright a flight is, where a
// sound sits left to right, and how distance quiets it. No audio here, so the
// tests can check these in Node.

export const clamp01 = (n) => Math.min(1, Math.max(0, n))

// Camera speed (screen pixels per second, sideways) and depth speed (world
// units per second, + is forward) become a whoosh: level 0 to 1 and a filter
// frequency in Hz. Slow drifts stay silent; going in rises, coming back falls.
export function flightShape(sideways, forward) {
  const speed = Math.hypot(sideways, forward * 1.4)
  const level = clamp01((speed - 180) / 2600) ** 1.3
  const lean = Math.max(-1, Math.min(1, forward / Math.max(1, speed)))
  const freq = (380 + 2400 * level) * (1 + 0.45 * lean)
  return { level, freq }
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
