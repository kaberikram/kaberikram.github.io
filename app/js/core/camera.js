// The camera. It has a real position in the space: x, y and z (depth). Cards
// live at their own depths and the camera travels among them, so near things
// pass by and far things come closer the way real objects do.
//
// World units are CSS pixels on the z = 0 plane when the camera is at z = 0.
// The eye sits `perspective` units in front of the screen plane, so something
// at depth zw is (perspective - zw - camera.z) units from the eye.
//
// All projection maths lives here so anything else that needs to share the view
// later (a WebGL layer, for instance) has one place to read it from.

import { Springs } from './spring.js'
import { clamp } from '../util.js'

const X = 0
const Y = 1
const Z = 2
const RX = 3
const RY = 4
const PIVOT = 5

// How small or large a plane may appear when the camera frames it.
export const MIN_SCALE = 0.2
export const MAX_SCALE = 2.8

// Never rotate about a point at or behind the eye.
const EYE_MARGIN = 160

const RAD = Math.PI / 180

// CSS rotateY(ry) then rotateX(rx), in degrees, about the point (0, 0, pz).
function lean(x, y, z, rx, ry, pz) {
  const zr = z - pz
  const cy = Math.cos(ry * RAD)
  const sy = Math.sin(ry * RAD)
  const x1 = x * cy + zr * sy
  const z1 = -x * sy + zr * cy
  const cx = Math.cos(rx * RAD)
  const sx = Math.sin(rx * RAD)
  return { x: x1, y: y * cx - z1 * sx, z: y * sx + z1 * cx + pz }
}

// The reverse: undo rotateX, then undo rotateY, about the same point.
function unlean(x, y, z, rx, ry, pz) {
  const zr = z - pz
  const cx = Math.cos(rx * RAD)
  const sx = Math.sin(rx * RAD)
  const y1 = y * cx + zr * sx
  const z1 = -y * sx + zr * cx
  const cy = Math.cos(ry * RAD)
  const sy = Math.sin(ry * RAD)
  return { x: x * cy - z1 * sy, y: y1, z: x * sy + z1 * cy + pz }
}

