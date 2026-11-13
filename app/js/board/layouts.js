// Arrangements. Each one is a pure function: cards in, a pose for every card out.
// No DOM and no randomness beyond the seed, so the same input always gives the
// same board and the tests can check every arrangement in Node.
//
// A pose is { x, y, z, r, s, o }: centre position in world pixels, depth,
// rotation in degrees, scale, opacity.

import { clamp, hashString, lerp, rng } from '../util.js'

// Size of a card at scale 1. cards.css must agree with this.
export const CARD = { w: 260, h: 216 }

const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const ZERO = { x: 0, y: 0 }

// Must match the camera (js/core/camera.js).
const PERSPECTIVE = 1100

// Cards sit at different depths, so nearer ones look bigger and sit further
// from the centre of the view than their world position suggests. Arrangements
// with depth are therefore spaced as they will be *seen* from a typical camera
// distance, then converted back to world positions. `magnify` is how much
// larger something at depth z looks than something on the z = 0 plane.
const SEEN_FROM = { scatter: -900, fan: -350 }

function magnify(z, cameraZ) {
  return (PERSPECTIVE - cameraZ) / (PERSPECTIVE - z - cameraZ)
}

// How an arrangement should stretch for the screen it is shown on.
// 'wide' is a desktop, 'tall' a phone held upright.
// ex, ey stretch where clusters and cards are seeded. `sideways` above 1 makes
// crowded cards part left and right before up and down (below 1, the reverse),
// which is what turns a round cloud into a band that fills the screen.
const SHAPES = {
  wide: { ex: 1.7, ey: 0.58, sideways: 1.9 },
  square: { ex: 1.12, ey: 0.9, sideways: 1.15 },
  tall: { ex: 0.62, ey: 1.5, sideways: 0.55 },
}

export function shapeFor(width, height) {
  const aspect = width / Math.max(1, height)
  if (aspect >= 1.25) return 'wide'
  if (aspect >= 0.8) return 'square'
  return 'tall'
}

function byProud(a, b) {
  return a.proud - b.proud
}

// A stable number in [-1, 1] for one card and one purpose.
function jitter(seed, id, salt) {
  return rng(hashString(id + salt) ^ seed)() * 2 - 1
}

// The same poses as they look from `cameraZ`, flattened onto the z = 0 plane.
export function asSeen(poses, cameraZ) {
  const out = []
  for (const pose of poses) {
    const f = magnify(pose.z, cameraZ)
    out.push({ ...pose, x: pose.x * f, y: pose.y * f, s: pose.s * f, z: 0 })
  }
  return out
}

export function boundsOf(poses) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let zSum = 0
  let count = 0
  for (const pose of poses) {
    const hw = (CARD.w * pose.s) / 2
    const hh = (CARD.h * pose.s) / 2
    minX = Math.min(minX, pose.x - hw)
    maxX = Math.max(maxX, pose.x + hw)
    minY = Math.min(minY, pose.y - hh)
    maxY = Math.max(maxY, pose.y + hh)
    zSum += pose.z
    count++
  }
  if (!count) return { x: 0, y: 0, w: 1, h: 1, z: 0 }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, z: zSum / count }
}

// Largest share of any card that another card covers, ignoring rotation.
export function worstOverlap(poses) {
  const list = [...poses]
  let worst = 0
  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      const A = list[a]
      const B = list[b]
      const ox = (CARD.w * (A.s + B.s)) / 2 - Math.abs(A.x - B.x)
      const oy = (CARD.h * (A.s + B.s)) / 2 - Math.abs(A.y - B.y)
      if (ox <= 0 || oy <= 0) continue
      const smaller = CARD.w * CARD.h * Math.min(A.s, B.s) ** 2
      worst = Math.max(worst, (ox * oy) / smaller)
    }
  }
  return worst
}

function recentre(poses, labels, origin) {
  const b = boundsOf(poses.values())
  const dx = origin.x - (b.x + b.w / 2)
  const dy = origin.y - (b.y + b.h / 2)
  for (const pose of poses.values()) {
    pose.x += dx
    pose.y += dy
  }
  for (const label of labels) {
    label.pose.x += dx
    label.pose.y += dy
  }
}

