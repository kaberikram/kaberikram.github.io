import { bootSettings, getSettings } from './settings.js'
import { initGlass } from './glass.js'
import { initCaption } from './caption.js'
import { initScene } from './scene.js'
import { initDebug } from './debug.js'

bootSettings()

const glass = initGlass()
const caption = initCaption()
const scene = initScene({ glass, caption })
initDebug({
  onCaptionShape() {
    scene.rebuildCaption()
  },
})

window.__progress = {
  getSettings,
  get ready() {
    return glass.isReady() && caption.isReady()
  },
}
