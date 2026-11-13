// The board: one DOM element per card and per label, each driven by springs.
// It knows nothing about what should be shown. The director hands it a pose
// for every card and it moves them there.

import { Springs } from '../core/spring.js'
import { clamp, escapeHtml, hashString } from '../util.js'
import { imgUrl } from '../content.js'
import { getSettings } from '../settings.js'

// Spring channels of a node.
const X = 0
const Y = 1
const Z = 2
const R = 3
const S = 4
const O = 5
const TX = 6
const TY = 7
// A card closer to the eye than NEAR_HIDE is invisible; it fades in over the
// next NEAR_FADE units.
const NEAR_HIDE = 110
const NEAR_FADE = 240

const EPS = [0.05, 0.05, 0.05, 0.01, 0.0008, 0.003, 0.02, 0.02]

function cardElement(work) {
  const el = document.createElement('article')
  el.className = `card${work.cover ? '' : ' is-words'}${work.muted ? ' is-muted' : ''}`
  el.dataset.id = work.id
  el.tabIndex = 0
  el.setAttribute('role', 'button')
  el.setAttribute('aria-label', [work.title, work.line, work.when].filter(Boolean).join(', '))
  // Each card drifts on its own slow clock so the board never moves in step.
  const seed = hashString(work.id)
  el.style.setProperty('--drift-time', `${7 + (seed % 50) / 10}s`)
  el.style.setProperty('--drift-delay', `${-((seed >> 8) % 90) / 10}s`)

  const picture = work.cover
    ? `<div class="card-pic"><img src="${imgUrl(work.cover)}" alt="" draggable="false" decoding="async"></div>`
    : `<div class="card-pic"><p>${escapeHtml(work.line)}</p></div>`
  const when = work.when ? `<span>${escapeHtml(work.when)}</span>` : ''
  el.innerHTML = `<div class="card-in">${picture}<div class="card-cap"><b>${escapeHtml(work.title)}</b>${when}</div></div>`
  return el
}

function labelElement(label) {
  const el = document.createElement('div')
  el.className = 'label'
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = `<span>${escapeHtml(label.text)}</span>`
  return el
}

function makeNode(el, isCard) {
  const sp = new Springs(8, { eps: EPS })
  sp.set(S, 1)
  return { el, isCard, sp, active: false, pending: null, delay: 0, lift: -1, shown: true, near: 1, blocked: false }
}

