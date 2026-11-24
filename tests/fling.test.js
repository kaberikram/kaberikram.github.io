import test from 'node:test'
import assert from 'node:assert/strict'

import { MAX_SPEED, glideStep, releaseVelocity, trimSamples } from '../app/js/core/fling.js'
import { createCamera } from '../app/js/core/camera.js'

// A hand moving at a steady speed, sampled unevenly the way a phone reports it.
function steady(vx, vy, { from = 0, until = 160, jitter = true } = {}) {
  const samples = []
  let t = from
  let i = 0
  while (t <= until) {
    samples.push({ t, x: 100 + (vx * t) / 1000, y: 300 + (vy * t) / 1000 })
    t += jitter ? [4, 12, 8, 16, 5][i++ % 5] : 8
  }
  return samples
}

test('the throw speed is the hand speed, even from uneven samples', () => {
  const samples = steady(1200, -400)
  const v = releaseVelocity(samples, samples.at(-1).t + 8)
  assert.ok(Math.abs(v.x - 1200) < 1, `x ${v.x}`)
  assert.ok(Math.abs(v.y + 400) < 1, `y ${v.y}`)
})

test('a hand that stopped before lifting throws nothing', () => {
  const samples = steady(1500, 0)
  assert.deepEqual(releaseVelocity(samples, samples.at(-1).t + 60), { x: 0, y: 0 })
})

test('one stray sample does not make a throw', () => {
  assert.deepEqual(releaseVelocity([{ t: 0, x: 0, y: 0 }], 5), { x: 0, y: 0 })
  assert.deepEqual(releaseVelocity([], 5), { x: 0, y: 0 })
})

test('a slow placement is not a throw, and a wild flick is capped', () => {
  const slow = steady(20, 0)
  assert.deepEqual(releaseVelocity(slow, slow.at(-1).t), { x: 0, y: 0 })
  const wild = steady(40000, 0)
  const v = releaseVelocity(wild, wild.at(-1).t)
  assert.ok(Math.abs(Math.hypot(v.x, v.y) - MAX_SPEED) < 1e-6)
})

test('only the last moments count: a turn at the end throws the new way', () => {
  const samples = [...steady(-2000, 0, { until: 300 })]
  const last = samples.at(-1)
  for (let t = 8; t <= 120; t += 8) samples.push({ t: last.t + t, x: last.x + 1.5 * t, y: last.y })
  const v = releaseVelocity(samples, samples.at(-1).t)
  assert.ok(Math.abs(v.x - 1500) < 1, `x ${v.x}`)
})

test('trimming keeps enough to fit', () => {
  const samples = steady(800, 0, { until: 2000, jitter: false })
  trimSamples(samples)
  assert.ok(samples.length < 40)
  assert.ok(samples.at(-1).t - samples[0].t >= 100)
})

test('a glide covers the same ground at 60 and 120 frames a second', () => {
  const run = (hz) => {
    let v = 1000
    let x = 0
    for (let i = 0; i < hz * 2; i++) {
      const g = glideStep(v, 1 / hz, 0.5)
      v = g.v
      x += g.travel
    }
    return x
  }
  assert.ok(Math.abs(run(60) - run(120)) < 1e-9)
  // It heads for speed times tau: 1000 * 0.5, nearly there after 2 s.
  assert.ok(Math.abs(run(60) - 500 * (1 - Math.exp(-4))) < 1e-9)
})

function leaningCamera() {
  const camera = createCamera({ perspective: 800 })
  camera.resize(390, 844)
  camera.jump({ x: 120, y: -60, z: -500 })
  camera.setRoom(3, -6, { immediate: true })
  camera.setPivot(-200, { immediate: true })
  for (let i = 0; i < 120; i++) camera.step(1 / 60)
  return camera
}

test('a held point stays under the finger while the board banks', () => {
  const camera = leaningCamera()
  camera.grab(100, 400, camera.pivot)
  const held = camera.screenToWorld(100, 400, camera.pivot)
  // A fast drag: the board leans into it, and the lean springs keep moving.
  for (let i = 1; i <= 40; i++) {
    const px = 100 + i * 6
    camera.drag(px, 400 + i * 2, 2400, 800)
    camera.step(1 / 120)
    const under = camera.worldToScreen(held.x, held.y, camera.pivot)
    assert.ok(Math.hypot(under.x - px, under.y - (400 + i * 2)) < 1e-6, `frame ${i}`)
  }
  assert.doesNotMatch(camera.transform(), /rotateX\(3\.000deg\) rotateY\(-6\.000deg\)/, 'the board leaned')
})

test('letting go carries on at the hand speed, then settles about v * tau on', () => {
  const camera = leaningCamera()
  camera.grab(200, 400)
  camera.step(1 / 60)
  const scale = camera.scaleAt(camera.pivot)
  const start = camera.x
  camera.release(-900, 0)
  assert.ok(camera.gliding)
  camera.step(1 / 120)
  // First step after release moves at the release speed (camera moves opposite the finger).
  const firstSpeed = ((camera.x - start) * scale) / (1 / 120)
  assert.ok(Math.abs(firstSpeed - 900) < 10, `speed ${firstSpeed}`)
  let frames = 0
  while (camera.step(1 / 60) && frames < 600) frames++
  assert.ok(!camera.gliding, 'the glide comes to rest')
  const travelled = (camera.x - start) * scale
  assert.ok(Math.abs(travelled - 900 * 0.5) < 15, `travelled ${travelled}`)
})

test('a finger landing on a gliding board stops it dead', () => {
  const camera = leaningCamera()
  camera.grab(200, 400)
  camera.release(1600, 0)
  camera.step(1 / 60)
  assert.equal(camera.stop(), true)
  const x = camera.x
  for (let i = 0; i < 30; i++) camera.step(1 / 60)
  assert.equal(camera.x, x)
  assert.equal(camera.stop(), false)
})

test('glide 0 turns throwing off; a flight cancels a glide', () => {
  const camera = leaningCamera()
  camera.setGlide(0)
  camera.grab(200, 400)
  camera.release(1600, 0)
  assert.equal(camera.gliding, false)
  camera.setGlide(500)
  camera.grab(200, 400)
  camera.release(1600, 0)
  camera.to({ x: 0, y: 0 })
  assert.equal(camera.gliding, false)
})
