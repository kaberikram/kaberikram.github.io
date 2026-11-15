// Boot order: settings, content, camera, board, director, input, tune panel.

import { LAYOUT_KEYS, bootSettings, getSettings, subscribe } from './settings.js'
import { loadContent } from './content.js'
import { createTicker } from './core/spring.js'
import { createCamera } from './core/camera.js'
import { createBoard } from './board/board.js'
import { initInput } from './board/input.js'
import { createDirector } from './brain/director.js'
import { createBar } from './bar/bar.js'
import { initTune } from './dev/tune.js'
import { createSound } from './sound/sound.js'

bootSettings()

const stage = document.getElementById('stage')
const world = document.getElementById('world')
const ticker = createTicker()

let ready = false
let director = null

try {
  const content = await loadContent()
  const settings = getSettings()

  const camera = createCamera({
    perspective: 800,
    stiffness: settings.camStiffness,
    damping: settings.camDamping,
  })
  camera.resize(innerWidth, innerHeight)
  camera.setBank(settings.bank)
  stage.style.perspective = `${camera.perspective}px`

  const board = createBoard({ world, content })
  director = createDirector({ content, board, camera, ticker })
  const input = initInput({ stage, camera, board, director, ticker })

  // Order matters: the camera moves, the held card is re-seated under the
  // pointer, then every card advances.
  // The backdrop's horizon is far away: it slides when the view turns (about
  // 14px a degree at this lens) and stays put when the camera travels.
  const root = document.documentElement
  let roomX = null
  let roomY = null
  const turnRoom = () => {
    const { rx, ry } = camera.lean
    const x = Math.round(Math.max(-130, Math.min(130, -ry * 14)))
    const y = Math.round(Math.max(-130, Math.min(130, rx * 14)))
    if (x === roomX && y === roomY) return
    roomX = x
    roomY = y
    root.style.setProperty('--room-x', `${x}px`)
    root.style.setProperty('--room-y', `${y}px`)
  }

  ticker.add((dt) => {
    const moving = camera.step(dt)
    world.style.transform = camera.transform()
    turnRoom()
    return moving
  })
  ticker.add(() => input.step())
  ticker.add((dt) => {
    const moving = board.step(dt)
    // What is in focus: the work being looked at, or with none chosen, the
    // nearest works. So the proudest pieces up front are always sharp and the
    // room softens only with distance.
    let focal = camera.distanceTo(camera.pivot)
    if (!director.getState().focus) {
      let nearest = Infinity
      for (const node of board.cards.values()) {
        const d = camera.distanceTo(node.sp.value[2])
        if (d > 200 && d < nearest) nearest = d
      }
      if (nearest < Infinity) focal = Math.min(focal, nearest * 1.2)
    }
    board.look((z) => camera.distanceTo(z), focal)
    return moving
  })

  subscribe((next, changed) => {
    camera.setSpring(next.camStiffness, next.camDamping)
    camera.setBank(next.bank)
    board.syncSprings()
    board.syncEdges()
    if (changed.some((key) => LAYOUT_KEYS.includes(key))) director.reframe()
    ticker.wake()
  })

  // Keep keyboard focus on the card the board is showing, so Tab carries on
  // from there. preventScroll: the camera already brought it into view.
  director.subscribe((state) => {
    if (!state.focus) return
    // Never pull focus out of the bar: the board previews while you type.
    if (document.activeElement && document.activeElement.closest('#bar')) return
    const node = board.cards.get(state.focus)
    if (node && document.activeElement !== node.el) node.el.focus({ preventScroll: true })
  })

  createBar({ content, director, mount: document.getElementById('bar') })

  const sound = createSound({ camera, director, button: document.getElementById('sound') })
  ticker.add(() => sound.update())

  initTune({
    views: [
      ['Messy', () => director.setLayout('scatter')],
      ['Grid', () => director.setLayout('grid')],
      ['Timeline', () => director.setLayout('timeline')],
      ['Stack', () => director.setLayout('stack')],
      ['Home', () => director.home()],
    ],
  })

  world.style.transform = camera.transform()
  director.deal()
  ready = true

  window.__progress = {
    getSettings,
    director,
    camera,
    ticker,
    sound,
    get ready() {
      return ready
    },
  }
} catch (error) {
  console.error(error)
  document.documentElement.classList.add('failed')
}
