// Springs, and the one animation loop that drives them.
// The loop stops itself when nothing is moving, so an idle page costs nothing.

const SUBSTEP = 1 / 120

// A fixed set of spring-driven numbers that share one stiffness and damping.
export class Springs {
  constructor(count, { stiffness = 120, damping = 18, eps = 0.01 } = {}) {
    this.count = count
    this.stiffness = stiffness
    this.damping = damping
    this.value = new Float64Array(count)
    this.velocity = new Float64Array(count)
    this.target = new Float64Array(count)
    this.eps = typeof eps === 'number' ? new Float64Array(count).fill(eps) : Float64Array.from(eps)
  }

  // Put a channel somewhere immediately, with no motion.
  set(i, v) {
    this.value[i] = v
    this.target[i] = v
    this.velocity[i] = 0
  }

  to(i, v) {
    this.target[i] = v
  }

  atRest() {
    for (let i = 0; i < this.count; i++) {
      if (Math.abs(this.value[i] - this.target[i]) > this.eps[i]) return false
      if (Math.abs(this.velocity[i]) > this.eps[i] * 4) return false
    }
    return true
  }

  // Advance by dt seconds. Returns true while anything is still moving.
  step(dt) {
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP))
    const h = dt / steps
    const k = this.stiffness
    const c = this.damping
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < this.count; i++) {
        const a = -k * (this.value[i] - this.target[i]) - c * this.velocity[i]
        this.velocity[i] += a * h
        this.value[i] += this.velocity[i] * h
      }
    }
    if (!this.atRest()) return true
    for (let i = 0; i < this.count; i++) {
      this.value[i] = this.target[i]
      this.velocity[i] = 0
    }
    return false
  }
}

// One requestAnimationFrame loop for the whole page. Each system is a function
// (dt, now) => boolean that returns true while it still has motion to play.
export function createTicker() {
  const systems = []
  let running = false
  let last = 0
  let frames = 0

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
    last = now
    frames++
    let moving = false
    for (const system of systems) {
      if (system(dt, now)) moving = true
    }
    if (moving && !document.hidden) {
      requestAnimationFrame(frame)
    } else {
      running = false
    }
  }

  function wake() {
    if (running || document.hidden) return
    running = true
    last = performance.now() - 16
    requestAnimationFrame(frame)
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) wake()
  })

  return {
    add(system) {
      systems.push(system)
    },
    wake,
    get running() {
      return running
    },
    // Total frames drawn. The idle check in the tests reads this.
    get frames() {
      return frames
    },
  }
}
