// Small shared helpers. No DOM here, so tests can import this file in Node.

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

export const lerp = (a, b, t) => a + (b - a) * t

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]))
}

// Seeded generator (mulberry32). Arrangements use it instead of Math.random
// so the board looks the same on every visit and in every test run.
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// FNV-1a. Gives each card its own stable seed from its id.
export function hashString(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// A hand-cut outline, as a CSS polygon in percentages. Walks the
// four sides in small steps and pulls each point inward by a wandering amount:
// a slow drift (the hand) plus a little grit (the pen). `amount` is in pixels
// on a card at scale 1 (or on a box of `size`, for anything else cut from
// paper: the bar's blanks and their menu); the same seed always gives the
// same outline.
export const PIC = { w: 260, h: 170 }

export function roughEdge(seed, amount, size = PIC) {
  if (amount <= 0) return 'none'
  const rand = rng(seed)
  const points = []
  const side = (length, place) => {
    const steps = Math.max(6, Math.round(length / 13))
    let from = rand()
    let to = rand()
    for (let i = 0; i < steps; i++) {
      // A new target for the slow drift every few points.
      if (i % 4 === 0 && i) {
        from = to
        to = rand()
      }
      const k = (i % 4) / 4
      const drift = from + (to - from) * (k * k * (3 - 2 * k))
      const grit = (rand() - 0.5) * 0.5
      // Ease into the corners so they come out soft, never square.
      const t = (i + 0.5) / steps
      const corner = Math.max(0, 1 - Math.min(t, 1 - t) * steps / 1.5)
      const inset = amount * (0.35 + drift * 1.3 + grit + corner * 1.1)
      points.push(place(t * length, Math.max(0, inset)))
    }
  }
  side(size.w, (d, inset) => [d, inset])
  side(size.h, (d, inset) => [size.w - inset, d])
  side(size.w, (d, inset) => [size.w - d, size.h - inset])
  side(size.h, (d, inset) => [inset, size.h - d])
  const text = points.map(([x, y]) => `${(x / size.w * 100).toFixed(2)}% ${(y / size.h * 100).toFixed(2)}%`)
  return `polygon(${text.join(',')})`
}
