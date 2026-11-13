import { test } from 'node:test'
import assert from 'node:assert/strict'

import { Springs } from '../app/js/core/spring.js'
import { MAX_SCALE, MIN_SCALE, createCamera } from '../app/js/core/camera.js'
import { hashString, rng } from '../app/js/util.js'

test('a spring reaches its target and stops', () => {
  const sp = new Springs(2, { stiffness: 130, damping: 19 })
  sp.to(0, 500)
  sp.to(1, -40)
  let frames = 0
  while (sp.step(1 / 60) && frames < 600) frames++
  assert.ok(frames < 240, `took ${frames} frames to settle`)
  assert.equal(sp.value[0], 500)
  assert.equal(sp.value[1], -40)
  assert.equal(sp.velocity[0], 0)
})

test('a spring stays stable through a long frame', () => {
  const sp = new Springs(1, { stiffness: 400, damping: 10 })
  sp.to(0, 100)
  for (let i = 0; i < 200; i++) sp.step(0.05)
  assert.ok(Number.isFinite(sp.value[0]))
  assert.ok(Math.abs(sp.value[0] - 100) < 1)
})

test('set() moves a spring with no motion', () => {
  const sp = new Springs(1)
  sp.set(0, 42)
  assert.equal(sp.step(1 / 60), false)
  assert.equal(sp.value[0], 42)
})

test('the seeded generator repeats exactly', () => {
  const a = rng(7)
  const b = rng(7)
  for (let i = 0; i < 20; i++) assert.equal(a(), b())
  assert.notEqual(hashString('IH0204'), hashString('IH0203'))
})

test('screen and world positions round-trip at any depth', () => {
  const camera = createCamera({ perspective: 1100 })
  camera.resize(1440, 900)
  camera.jump({ x: 320, y: -140, z: -600 })
  for (const depth of [-240, 0, 230]) {
    const world = camera.screenToWorld(1000, 200, depth)
    const screen = camera.worldToScreen(world.x, world.y, depth)
    assert.ok(Math.abs(screen.x - 1000) < 1e-6)
    assert.ok(Math.abs(screen.y - 200) < 1e-6)
  }
})

test('the round trip stays exact while the camera leans', () => {
  const camera = createCamera({ perspective: 1100 })
  camera.resize(1440, 900)
  camera.jump({ x: -200, y: 90, z: -700 })
  camera.tiltTo(2.5, -3)
  for (let i = 0; i < 300; i++) camera.step(1 / 60)
  assert.match(camera.transform(), /rotateX\(2\.500deg\) rotateY\(-3\.000deg\)/)
  for (const depth of [-240, 0, 380]) {
    for (const [px, py] of [[100, 80], [720, 450], [1300, 820]]) {
      const world = camera.screenToWorld(px, py, depth)
      const screen = camera.worldToScreen(world.x, world.y, depth)
      assert.ok(Math.abs(screen.x - px) < 1e-6 && Math.abs(screen.y - py) < 1e-6)
    }
  }
  // Leaning moves things: the same world point lands elsewhere than when level.
  const leaning = camera.worldToScreen(400, 0, 0)
  camera.tiltTo(0, 0)
  for (let i = 0; i < 300; i++) camera.step(1 / 60)
  const level = camera.worldToScreen(400, 0, 0)
  assert.ok(Math.abs(leaning.x - level.x) > 1)
})

test('nearer things look bigger', () => {
  const camera = createCamera({ perspective: 1100 })
  camera.jump({ z: -400 })
  assert.ok(camera.scaleAt(120) > camera.scaleAt(0))
  assert.ok(camera.scaleAt(0) > camera.scaleAt(-240))
})

test('fit() frames a rectangle inside the free area', () => {
  const camera = createCamera({ perspective: 1100 })
  camera.resize(1440, 900)
  const rect = { x: -1200, y: -700, w: 2400, h: 1400 }
  const inset = { top: 64, bottom: 104 }
  const cam = camera.fit(rect, { inset, pad: 0.9 })
  camera.jump(cam)
  const topLeft = camera.worldToScreen(rect.x, rect.y, 0)
  const bottomRight = camera.worldToScreen(rect.x + rect.w, rect.y + rect.h, 0)
  assert.ok(topLeft.x >= 0 && bottomRight.x <= 1440)
  assert.ok(topLeft.y >= inset.top - 1 && bottomRight.y <= 900 - inset.bottom + 1)
  // Centred in the free area, not in the whole screen.
  const midY = (topLeft.y + bottomRight.y) / 2
  assert.ok(Math.abs(midY - (64 + (900 - 64 - 104) / 2)) < 1)
})