function result(poses, labels) {
  return { poses, labels, bounds: boundsOf(poses.values()) }
}

// The home view: loose clusters by kind of work, proudest pieces nearest and
// largest, everything slightly off-square.
export function scatter(items, { seed = 7, spread = 1, depth = 1, kinds = [], origin = ZERO, shape = 'wide' } = {}) {
  const poses = new Map()
  const labels = []
  const n = items.length
  if (!n) return result(poses, labels)

  const { ex, ey, sideways } = SHAPES[shape] || SHAPES.wide
  const from = SEEN_FROM.scatter
  const ranked = [...items].sort(byProud)
  const rankOf = new Map(ranked.map((item, i) => [item.id, i]))
  const kindOrder = kinds.length ? kinds.map((k) => k.id) : [...new Set(ranked.map((item) => item.kind))]
  const groups = kindOrder
    .map((kind) => ({ kind, items: ranked.filter((item) => item.kind === kind) }))
    .filter((group) => group.items.length)
  // Biggest cluster first: it takes the middle and the others settle around it.
  groups.sort((a, b) => b.items.length - a.items.length || kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind))

  const rand = rng(seed)
  const phase = rand() * Math.PI * 2
  const placed = []
  groups.forEach((group, i) => {
    group.r = (Math.sqrt(group.items.length) * 132 + 96) * spread
    group.phase = rand() * Math.PI * 2
    group.cx = 0
    group.cy = 0
    if (i > 0) {
      const angle = phase + i * GOLDEN
      let dist = placed[0].r + group.r
      for (let guard = 0; guard < 400; guard++) {
        group.cx = Math.cos(angle) * dist * ex
        group.cy = Math.sin(angle) * dist * ey
        const clear = placed.every((other) => (
          Math.hypot((group.cx - other.cx) / ex, (group.cy - other.cy) / ey) > (other.r + group.r) * 0.9
        ))
        if (clear) break
        dist += 24
      }
    }
    placed.push(group)
  })

  // Three depth planes, nearest for the proudest third. Distinct planes read
  // as depth far more clearly than a smooth slope, and keep the board orderly.
  const PLANES = [
    { z: 150, s: 1.1 },
    { z: -40, s: 1 },
    { z: -240, s: 0.92 },
  ]
  const ratio = shape === 'wide' ? 1.9 : shape === 'square' ? 1.2 : 0.55
  const gapX = 16 + 18 * spread
  const gapY = 16 + 18 * spread

  // Everything below is in "as seen" space until the last step.
  const bodies = []
  for (const group of groups) {
    const cols = Math.max(1, Math.min(group.items.length, Math.round(Math.sqrt(group.items.length * ratio))))
    const rows = Math.ceil(group.items.length / cols)
    group.items.forEach((item, j) => {
      const rank = rankOf.get(item.id)
      const plane = PLANES[Math.min(2, Math.floor((rank / n) * 3))]
      const z = plane.z * depth
      const f = magnify(z, from)
      const col = j % cols
      const row = Math.floor(j / cols)
      const inRow = row === rows - 1 ? group.items.length - row * cols : cols
      bodies.push({
        item,
        group,
        s: plane.s,
        z,
        f,
        x: group.cx + (col - (inRow - 1) / 2) * (CARD.w * 1.06 + gapX),
        y: group.cy + (row - (rows - 1) / 2) * (CARD.h * 1.06 + gapY),
        hw: (CARD.w * plane.s * f) / 2,
        hh: (CARD.h * plane.s * f) / 2,
      })
    })
  }

  // Push overlapping cards apart, with a light pull back toward their cluster
  // so the groups stay readable. The last passes skip the pull to finish clean.
  const margin = gapX * 0.6
  const passes = 160
  for (let pass = 0; pass < passes; pass++) {
    for (let a = 0; a < bodies.length; a++) {
      for (let b = a + 1; b < bodies.length; b++) {
        const A = bodies[a]
        const B = bodies[b]
        // Cards in different clusters keep a wider gap, so groups read as groups.
        const gap = A.group === B.group ? margin : margin * 3
        const dx = B.x - A.x
        const dy = B.y - A.y
        const ox = A.hw + B.hw + gap - Math.abs(dx)
        const oy = A.hh + B.hh + gap - Math.abs(dy)
        if (ox <= 0 || oy <= 0) continue
        if (ox < oy * sideways) {
          const push = (ox / 2) * (dx < 0 ? -1 : 1)
          A.x -= push
          B.x += push
        } else {
          const push = (oy / 2) * (dy < 0 ? -1 : 1)
          A.y -= push
          B.y += push
        }
      }
    }
    if (pass < passes - 30) {
      for (const body of bodies) {
        body.x += (body.group.cx - body.x) * 0.014 / sideways
        body.y += (body.group.cy - body.y) * 0.014 * sideways
      }
    }
  }

  // Centre the board as seen, then convert each card back to its world place.
  const left = Math.min(...bodies.map((body) => body.x - body.hw))
  const right = Math.max(...bodies.map((body) => body.x + body.hw))
  const top = Math.min(...bodies.map((body) => body.y - body.hh))
  const bottom = Math.max(...bodies.map((body) => body.y + body.hh))
  const mx = (left + right) / 2
  const my = (top + bottom) / 2
  for (const body of bodies) {
    body.x -= mx
    body.y -= my
    const { item, s, z, f } = body
    poses.set(item.id, {
      x: origin.x + body.x / f,
      y: origin.y + body.y / f,
      z,
      r: 0,
      s,
      o: 1,
    })
  }

  // Each label sits just above its cluster's highest card, at that card's
  // depth. Sharing a depth means the two move together as the camera pans, so
  // the label never slides under the card it belongs to.
  for (const group of groups) {
    const mine = bodies.filter((body) => body.group === group)
    const anchor = mine.reduce((best, body) => (body.y - body.hh < best.y - best.hh ? body : best))
    const kind = kinds.find((k) => k.id === group.kind)
    labels.push({
      id: `label:${group.kind}`,
      text: kind ? kind.label : group.kind,
      dab: kind ? kind.dab : null,
      pose: {
        x: origin.x + (anchor.x - anchor.hw + 2) / anchor.f,
        y: origin.y + (anchor.y - anchor.hh - 40) / anchor.f,
        z: anchor.z,
        r: 0,
        s: 1,
        o: 1,
      },
    })
  }

  // Bounds are given as seen, on the z = 0 plane, with room for the labels.
  const bounds = {
    x: origin.x + left - mx,
    y: origin.y + top - my - 50,
    w: right - left,
    h: bottom - top + 50,
    z: 0,
  }
  return { poses, labels, bounds }
}

