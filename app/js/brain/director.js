// The director. Given a Command it decides where every card goes, where the
// camera looks, and what the URL says. Everything that changes the board goes
// through apply(), so there is one place to reason about a view.

import { CARD, LAYOUTS, fan, shapeFor, stack } from '../board/layouts.js'
import { HOME, fromHash, hasFilter, sameView, sanitizeCommand, select, toHash, vocabOf } from './command.js'
import { getSettings, isLean, reducedMotion } from '../settings.js'

const SEED = 7

export function createDirector({ content, board, camera, ticker }) {
  const vocab = vocabOf(content)
  const works = content.works
  const listeners = new Set()

  // Screen space the camera keeps clear: the header above, the bar below.
  let inset = { top: 64, right: 0, bottom: 104, left: 0 }
  let state = { command: { ...HOME, tags: [] }, results: [], focus: null }
  // Poses of the current view before any card is focused.
  let base = new Map()
  // Where the visitor dropped cards they picked up. Cleared when the view changes.
  const moved = new Map()

  function layoutOptions() {
    const s = getSettings()
    const freeW = camera.view.w - inset.left - inset.right
    const freeH = camera.view.h - inset.top - inset.bottom
    return { seed: SEED, spread: s.spread, depth: s.depth, kinds: content.kinds, shape: shapeFor(freeW, freeH) }
  }

  function buildView(cmd) {
    const opts = layoutOptions()
    const selected = select(works, cmd)
    const results = selected.map((work) => work.id)

    if (!hasFilter(cmd)) {
      const out = LAYOUTS[cmd.layout](cmd.layout === 'scatter' ? works : selected, opts)
      return { poses: out.poses, labels: out.labels, bounds: out.bounds, results }
    }

    // A filtered view: the matches step forward together, near where they
    // already were, and everything else sinks back into the board.
    const home = LAYOUTS.scatter(works, opts)
    let ox = 0
    let oy = 0
    for (const id of results) {
      const pose = home.poses.get(id)
      ox += pose.x
      oy += pose.y
    }
    const origin = results.length ? { x: ox / results.length, y: oy / results.length } : { x: 0, y: 0 }
    const front = cmd.layout === 'scatter'
      ? fan(selected, { ...opts, origin })
      : LAYOUTS[cmd.layout](selected, { ...opts, origin })
    const poses = new Map()
    for (const [id, pose] of home.poses) {
      poses.set(id, { ...pose, z: pose.z - 420, s: pose.s * 0.92, o: 0.34, dim: true })
    }
    for (const [id, pose] of front.poses) poses.set(id, pose)
    return { poses, labels: front.labels, bounds: front.bounds, results }
  }

  // The focused card comes to the front plane, squared up. The rest give way.
  function withFocus(poses, id) {
    if (!id) return poses
    const out = new Map()
    for (const [key, pose] of poses) {
      if (key === id) {
        out.set(key, { ...pose, z: 230, r: 0, s: Math.max(pose.s, 1) * 1.08, o: 1, dim: false, focus: true })
      } else if (pose.dim) {
        out.set(key, pose)
      } else {
        out.set(key, { ...pose, z: pose.z - 70, o: Math.min(pose.o, 0.7), soft: true })
      }
    }
    return out
  }

  function narrow() {
    return isLean() || camera.view.w < 700
  }

  function frameCard(pose) {
    const w = CARD.w * pose.s
    const h = CARD.h * pose.s
    const freeW = camera.view.w - inset.left - inset.right
    const freeH = camera.view.h - inset.top - inset.bottom
    const targetW = narrow() ? freeW * 0.84 : Math.min(freeW * 0.44, 640)
    const scale = Math.min(targetW / w, (freeH * 0.8) / h)
    return camera.fit(
      { x: pose.x - w / 2, y: pose.y - h / 2, w, h },
      { inset, pad: 1, minScale: scale, maxScale: scale, zRef: pose.z },
    )
  }

  // Frame the cards in front. If that would make them too small to read (a
  // phone showing the whole board), open on the first card with its
  // neighbours around it instead, and let the visitor wander from there.
  function frameView(view, poses) {
    const minScale = (narrow() ? 112 : 96) / CARD.w
    const cam = camera.fit(view.bounds, { inset, pad: 0.92, minScale, maxScale: 1.12, zRef: view.bounds.z })
    const first = poses.get(view.results[0])
    if (!cam.clamped || !first) return cam
    const cameraZ = camera.zForScale(minScale * 1.28, 0)
    const scale = camera.scaleAt(first.z, cameraZ)
    const w = CARD.w * first.s
    const h = CARD.h * first.s
    return camera.fit(
      { x: first.x - w / 2, y: first.y - h / 2, w, h },
      { inset, pad: 1, minScale: scale, maxScale: scale, zRef: first.z },
    )
  }

  function writeUrl(cmd, mode) {
    const hash = toHash(cmd)
    if (mode === 'none') return
    const url = `${location.pathname}${location.search}${hash}`
    if (mode === 'push' && hash !== location.hash) history.pushState(null, '', url)
    else history.replaceState(null, '', url)
  }

  function notify() {
    for (const fn of listeners) fn(state)
  }

  // A valid Command and the view it produces. A filter that matches nothing
  // falls back to everything, so the board is never empty.
  function resolve(raw) {
    let cmd = sanitizeCommand(raw, vocab)
    let view = buildView(cmd)
    if (!view.results.length) {
      cmd = sanitizeCommand({ layout: cmd.layout }, vocab)
      view = buildView(cmd)
    }
    cmd.focus = (cmd.focus === 'first' ? view.results[0] : cmd.focus) || null
    return { cmd, view }
  }

  // url: 'push' adds a Back step, 'replace' rewrites the current one, 'none'
  // leaves the address alone (used when the address itself caused the change).
  function apply(raw, { url = 'push', stagger = true, keepCamera = false, instant = false } = {}) {
    const { cmd, view } = resolve(raw)
    const focus = cmd.focus

    const changed = !sameView(cmd, state.command)
    if (changed) moved.clear()
    for (const [id, spot] of moved) {
      const pose = view.poses.get(id)
      if (pose) view.poses.set(id, { ...pose, x: spot.x, y: spot.y })
    }
    base = view.poses
    const poses = withFocus(base, focus)
    const still = instant || reducedMotion()

    // Labels organise the board from a distance. Up close on one card they
    // would fill the screen, so they step out while a card is focused.
    const labels = focus
      ? view.labels.map((label) => ({ ...label, pose: { ...label.pose, o: 0 } }))
      : view.labels

    board.setTargets(poses, {
      labels,
      order: view.results,
      stagger: changed && stagger && !still ? getSettings().stagger : 0,
      instant: still,
    })

    if (!keepCamera) {
      const cam = focus ? frameCard(poses.get(focus)) : frameView(view, poses)
      if (still) camera.jump(cam)
      else camera.to(cam)
    }

    state = { command: cmd, results: view.results, focus: focus || null }
    writeUrl(cmd, url)
    ticker.wake()
    notify()
    return state
  }

  const director = {
    apply,

    getState() {
      return state
    },

    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },

    setInset(next) {
      inset = { ...inset, ...next }
    },

    // First paint: the cards start as one pile where the view will be, then
    // deal out to their places.
    deal() {
      const asked = fromHash(location.hash, vocab)
      if (reducedMotion()) {
        apply(asked, { url: 'replace', instant: true })
        return
      }
      const { cmd, view } = resolve(asked)
      const poses = withFocus(view.poses, cmd.focus)
      const cam = cmd.focus ? frameCard(poses.get(cmd.focus)) : frameView(view, poses)
      camera.jump(cam)
      const sorted = [...works].sort((a, b) => a.proud - b.proud)
      const pile = stack(sorted, { seed: SEED, origin: { x: cam.x, y: cam.y } })
      const start = new Map()
      for (const [id, pose] of pile.poses) start.set(id, { ...pose, o: 0 })
      board.jump(start)
      apply(cmd, { url: 'replace', keepCamera: true })
    },

    focus(id) {
      if (!vocab.ids.has(id) || id === state.focus) return
      // Stepping from card to card is one Back step, not one per card.
      apply({ ...state.command, focus: id }, { url: state.focus ? 'replace' : 'push' })
    },

    unfocus({ keepCamera = false } = {}) {
      if (!state.focus) return
      apply({ ...state.command, focus: null }, { keepCamera })
    },

    // Move focus to the nearest card in a direction (arrow keys).
    stepFocus(dx, dy) {
      const pool = hasFilter(state.command) ? state.results : works.map((work) => work.id)
      const from = state.focus ? base.get(state.focus) : camera.target
      let best = null
      let bestCost = Infinity
      for (const id of pool) {
        if (id === state.focus) continue
        const pose = base.get(id)
        const vx = pose.x - from.x
        const vy = pose.y - from.y
        const along = vx * dx + vy * dy
        if (along <= 8) continue
        const across = Math.abs(vx * dy - vy * dx)
        const cost = along + across * 2.2
        if (cost < bestCost) {
          bestCost = cost
          best = id
        }
      }
      if (best) director.focus(best)
      else if (!state.focus && pool.length) director.focus(pool[0])
    },

    // Step through the current results in order.
    next(delta) {
      const list = state.results
      if (!list.length) return
      const at = list.indexOf(state.focus)
      const index = at < 0 ? 0 : (at + delta + list.length) % list.length
      director.focus(list[index])
    },

    setLayout(name) {
      apply({ ...state.command, layout: name, focus: null })
    },

    home() {
      apply(HOME)
    },

    // One step out: leave a focused card, then leave a filtered or rearranged
    // view, then nothing.
    back() {
      if (state.focus) director.unfocus()
      else if (toHash(state.command) !== '') director.home()
    },

    // Remember where a picked-up card was dropped.
    moveCard(id, x, y) {
      moved.set(id, { x, y })
      const pose = base.get(id)
      if (pose) base.set(id, { ...pose, x, y })
    },

    // The pose a card should rest in right now (used when a drag ends).
    restPose(id) {
      return withFocus(base, state.focus).get(id)
    },

    // Same view again after a resize or a settings change.
    reframe({ instant = false } = {}) {
      apply(state.command, { url: 'none', stagger: false, instant })
    },
  }

  addEventListener('popstate', () => {
    apply(fromHash(location.hash, vocab), { url: 'none' })
  })
  addEventListener('hashchange', () => {
    if (toHash(state.command) !== location.hash) apply(fromHash(location.hash, vocab), { url: 'none' })
  })

  return director
}