test('fit() reports when the view had to be clamped', () => {
  const camera = createCamera({ perspective: 1100 })
  camera.resize(390, 844)
  const cam = camera.fit({ x: 0, y: 0, w: 6000, h: 4000 }, { minScale: 0.43 })
  assert.equal(cam.clamped, true)
  assert.ok(Math.abs(cam.scale - 0.43) < 1e-9)
})

test('travelling in depth follows the ray under the pointer', () => {
  const camera = createCamera({ perspective: 800 })
  camera.resize(1440, 900)
  camera.setRange(-4000, 3000)
  camera.jump({ x: 0, y: 0, z: -800 })
  // Whatever sits under the pointer, at any depth, stays under it.
  const near = camera.screenToWorld(1100, 300, 200)
  const far = camera.screenToWorld(1100, 300, -900)
  camera.dolly(1100, 300, 500, { immediate: true })
  assert.equal(camera.z, -300)
  for (const [point, depth] of [[near, 200], [far, -900]]) {
    const screen = camera.worldToScreen(point.x, point.y, depth)
    assert.ok(Math.abs(screen.x - 1100) < 1e-6 && Math.abs(screen.y - 300) < 1e-6)
  }
})

test('the camera stays inside its travel range, and can pass what it looks at', () => {
  const camera = createCamera({ perspective: 800 })
  camera.resize(1440, 900)
  camera.setRange(-3000, 1500)
  camera.setPivot(-400, { immediate: true })
  camera.jump({ z: -800 })
  for (let i = 0; i < 60; i++) camera.zoomAt(700, 400, 1.5, { immediate: true })
  assert.equal(camera.z, 1500, 'flies on past the pivot depth to the far limit')
  for (let i = 0; i < 60; i++) camera.zoomAt(700, 400, 0.5, { immediate: true })
  assert.equal(camera.z, -3000)
  assert.ok(camera.distanceTo(-400) > 0)
})

test('the lean turns about what the camera is looking at', () => {
  const camera = createCamera({ perspective: 800 })
  camera.resize(1440, 900)
  camera.jump({ x: 0, y: 0, z: -800 })
  camera.setPivot(-300, { immediate: true })
  const level = { pivot: camera.worldToScreen(0, 0, -300), near: camera.worldToScreen(0, 0, 250), far: camera.worldToScreen(0, 0, -1100) }
  camera.tiltTo(0, 5)
  for (let i = 0; i < 300; i++) camera.step(1 / 60)
  const leaning = { pivot: camera.worldToScreen(0, 0, -300), near: camera.worldToScreen(0, 0, 250), far: camera.worldToScreen(0, 0, -1100) }
  assert.ok(Math.abs(leaning.pivot.x - level.pivot.x) < 1e-6, 'the pivot depth does not move')
  // Near and far slide opposite ways: that is the parallax.
  assert.ok((leaning.near.x - level.near.x) * (leaning.far.x - level.far.x) < 0)
  assert.ok(Math.abs(leaning.near.x - level.near.x) > 10)
})

test('a long flight pulls back before it pushes in', () => {
  const camera = createCamera({ perspective: 800 })
  camera.resize(1440, 900)
  camera.setRange(-4000, 3000)
  camera.jump({ x: 0, y: 0, z: -200 })
  camera.to({ x: 2600, y: 0, z: 0 }, { arc: true })
  let lowest = Infinity
  let frames = 0
  while (camera.step(1 / 60) && frames++ < 900) lowest = Math.min(lowest, camera.z)
  assert.ok(lowest < -350, `pulled back to ${lowest.toFixed(0)}`)
  assert.equal(camera.z, 0)
  assert.equal(camera.x, 2600)
  // A short hop does not arc.
  camera.to({ x: 2700, z: 100 }, { arc: true })
  lowest = Infinity
  while (camera.step(1 / 60)) lowest = Math.min(lowest, camera.z)
  assert.ok(lowest >= -1)
})