// Everything squared up in rows, in the order given.
export function grid(items, { spread = 1, origin = ZERO, cols, shape = 'wide' } = {}) {
  const poses = new Map()
  const n = items.length
  if (!n) return result(poses, [])
  const byShape = { wide: Math.round(Math.sqrt(n * 1.45)), square: Math.round(Math.sqrt(n)), tall: 2 }
  const columns = Math.min(n, cols || Math.max(1, byShape[shape] || byShape.wide))
  const rows = Math.ceil(n / columns)
  const stepX = CARD.w + 36 * spread
  const stepY = CARD.h + 36 * spread
  items.forEach((item, i) => {
    const row = Math.floor(i / columns)
    const col = i % columns
    const inRow = row === rows - 1 ? n - row * columns : columns
    poses.set(item.id, {
      x: origin.x + (col - (inRow - 1) / 2) * stepX,
      y: origin.y + (row - (rows - 1) / 2) * stepY,
      z: 0,
      r: 0,
      s: 1,
      o: 1,
    })
  })
  return result(poses, [])
}

// Left to right by date, one group per year. Works with no date sit together
// at the end under their own label instead of being given a guessed year.
export function timeline(items, { seed = 7, spread = 1, origin = ZERO } = {}) {
  const poses = new Map()
  const labels = []
  if (!items.length) return result(poses, labels)

  const dated = items
    .filter((item) => item.year != null)
    .sort((a, b) => a.year - b.year || (a.month || 0) - (b.month || 0) || a.proud - b.proud)
  const undated = items.filter((item) => item.year == null).sort(byProud)

  const groups = []
  for (const item of dated) {
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.year === item.year) lastGroup.items.push(item)
    else groups.push({ year: item.year, text: String(item.year), items: [item] })
  }
  if (undated.length) groups.push({ year: null, text: 'undated', items: undated })

  const perColumn = 3
  const stepX = CARD.w + 34 * spread
  const stepY = CARD.h + 30 * spread
  const groupGap = 96 * spread
  const top = -((perColumn - 1) / 2) * stepY - CARD.h / 2
  let x = 0
  for (const group of groups) {
    const columns = Math.ceil(group.items.length / perColumn)
    group.items.forEach((item, i) => {
      const col = Math.floor(i / perColumn)
      const row = i % perColumn
      const inColumn = col === columns - 1 ? group.items.length - col * perColumn : perColumn
      poses.set(item.id, {
        x: x + col * stepX + CARD.w / 2,
        y: (row - (inColumn - 1) / 2) * stepY,
        z: 0,
        r: 0,
        s: 1,
        o: 1,
      })
    })
    labels.push({
      id: `label:year:${group.text}`,
      text: group.text,
      dab: null,
      pose: { x: x + 4, y: top - 64, z: 0, r: 0, s: 1, o: 1 },
    })
    x += columns * stepX - 34 * spread + groupGap
  }

  recentre(poses, labels, origin)
  return result(poses, labels)
}

