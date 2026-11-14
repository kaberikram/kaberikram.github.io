// Hands on the board: drag to wander, scroll or pinch to travel in depth, click a
// card to bring it forward, pick a card up and put it somewhere else, arrow
// keys to step between cards. Everything here ends in a camera move or a
// director call. It never positions cards itself, apart from the one being held.

import { clamp } from '../util.js'
import { getSettings, isLean } from '../settings.js'
import { cue } from '../cue.js'

// Movement under this many pixels is a click, not a drag.
const CLICK_SLOP = 6

export function initInput({ stage, camera, board, director, ticker }) {
  const pointers = new Map()
  let drag = null
  let pinch = null

  function typingTarget(target) {
    if (!target || !target.closest) return false
    return Boolean(target.closest('input, textarea, select, [contenteditable], #tune-panel, #bar, #sound'))
  }

  function beginPinch() {
    const [a, b] = [...pointers.values()]
    pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
    if (drag && drag.mode === 'card') putDown(drag)
    drag = null
  }

  function pickUp() {
    // A focused card goes back to the board before anything is carried.
    if (director.getState().focus) director.unfocus({ keepCamera: true })
    const pose = board.pose(drag.id)
    const rest = director.restPose(drag.id)
    if (!pose || !rest) return false
    // Remember which point of the card was pressed, so that point stays under
    // the pointer for the whole carry.
    const under = camera.screenToWorld(drag.downX, drag.downY, pose.z)
    drag.gx = under.x - pose.x
    drag.gy = under.y - pose.y
    drag.mode = 'card'
    board.lift(drag.id, { z: rest.z + 150, s: rest.s * 1.06 })
    cue('lift', { px: drag.px })
    stage.classList.add('is-carrying')
    return true
  }

  function follow() {
    const pose = board.pose(drag.id)
    const under = camera.screenToWorld(drag.px, drag.py, pose.z)
    board.carry(drag.id, under.x - drag.gx, under.y - drag.gy)
  }

  function putDown(held) {
    // The card sinks back to its own depth as it lands. Choose the spot at that
    // depth which sits under where the card is now, so it does not slide.
    const pose = board.pose(held.id)
    const rest = director.restPose(held.id)
    const onScreen = camera.worldToScreen(pose.x, pose.y, pose.z)
    const spot = camera.screenToWorld(onScreen.x, onScreen.y, rest ? rest.z : pose.z)
    director.moveCard(held.id, spot.x, spot.y)
    board.drop(held.id, director.restPose(held.id))
    cue('drop', { px: onScreen.x })
    stage.classList.remove('is-carrying')
    ticker.wake()
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button > 0) return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    stage.setPointerCapture(e.pointerId)
    if (pointers.size === 2) {
      beginPinch()
      return
    }
    if (pointers.size > 2) return
    const card = e.target.closest ? e.target.closest('.card') : null
    drag = {
      id: card ? card.dataset.id : null,
      mode: 'pending',
      travelled: 0,
      downX: e.clientX,
      downY: e.clientY,
      px: e.clientX,
      py: e.clientY,
      t: performance.now(),
      vx: 0,
      vy: 0,
    }
    stage.classList.add('is-dragging')
  })

  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && !isLean()) {
      // The whole board leans a little toward the pointer.
      const tilt = getSettings().tilt
      // -1 to 1 across the screen, so the edges give the full lean.
      const nx = (e.clientX / camera.view.w - 0.5) * 2
      const ny = (e.clientY / camera.view.h - 0.5) * 2
      camera.tiltTo(-ny * tilt, nx * tilt)
      ticker.wake()
    }
    const point = pointers.get(e.pointerId)
    if (!point) return
    const dx = e.clientX - point.x
    const dy = e.clientY - point.y
    point.x = e.clientX
    point.y = e.clientY

    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const scale = camera.scaleAt(camera.pivot)
      camera.jump({ x: camera.x - (mx - pinch.mx) / scale, y: camera.y - (my - pinch.my) / scale })
      camera.zoomAt(mx, my, dist / pinch.dist, { immediate: true })
      pinch.dist = dist
      pinch.mx = mx
      pinch.my = my
      ticker.wake()
      return
    }
    if (!drag) return

    const now = performance.now()
    const dt = Math.max(1, now - drag.t) / 1000
    drag.t = now
    drag.px = e.clientX
    drag.py = e.clientY
    // Smoothed pointer speed in screen px/s, for the glide and the lean.
    drag.vx += (dx / dt - drag.vx) * 0.35
    drag.vy += (dy / dt - drag.vy) * 0.35
    drag.travelled += Math.abs(dx) + Math.abs(dy)

    if (drag.mode === 'pending' && drag.travelled > CLICK_SLOP) {
      if (!drag.id || !pickUp()) {
        drag.mode = 'pan'
        if (director.getState().focus) director.unfocus({ keepCamera: true })
      }
    }

    if (drag.mode === 'pan') {
      // Measured at the depth being looked at, so that depth follows the hand.
      const scale = camera.scaleAt(camera.pivot)
      camera.jump({ x: camera.x - dx / scale, y: camera.y - dy / scale })
      ticker.wake()
    } else if (drag.mode === 'card') {
      follow()
      board.lean(drag.id, clamp(-drag.vy * 0.008, -14, 14), clamp(drag.vx * 0.008, -14, 14))
      ticker.wake()
    }
  })

  function release(e) {
    if (!pointers.delete(e.pointerId)) return
    if (pointers.size < 2) pinch = null
    if (pointers.size > 0) return
    stage.classList.remove('is-dragging')
    const ended = drag
    drag = null
    if (!ended) return

    if (ended.mode === 'pending') {
      if (e.type === 'pointercancel') return
      if (ended.id) director.focus(ended.id)
      else director.unfocus()
    } else if (ended.mode === 'pan') {
      // Let go mid-move and the board glides on a little.
      if (performance.now() - ended.t < 80) {
        const scale = camera.scaleAt(camera.pivot)
        camera.to({
          x: camera.x - (ended.vx * 0.22) / scale,
          y: camera.y - (ended.vy * 0.22) / scale,
        })
        ticker.wake()
      }
    } else if (ended.mode === 'card') {
      putDown(ended)
    }
  }
  stage.addEventListener('pointerup', release)
  stage.addEventListener('pointercancel', release)

  stage.addEventListener('pointerleave', () => {
    camera.tiltTo(0, 0)
    ticker.wake()
  })

  // Keyboard focus can make the browser scroll a clipped container to reveal
  // the focused card. The camera does that job here, so undo the scroll.
  stage.addEventListener('scroll', () => {
    stage.scrollTop = 0
    stage.scrollLeft = 0
  })

  addEventListener('wheel', (e) => {
    if (typingTarget(e.target)) return
    e.preventDefault()
    const unit = e.deltaMode === 1 ? 30 : 1
    if (e.shiftKey) {
      // Shift + scroll slides sideways.
      const target = camera.target
      const scale = camera.scaleAt(camera.pivot, target.z)
      camera.to({ x: target.x + (e.deltaY * unit) / scale, y: target.y })
    } else {
      // Scrolling travels through the space, toward whatever is under the
      // pointer. A trackpad pinch arrives as ctrl + wheel and moves faster.
      const rate = e.ctrlKey || e.metaKey ? 0.0045 : 0.0016
      camera.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * unit * rate))
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const target = camera.target
        const scale = camera.scaleAt(camera.pivot, target.z)
        camera.to({ x: target.x + (e.deltaX * unit) / scale, y: target.y })
      }
    }
    ticker.wake()
  }, { passive: false })

  const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  const NUMBER_LAYOUTS = { 1: 'scatter', 2: 'grid', 3: 'timeline', 4: 'stack' }

  addEventListener('keydown', (e) => {
    if (typingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
    const arrow = ARROWS[e.key]
    if (arrow) {
      e.preventDefault()
      director.stepFocus(arrow[0], arrow[1])
    } else if (e.key === 'Escape') {
      director.back()
    } else if (e.key === 'Enter' || e.key === ' ') {
      const card = document.activeElement && document.activeElement.closest('.card')
      if (card) {
        e.preventDefault()
        director.focus(card.dataset.id)
      } else if (e.key === 'Enter' && !director.getState().focus) {
        director.next(0)
      }
    } else if (e.key === 'Home' || e.key === '0') {
      director.home()
    } else if (NUMBER_LAYOUTS[e.key]) {
      director.setLayout(NUMBER_LAYOUTS[e.key])
    } else if (e.key === '+' || e.key === '=') {
      camera.zoomAt(camera.view.w / 2, camera.view.h / 2, 1.25)
      ticker.wake()
    } else if (e.key === '-' || e.key === '_') {
      camera.zoomAt(camera.view.w / 2, camera.view.h / 2, 0.8)
      ticker.wake()
    }
  })

  // Tabbing onto a card brings it into view the way a click would.
  stage.addEventListener('focusin', (e) => {
    const card = e.target.closest ? e.target.closest('.card') : null
    if (card && card.matches(':focus-visible')) director.focus(card.dataset.id)
  })

  addEventListener('resize', () => {
    camera.resize(innerWidth, innerHeight)
    director.reframe()
  })

  return {
    // Runs each frame before the board moves: while a card is rising in the
    // hand, keep the grabbed point under the pointer.
    step() {
      if (drag && drag.mode === 'card') follow()
      return false
    },
  }
}
