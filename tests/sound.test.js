import { test } from 'node:test'
import assert from 'node:assert/strict'

import { distanceGain, flightShape, panFor } from '../app/js/sound/mix.js'
import { VOICES } from '../app/js/sound/voices.js'

test('a still or drifting camera makes no whoosh', () => {
  assert.equal(flightShape(0, 0).level, 0)
  assert.equal(flightShape(120, 0).level, 0)
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