// One pile, proudest on top.
export function stack(items, { seed = 7, origin = ZERO } = {}) {
  const poses = new Map()
  const n = items.length
  items.forEach((item, i) => {
    poses.set(item.id, {
      x: origin.x + jitter(seed, item.id, 'sx') * 10,
      y: origin.y + jitter(seed, item.id, 'sy') * 8,
      z: (n - i) * 3,
      r: i === 0 ? jitter(seed, item.id, 'sr') * 2 : jitter(seed, item.id, 'sr') * 9,
      s: 1,
      o: 1,
    })
  })
  return result(poses, [])
}

// A short run of cards brought forward in order, first one nearest. This is
// what a filtered view looks like: the matches step out of the board together.
export function fan(items, { seed = 7, spread = 1, depth = 1, origin = ZERO, shape = 'wide' } = {}) {
  const poses = new Map()
  const n = items.length
  if (!n) return result(poses, [])
  // A row on a desktop, a column or two on a phone.
  const perRow = shape === 'tall' ? (n <= 3 ? 1 : 2)
    : shape === 'square' ? Math.min(n, 3)
      : n <= 5 ? n : Math.ceil(n / 2)
  const rows = Math.ceil(n / perRow)
  const stepX = CARD.w * 1.06 + 34 * spread
  const stepY = CARD.h * 1.06 + 38 * spread
  const from = SEEN_FROM.fan
  let left = Infinity
  let right = -Infinity
  let top = Infinity
  let bottom = -Infinity
  items.forEach((item, i) => {
    const row = Math.floor(i / perRow)
    const col = i % perRow
    const inRow = row === rows - 1 ? n - row * perRow : perRow
    const z = (i === 0 ? 150 : clamp(112 - i * 16, -30, 112)) * depth
    const f = magnify(z, from)
    // Laid out as seen, so the row stays even though each card is at its own depth.
    const u = (col - (inRow - 1) / 2) * stepX
    const v = (row - (rows - 1) / 2) * stepY + (i === 0 ? 0 : jitter(seed, item.id, 'fy') * 10)
    // How big the card should look: the first a little larger than the rest.
    const looks = i === 0 ? 1.14 : 1
    const hw = (CARD.w * looks) / 2
    const hh = (CARD.h * looks) / 2
    left = Math.min(left, u - hw)
    right = Math.max(right, u + hw)
    top = Math.min(top, v - hh)
    bottom = Math.max(bottom, v + hh)
    poses.set(item.id, {
      x: origin.x + u / f,
      y: origin.y + v / f,
      z,
      r: 0,
      s: looks / f,
      o: 1,
    })
  })
  const bounds = { x: origin.x + left, y: origin.y + top, w: right - left, h: bottom - top, z: 0 }
  return { poses, labels: [], bounds }
}

export const LAYOUTS = { scatter, grid, timeline, stack }