export function createCamera({ perspective = 800, stiffness = 90, damping = 20 } = {}) {
  const sp = new Springs(6, { stiffness, damping, eps: [0.05, 0.05, 0.05, 0.004, 0.004, 0.5] })
  const view = { w: 1024, h: 768 }
  const P = perspective
  const pointerTilt = { x: 0, y: 0 }
  let bankAmount = 1
  let range = { min: P - P / MIN_SCALE, max: P - P / MAX_SCALE }
  // A long flight in progress: where depth should end up once most of the
  // sideways travel is done.
  let arc = null

  function scaleAt(zw = 0, cz = sp.value[Z]) {
    return P / Math.max(1, P - zw - cz)
  }

  function clampZ(z) {
    return clamp(z, range.min, range.max)
  }

  // Depth of the lean's pivot in view space (after the camera's own move).
  function pivotView() {
    return Math.min(sp.value[PIVOT] + sp.value[Z], P - EYE_MARGIN)
  }

  const camera = {
    perspective: P,
    view,

    get x() { return sp.value[X] },
    get y() { return sp.value[Y] },
    get z() { return sp.value[Z] },
    // The depth the camera is looking at: the focused card, or the middle of
    // the cards in view. The lean turns about it and panning is measured there.
    get pivot() { return sp.target[PIVOT] },
    get target() {
      return { x: sp.target[X], y: sp.target[Y], z: arc ? arc.z : sp.target[Z] }
    },
    get velocity() {
      return { x: sp.velocity[X], y: sp.velocity[Y], z: sp.velocity[Z] }
    },

    resize(w, h) {
      view.w = Math.max(1, w)
      view.h = Math.max(1, h)
    },

    setSpring(stiffnessValue, dampingValue) {
      sp.stiffness = stiffnessValue
      sp.damping = dampingValue
    },

    setBank(amount) {
      bankAmount = amount
    },

    setPivot(zw, { immediate = false } = {}) {
      if (immediate) sp.set(PIVOT, zw)
      else sp.to(PIVOT, zw)
    },

    // How far back and how far in the camera may travel.
    setRange(min, max) {
      range = { min: Math.min(min, max), max: Math.max(min, max) }
    },

    // On-screen size of one world pixel at depth zw.
    scaleAt,

    // How far something at depth zw is from the eye. Zero or less is behind it.
    distanceTo(zw, cz = sp.value[Z]) {
      return P - zw - cz
    },

    // The camera z that makes depth zw appear at the given scale.
    zForScale(scale, zw = 0) {
      return clampZ(P - P / scale - zw)
    },

    // The world point at depth zw that appears under a screen point. Exact,
    // including the camera's lean, so a held card stays under the pointer.
    //
    // The view is: move the world by the camera position, lean it about the
    // pivot (rotateY then rotateX, as transform() writes it), then project from
    // an eye `P` in front of the screen. This walks that backwards: every point
    // on the ray through the screen point is A + t * B in view space; un-lean
    // both, then pick the t that lands on depth zw.
    screenToWorld(px, py, zw = 0) {
      const v = sp.value
      const pz = pivotView()
      const u = (px - view.w / 2) / P
      const w = (py - view.h / 2) / P
      const a = unlean(u * P, w * P, 0, v[RX], v[RY], pz)
      const b = unlean(-u, -w, 1 + pz, v[RX], v[RY], pz)
      b.z -= pz
      const t = (zw + v[Z] - a.z) / b.z
      return { x: v[X] + a.x + t * b.x, y: v[Y] + a.y + t * b.y }
    },

    worldToScreen(x, y, zw = 0) {
      const v = sp.value
      const p = lean(x - v[X], y - v[Y], zw + v[Z], v[RX], v[RY], pivotView())
      const s = P / Math.max(1, P - p.z)
      return { x: view.w / 2 + p.x * s, y: view.h / 2 + p.y * s, scale: s }
    },

    // Go somewhere at once, with no motion.
    jump({ x = sp.value[X], y = sp.value[Y], z = sp.value[Z] } = {}) {
      arc = null
      sp.set(X, x)
      sp.set(Y, y)
      sp.set(Z, clampZ(z))
    },

    // Fly somewhere on the spring. A long sideways trip pulls back first and
    // pushes in on arrival, so the space is crossed, not slid over.
    to({ x = sp.target[X], y = sp.target[Y], z = sp.target[Z] } = {}, { arc: wantArc = false } = {}) {
      const final = clampZ(z)
      sp.to(X, x)
      sp.to(Y, y)
      const sideways = Math.hypot(x - sp.value[X], y - sp.value[Y])
      const reach = sideways * scaleAt(sp.target[PIVOT])
      if (wantArc && reach > view.w * 0.45) {
        const pull = Math.min(520, sideways * 0.3)
        arc = { z: final, from: sideways }
        sp.to(Z, clampZ(Math.min(sp.value[Z], final) - pull))
      } else {
        arc = null
        sp.to(Z, final)
      }
    },

    // Travel forward (dz > 0) or back along the ray through a screen point, so
    // whatever is under the pointer stays under it at every depth.
    dolly(px, py, dz, { immediate = false } = {}) {
      const from = sp.target[Z]
      const next = clampZ(from + dz)
      const moved = next - from
      const u = (px - view.w / 2) / P
      const w = (py - view.h / 2) / P
      const goal = { x: sp.target[X] + u * moved, y: sp.target[Y] + w * moved, z: next }
      if (immediate) camera.jump(goal)
      else camera.to(goal)
    },

    // Travel so the pivot depth looks `factor` times bigger (pinch, + and -).
    // Past the pivot the step stays a steady size, so you can fly on through.
    zoomAt(px, py, factor, options) {
      const distance = Math.max(320, P - sp.target[PIVOT] - sp.target[Z])
      camera.dolly(px, py, distance - distance / factor, options)
    },

    // Where the camera should sit so a world rectangle fills the free part of
    // the screen. `inset` is screen space kept clear (the bar, the header).
    // `zRef` is the depth the rectangle lives at.
    fit(rect, { inset = {}, pad = 0.86, minScale = MIN_SCALE, maxScale = MAX_SCALE, zRef = 0 } = {}) {
      const top = inset.top || 0
      const right = inset.right || 0
      const bottom = inset.bottom || 0
      const left = inset.left || 0
      const freeW = Math.max(1, view.w - left - right)
      const freeH = Math.max(1, view.h - top - bottom)
      const wanted = Math.min((freeW * pad) / Math.max(1, rect.w), (freeH * pad) / Math.max(1, rect.h))
      const scale = clamp(wanted, minScale, maxScale)
      const fx = left + freeW / 2
      const fy = top + freeH / 2
      return {
        x: rect.x + rect.w / 2 - (fx - view.w / 2) / scale,
        y: rect.y + rect.h / 2 - (fy - view.h / 2) / scale,
        z: clampZ(P - P / scale - zRef),
        scale,
        clamped: wanted < minScale,
      }
    },

    // A lean that follows the pointer, in degrees.
    tiltTo(x, y) {
      pointerTilt.x = x
      pointerTilt.y = y
    },

    step(dt) {
      if (arc) {
        const left = Math.hypot(sp.target[X] - sp.value[X], sp.target[Y] - sp.value[Y])
        if (left < arc.from * 0.55) {
          sp.to(Z, arc.z)
          arc = null
        }
      }
      // Lean into fast moves, then level out.
      const bankY = clamp(sp.velocity[X] * 0.002, -7, 7) * bankAmount
      const bankX = clamp(-sp.velocity[Y] * 0.002, -7, 7) * bankAmount
      sp.to(RX, pointerTilt.x + bankX)
      sp.to(RY, pointerTilt.y + bankY)
      return sp.step(dt) || Boolean(arc)
    },

    transform() {
      const v = sp.value
      const pz = pivotView()
      return `translateZ(${pz.toFixed(2)}px) rotateX(${v[RX].toFixed(3)}deg) rotateY(${v[RY].toFixed(3)}deg) translateZ(${(-pz).toFixed(2)}px) translate3d(${(-v[X]).toFixed(2)}px,${(-v[Y]).toFixed(2)}px,${v[Z].toFixed(2)}px)`
    },
  }

  return camera
}