export function createBoard({ world, content }) {
  const cards = new Map()
  const labels = new Map()

  for (const work of [...content.works].sort((a, b) => a.proud - b.proud)) {
    const el = cardElement(work)
    world.appendChild(el)
    cards.set(work.id, makeNode(el, true))
  }

  function write(node) {
    const v = node.sp.value
    node.el.style.transform = `translate3d(${v[X].toFixed(2)}px,${v[Y].toFixed(2)}px,${v[Z].toFixed(2)}px) rotateX(${v[TX].toFixed(2)}deg) rotateY(${v[TY].toFixed(2)}deg) rotateZ(${v[R].toFixed(3)}deg) scale(${v[S].toFixed(4)})`
    const opacity = clamp(v[O], 0, 1) * node.near
    node.el.style.opacity = opacity.toFixed(3)
    const shown = opacity > 0.01
    if (shown !== node.shown) {
      node.shown = shown
      node.el.style.visibility = shown ? '' : 'hidden'
    }
  }

  function start(node) {
    if (node.active) return
    node.active = true
    node.el.classList.add('is-moving')
  }

  function aim(node, pose) {
    const sp = node.sp
    sp.to(X, pose.x)
    sp.to(Y, pose.y)
    sp.to(Z, pose.z)
    sp.to(R, pose.r)
    sp.to(S, pose.s)
    sp.to(O, pose.o)
    start(node)
  }

  function place(node, pose) {
    const sp = node.sp
    sp.set(X, pose.x)
    sp.set(Y, pose.y)
    sp.set(Z, pose.z)
    sp.set(R, pose.r)
    sp.set(S, pose.s)
    sp.set(O, pose.o)
    sp.set(TX, 0)
    sp.set(TY, 0)
    node.pending = null
    node.active = false
    node.el.classList.remove('is-moving')
    write(node)
  }

  function flags(node, pose) {
    node.el.classList.toggle('is-dim', Boolean(pose.dim))
    node.el.classList.toggle('is-soft', Boolean(pose.soft))
    node.el.classList.toggle('is-focus', Boolean(pose.focus))
  }

  function syncSprings() {
    const s = getSettings()
    for (const node of [...cards.values(), ...labels.values()]) {
      node.sp.stiffness = s.cardStiffness
      node.sp.damping = s.cardDamping
    }
  }
  syncSprings()

  const board = {
    cards,

    syncSprings,

    // Put every card somewhere at once, with no motion.
    jump(poses) {
      for (const [id, pose] of poses) {
        const node = cards.get(id)
        if (!node) continue
        place(node, pose)
        flags(node, pose)
      }
    },

    // Send every card toward a new pose. `order` lists ids in the sequence they
    // should set off; `stagger` is the gap between departures in milliseconds.
    setTargets(poses, { labels: nextLabels = [], order = [], stagger = 0, instant = false } = {}) {
      const rank = new Map(order.map((id, i) => [id, i]))
      for (const [id, pose] of poses) {
        const node = cards.get(id)
        if (!node) continue
        flags(node, pose)
        if (instant) {
          place(node, pose)
          continue
        }
        const index = rank.has(id) ? rank.get(id) : order.length
        const delay = (index * stagger) / 1000
        if (delay > 0) {
          node.pending = pose
          node.delay = delay
        } else {
          node.pending = null
          aim(node, pose)
        }
      }

      const wanted = new Set()
      for (const label of nextLabels) {
        wanted.add(label.id)
        let node = labels.get(label.id)
        if (!node) {
          node = makeNode(labelElement(label), false)
          world.appendChild(node.el)
          labels.set(label.id, node)
          place(node, { ...label.pose, o: 0 })
          syncSprings()
        }
        if (instant) place(node, label.pose)
        else aim(node, label.pose)
      }
      for (const [id, node] of labels) {
        if (wanted.has(id)) continue
        if (instant) {
          node.sp.set(O, 0)
          write(node)
        } else {
          node.sp.to(O, 0)
          start(node)
        }
      }
    },

    // Current values of a card, for hit maths and dragging.
    pose(id) {
      const node = cards.get(id)
      if (!node) return null
      const v = node.sp.value
      return { x: v[X], y: v[Y], z: v[Z], r: v[R], s: v[S], o: v[O] }
    },

    // Dragging: the card follows the hand exactly, so position is set, not sprung.
    carry(id, x, y) {
      const node = cards.get(id)
      if (!node) return
      node.pending = null
      node.sp.set(X, x)
      node.sp.set(Y, y)
      start(node)
    },

    // Picked up: comes toward you and grows a touch. Put down: `rest` is the
    // pose it should settle into.
    lift(id, { z, s }) {
      const node = cards.get(id)
      if (!node) return
      node.sp.to(Z, z)
      node.sp.to(S, s)
      node.el.classList.add('is-held')
      start(node)
    },

    drop(id, rest) {
      const node = cards.get(id)
      if (!node) return
      node.el.classList.remove('is-held')
      node.sp.to(TX, 0)
      node.sp.to(TY, 0)
      aim(node, rest)
    },

    // Lean with the movement while held, in degrees.
    lean(id, tx, ty) {
      const node = cards.get(id)
      if (!node) return
      node.sp.to(TX, tx)
      node.sp.to(TY, ty)
      start(node)
    },

    // Depth as the camera sees it right now. Called every frame the camera or a
    // card moves. `distanceTo(z)` is how far a depth is from the eye, and
    // `focal` is the distance to what the camera is looking at.
    //
    // Cards near the focal distance are sharp with a full shadow; farther ones
    // take on haze and blur in steps; anything about to hit the eye fades out
    // and stops taking clicks, so it never blocks the view.
    look(distanceTo, focal) {
      const update = (node) => {
        const distance = distanceTo(node.sp.value[Z])
        const near = Math.round(clamp((distance - NEAR_HIDE) / NEAR_FADE, 0, 1) * 20) / 20
        if (near !== node.near) {
          node.near = near
          write(node)
        }
        const blocked = near < 0.35
        if (blocked !== node.blocked) {
          node.blocked = blocked
          node.el.style.pointerEvents = blocked ? 'none' : ''
        }
        if (!node.isCard) return
        // Octaves beyond (+) or in front of (-) the focal distance.
        const beyond = Math.log2(Math.max(1, distance) / Math.max(1, focal))
        const lift = clamp(Math.round(4 - beyond * 5), 0, 6)
        if (lift !== node.lift) {
          node.lift = lift
          node.el.dataset.lift = String(lift)
        }
        // Well in front of what is being looked at: out of focus, see-through.
        const fore = beyond < -0.7
        if (fore !== node.fore) {
          node.fore = fore
          node.el.classList.toggle('is-fore', fore)
        }
      }
      for (const node of cards.values()) update(node)
      for (const node of labels.values()) update(node)
    },

    step(dt) {
      let any = false
      const advance = (node) => {
        if (node.pending) {
          node.delay -= dt
          if (node.delay <= 0) {
            aim(node, node.pending)
            node.pending = null
          }
          any = true
        }
        if (!node.active) return
        const moving = node.sp.step(dt)
        write(node)
        if (moving) {
          any = true
        } else {
          node.active = false
          node.el.classList.remove('is-moving')
        }
      }
      for (const node of cards.values()) advance(node)
      for (const node of labels.values()) advance(node)
      return any
    },
  }

  return board
}
