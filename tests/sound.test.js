import { test } from 'node:test'
import assert from 'node:assert/strict'

import { FLIGHT_FILTER, createFlightTracker, distanceGain, flightShape, panFor } from '../app/js/sound/mix.js'
import { VOICES } from '../app/js/sound/voices.js'

test('a still or drifting camera makes no whoosh', () => {
  assert.equal(flightShape(0, 0).level, 0)
  assert.equal(flightShape(120, 0).level, 0)
})

test('the flight filter never opens into hiss', () => {
  for (const [side, fwd] of [[0, 0], [500, 0], [3000, 0], [1e6, 1e6], [0, 1e6], [0, -1e6]]) {
    const { freq } = flightShape(side, fwd)
    assert.ok(freq >= FLIGHT_FILTER.min && freq <= FLIGHT_FILTER.max, `${freq} Hz`)
  }
  assert.ok(FLIGHT_FILTER.max <= 2000)
})

function fly(profile, seconds) {
  const step = createFlightTracker()
  const events = []
  let loudest = 0
  for (let i = 0; i < seconds * 60; i++) {
    const [side, fwd] = profile(i / 60)
    const r = step(flightShape(side, fwd).level, 1 / 60)
    loudest = Math.max(loudest, r.level)
    events.push(...r.events)
  }
  return { events, loudest }
}

test('a long flight has one impact and one landing; a short hop and a drift have neither', () => {
  const long = fly((t) => { const k = Math.sin(Math.min(1, t / 1.6) * Math.PI); return [k * 3800, k * 2600] }, 3.5)
  assert.deepEqual(long.events, ['impact', 'land'])
  const hop = fly((t) => [Math.sin(Math.min(1, t / 0.6) * Math.PI) * 900, 0], 2)
  assert.deepEqual(hop.events, [])
  assert.ok(hop.loudest > 0.05, 'a hop is still faintly heard')
  const drift = fly(() => [150, 0], 2)
  assert.deepEqual(drift.events, [])
  assert.equal(drift.loudest, 0)
})

test('the flight swells in and eases out instead of jumping', () => {
  const step = createFlightTracker()
  const first = step(1, 1 / 60).level
  assert.ok(first < 0.1, `one frame in it is only at ${first.toFixed(3)}`)
  let level = first
  for (let i = 0; i < 15; i++) level = step(1, 1 / 60).level
  assert.ok(level > 0.5 && level < 0.8, 'about two thirds there after a quarter second')
  const before = level
  level = step(0, 1 / 60).level
  assert.ok(before - level < 0.05, 'and it lets go slowly')
})

test('the whoosh grows with speed and stays in range', () => {
  const slow = flightShape(800, 0)
  const fast = flightShape(2600, 0)
  assert.ok(fast.level > slow.level && slow.level > 0)
  assert.ok(flightShape(1e6, 0).level <= 1)
  assert.ok(fast.freq > slow.freq)
})

test('flying in sounds brighter than flying back', () => {
  assert.ok(flightShape(0, 1500).freq > flightShape(0, -1500).freq)
})

test('sounds sit left to right with where they are on screen', () => {
  assert.equal(panFor(720, 1440), 0)
  assert.ok(panFor(100, 1440) < -0.5)
  assert.ok(panFor(1400, 1440) > 0.5)
  assert.equal(panFor(-500, 1440), -0.8, 'never hard left')
  assert.equal(panFor(undefined, 1440), 0)
})

test('distance quiets a sound but never to silence', () => {
  assert.equal(distanceGain(300), 1)
  assert.ok(distanceGain(1200) < distanceGain(700))
  assert.equal(distanceGain(1e6), 0.3)
})

test('every cue the page sends has a voice', () => {
  for (const name of ['focus', 'close', 'type', 'understood', 'confirm', 'unsure', 'shape', 'deal', 'lift', 'drop']) {
    assert.equal(typeof VOICES[name], 'function', name)
  }
})
