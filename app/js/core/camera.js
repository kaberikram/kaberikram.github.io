// The camera. World units are CSS pixels on the z = 0 plane when the camera is
// at z = 0. Moving the camera forward (z up) is how the board zooms, so cards at
// different depths slide past each other the way real objects do.
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

// How small or large the z = 0 plane may appear on screen.
export const MIN_SCALE = 0.24
export const MAX_SCALE = 2.8

const RAD = Math.PI / 180

// CSS rotateY(ry) then rotateX(rx), in degrees, applied to a point.
function lean(x, y, z, rx, ry) {
  const cy = Math.cos(ry * RAD)
  const sy = Math.sin(ry * RAD)
  const x1 = x * cy + z * sy
  const z1 = -x * sy + z * cy
  const cx = Math.cos(rx * RAD)
  const sx = Math.sin(rx * RAD)
  return { x: x1, y: y * cx - z1 * sx, z: y * sx + z1 * cx }
}

// The reverse: undo rotateX, then undo rotateY.
function unlean(x, y, z, rx, ry) {
  const cx = Math.cos(rx * RAD)
  const sx = Math.sin(rx * RAD)
  const y1 = y * cx + z * sx
  const z1 = -y * sx + z * cx
  const cy = Math.cos(ry * RAD)
  const sy = Math.sin(ry * RAD)
  return { x: x * cy - z1 * sy, y: y1, z: x * sy + z1 * cy }
}

export function createCamera({ perspective = 1100, stiffness = 90, damping = 20 } = {}) {
  const sp = new Springs(5, { stiffness, damping, eps: [0.05, 0.05, 0.05, 0.004, 0.004] })
  const view = { w: 1024, h: 768 }
  const P = perspective
  const pointerTilt = { x: 0, y: 0 }
  let bankAmount = 1

  const zMin = P - P / MIN_SCALE
  const zMax = P - P / MAX_SCALE

  function scaleAt(zw = 0, cz = sp.value[Z]) {
    return P / Math.max(1, P - zw - cz)
  }

  function clampZ(z) {
    return clamp(z, zMin, zMax)
  }

  const camera = {
    perspective: P,
    view,

    get x() { return sp.value[X] },
    get y() { return sp.value[Y] },
    get z() { return sp.value[Z] },
    get target() {
      return { x: sp.target[X], y: sp.target[Y], z: sp.target[Z] }
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

    // On-screen size of one world pixel at depth zw.
    scaleAt,

    // The camera z that makes depth zw appear at the given scale.
    zForScale(scale, zw = 0) {
      return clampZ(P - P / scale - zw)
    },

    // The world point at depth zw that appears under a screen point. Exact,
    // including the camera's lean, so a held card stays under the pointer.
    //
    // The view is: move the world by the camera position, lean it about the
    // screen centre (rotateY then rotateX, as transform() writes it), then
    // project from an eye `P` in front of the screen. This walks that backwards:
    // every point on the ray through the screen point is A + t * B in view
    // space; un-lean both, then pick the t that lands on depth zw.
    screenToWorld(px, py, zw = 0) {
      const v = sp.value
      const u = (px - view.w / 2) / P
      const w = (py - view.h / 2) / P
      const a = unlean(u * P, w * P, 0, v[RX], v[RY])
      const b = unlean(-u, -w, 1, v[RX], v[RY])
      const t = (zw + v[Z] - a.z) / b.z
      return { x: v[X] + a.x + t * b.x, y: v[Y] + a.y + t * b.y }
    },

    worldToScreen(x, y, zw = 0) {
      const v = sp.value
      const p = lean(x - v[X], y - v[Y], zw + v[Z], v[RX], v[RY])
      const s = P / Math.max(1, P - p.z)
      return { x: view.w / 2 + p.x * s, y: view.h / 2 + p.y * s, scale: s }
    },

    // Go somewhere at once, with no motion.
    jump({ x = sp.value[X], y = sp.value[Y], z = sp.value[Z] } = {}) {
      sp.set(X, x)
      sp.set(Y, y)
      sp.set(Z, clampZ(z))
    },

    // Fly somewhere on the spring.
    to({ x = sp.target[X], y = sp.target[Y], z = sp.target[Z] } = {}) {
      sp.to(X, x)
      sp.to(Y, y)
      sp.to(Z, clampZ(z))
    },

    // Zoom by a factor while keeping the world point under (px, py) in place.
    zoomAt(px, py, factor, { immediate = false } = {}) {
      const cz = sp.target[Z]
      const s0 = scaleAt(0, cz)
      const s1 = clamp(s0 * factor, MIN_SCALE, MAX_SCALE)
      const wx = sp.target[X] + (px - view.w / 2) / s0
      const wy = sp.target[Y] + (py - view.h / 2) / s0
      const next = {
        x: wx - (px - view.w / 2) / s1,
        y: wy - (py - view.h / 2) / s1,
        z: P - P / s1,
      }
      if (immediate) camera.jump(next)
      else camera.to(next)
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

    // A small lean that follows the pointer, in degrees.
    tiltTo(x, y) {
      pointerTilt.x = x
      pointerTilt.y = y
    },

    step(dt) {
      // Lean into fast moves, then level out.
      const bankY = clamp(sp.velocity[X] * 0.0011, -3, 3) * bankAmount
      const bankX = clamp(-sp.velocity[Y] * 0.0011, -3, 3) * bankAmount
      sp.to(RX, pointerTilt.x + bankX)
      sp.to(RY, pointerTilt.y + bankY)
      return sp.step(dt)
    },

    transform() {
      const v = sp.value
      return `rotateX(${v[RX].toFixed(3)}deg) rotateY(${v[RY].toFixed(3)}deg) translate3d(${(-v[X]).toFixed(2)}px,${(-v[Y]).toFixed(2)}px,${v[Z].toFixed(2)}px)`
    },
  }

  return camera
}
