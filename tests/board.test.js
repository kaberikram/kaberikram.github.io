import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { prepareContent } from '../app/js/content.js'
import { CARD, DEPTH, LAYOUTS, SEEN_FROM, asSeen, fan, shapeFor, worstOverlap } from '../app/js/board/layouts.js'
import {
  HOME,
  fromHash,
  hasFilter,
  sameView,
  sanitizeCommand,
  select,
  toHash,
  vocabOf,
} from '../app/js/brain/command.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const content = prepareContent(JSON.parse(readFileSync(`${root}app/content/content.json`, 'utf8')))
const works = content.works
const vocab = vocabOf(content)
const options = { seed: 7, spread: 1, depth: 1, kinds: content.kinds }
const byProud = [...works].sort((a, b) => a.proud - b.proud)

// ---- content ----------------------------------------------------------------

test('content: every work is complete enough to place and show', () => {
  assert.equal(works.length, 19)
  const ranks = works.map((work) => work.proud).sort((a, b) => a - b)
  assert.deepEqual(ranks, works.map((_, i) => i + 1), 'proud ranks are 1..n with no repeats')
  for (const work of works) {
    assert.ok(work.title && work.line, `${work.id} has a title and a line`)
    assert.ok(work.tags.includes(work.kind), `${work.id} is tagged with its own kind`)
    assert.equal(work.year == null, work.when == null, `${work.id}: year and when agree`)
  }
})

test('content: every cover image exists', () => {
  for (const work of works) {
    if (work.cover) assert.ok(existsSync(`${root}app/img/${work.cover}.jpg`), `${work.cover}.jpg`)
  }
})

test('content: no placeholder text reaches the page', () => {
  const text = JSON.stringify(content.works)
  assert.ok(!/TBC|soon/i.test(text))
})

test('content: bad data fails loudly', () => {
  assert.throws(() => prepareContent({ works: [{ id: 'a', kind: 'nope', proud: 1, tags: [] }], kinds: [] }))
  assert.throws(() => prepareContent({}))
})

// ---- arrangements -------------------------------------------------------------

const SHAPES = ['wide', 'square', 'tall']

const arrangements = {
  scatter: (shape = 'wide') => LAYOUTS.scatter(works, { ...options, shape }),
  grid: (shape = 'wide') => LAYOUTS.grid(byProud, { ...options, shape }),
  timeline: (shape = 'wide') => LAYOUTS.timeline(works, { ...options, shape }),
  stack: (shape = 'wide') => LAYOUTS.stack(byProud, { ...options, shape }),
  fan: (shape = 'wide') => fan(byProud.slice(0, 7), { ...options, shape }),
}

for (const [name, build] of Object.entries(arrangements)) {
  test(`${name}: places every card with finite numbers, the same way every time`, () => {
    for (const shape of SHAPES) {
      const a = build(shape)
      const b = build(shape)
      const expected = name === 'fan' ? 7 : works.length
      assert.equal(a.poses.size, expected)
      for (const [id, pose] of a.poses) {
        for (const key of ['x', 'y', 'z', 'r', 's', 'o']) {
          assert.ok(Number.isFinite(pose[key]), `${shape} ${id}.${key}`)
        }
        assert.deepEqual(pose, b.poses.get(id))
      }
      for (const key of ['x', 'y', 'w', 'h', 'z']) assert.ok(Number.isFinite(a.bounds[key]), `${shape} bounds.${key}`)
      assert.ok(a.bounds.w > CARD.w - 1 && a.bounds.h > CARD.h - 1)
    }
  })
}

// Scatter and fan have depth, so they are judged the way they are seen.
test('no arrangement lets one card cover another, on any screen shape', () => {
  for (const shape of SHAPES) {
    assert.equal(worstOverlap(asSeen(arrangements.scatter(shape).poses.values(), SEEN_FROM.scatter)), 0, `scatter ${shape}`)
    assert.equal(worstOverlap(arrangements.grid(shape).poses.values()), 0, `grid ${shape}`)
    assert.equal(worstOverlap(arrangements.timeline(shape).poses.values()), 0, `timeline ${shape}`)
    assert.equal(worstOverlap(asSeen(arrangements.fan(shape).poses.values(), SEEN_FROM.fan)), 0, `fan ${shape}`)
  }
})

test('the home board suits the screen it is on', () => {
  const wide = arrangements.scatter('wide').bounds
  const tall = arrangements.scatter('tall').bounds
  assert.ok(wide.w / wide.h > 1.7, 'a band on a desktop')
  assert.ok(tall.h / tall.w > 1.7, 'a column on a phone')
  // On a 1440 x 900 desktop the whole board fits with cards at a readable size.
  const scale = Math.min((1440 * 0.92) / wide.w, (732 * 0.92) / wide.h)
  assert.ok(CARD.w * scale > 120, `cards would be ${Math.round(CARD.w * scale)}px wide`)
  assert.equal(shapeFor(1440, 732), 'wide')
  assert.equal(shapeFor(900, 800), 'square')
  assert.equal(shapeFor(390, 676), 'tall')
})

test('scatter: depth runs evenly from the proudest work to the least', () => {
  const { poses } = arrangements.scatter()
  const depths = byProud.map((work) => poses.get(work.id).z)
  assert.equal(depths[0], DEPTH.near)
  assert.equal(depths[depths.length - 1], DEPTH.far)
  for (let i = 1; i < depths.length; i++) assert.ok(depths[i] < depths[i - 1], 'each rank sits further back')
  // Real space: every card is the same size. Distance alone makes it look small.
  for (const pose of poses.values()) assert.equal(pose.s, 1)
  const seen = asSeen([poses.get(byProud[0].id), poses.get(byProud[byProud.length - 1].id)], SEEN_FROM.scatter)
  assert.ok(seen[0].s > seen[1].s * 1.8, 'the nearest looks about twice the size of the farthest')
})

test('the depth setting stretches the space', () => {
  const deep = LAYOUTS.scatter(works, { ...options, depth: 2 }).poses
  assert.equal(deep.get(byProud[byProud.length - 1].id).z, DEPTH.far * 2)
})

test('scatter: one label per kind of work, and it is centred on the origin', () => {
  const { labels, bounds } = arrangements.scatter()
  assert.equal(labels.length, content.kinds.length)
  assert.ok(Math.abs(bounds.x + bounds.w / 2) < 1e-6)
  // Vertically the bounds carry extra room above for the labels.
  assert.ok(Math.abs(bounds.y + bounds.h / 2) < 40)
})

test('spacing setting spreads the board out', () => {
  const tight = LAYOUTS.scatter(works, { ...options, spread: 1 }).bounds
  const loose = LAYOUTS.scatter(works, { ...options, spread: 1.6 }).bounds
  assert.ok(loose.w > tight.w && loose.h > tight.h)
})

test('timeline: runs left to right by date, undated works last', () => {
  const { poses, labels } = arrangements.timeline()
  const dated = works.filter((work) => work.year != null).sort((a, b) => a.year - b.year)
  const undated = works.filter((work) => work.year == null)
  const oldest = poses.get(dated[0].id)
  const newest = poses.get(dated[dated.length - 1].id)
  assert.ok(oldest.x < newest.x)
  for (const work of undated) assert.ok(poses.get(work.id).x > newest.x, `${work.id} sits after the dated works`)
  assert.equal(labels[labels.length - 1].text, 'undated')
})

test('stack: proudest on top', () => {
  const { poses } = arrangements.stack()
  assert.ok(poses.get(byProud[0].id).z > poses.get(byProud[1].id).z)
})

test('arrangements respect the origin they are given', () => {
  const origin = { x: 900, y: -300 }
  for (const build of [fan, LAYOUTS.grid, LAYOUTS.scatter, LAYOUTS.timeline]) {
    const b = build(byProud.slice(0, 4), { ...options, origin }).bounds
    assert.ok(Math.abs(b.x + b.w / 2 - origin.x) < 40)
    assert.ok(Math.abs(b.y + b.h / 2 - origin.y) < 60)
  }
})

test('empty input does not throw', () => {
  for (const build of [LAYOUTS.scatter, LAYOUTS.grid, LAYOUTS.timeline, LAYOUTS.stack, fan]) {
    assert.equal(build([], options).poses.size, 0)
  }
})

// ---- commands -----------------------------------------------------------------

test('command: unknown values are dropped, valid ones kept', () => {
  const cmd = sanitizeCommand({
    layout: 'sideways',
    kind: 'ar',
    tags: ['Reel', 'reel', 'nonsense', 42],
    years: ['2026', 2024],
    sort: 'recent',
    limit: '3',
    focus: 'IH0204',
    extra: '<script>',
  }, vocab)
  assert.deepEqual(cmd, {
    layout: 'scatter',
    kind: 'ar',
    tags: ['reel'],
    years: [2024, 2026],
    sort: 'recent',
    limit: 3,
    focus: 'IH0204',
  })
  assert.deepEqual(sanitizeCommand(null, vocab), { ...HOME, tags: [] })
  assert.equal(sanitizeCommand({ focus: 'IH9999' }, vocab).focus, null)
  assert.equal(sanitizeCommand({ limit: -2 }, vocab).limit, null)
})

test('command: survives a trip through the URL', () => {
  const cases = [
    {},
    { layout: 'grid' },
    { kind: 'web', sort: 'recent', limit: 5 },
    { tags: ['game', 'web'], years: [2025, 2026], layout: 'timeline' },
    { focus: 'IH0306' },
    { tags: ['google maps'], focus: 'IH0101' },
  ]
  for (const raw of cases) {
    const cmd = sanitizeCommand(raw, vocab)
    assert.deepEqual(fromHash(toHash(cmd), vocab), cmd)
  }
  assert.equal(toHash(sanitizeCommand({}, vocab)), '')
  assert.deepEqual(fromHash('#garbage&&=x&k=', vocab), { ...HOME, tags: [] })
  assert.deepEqual(fromHash('#w=%E0%A4%A', vocab), { ...HOME, tags: [] })
})

test('command: select filters and orders', () => {
  const ar = select(works, sanitizeCommand({ kind: 'ar' }, vocab))
  assert.deepEqual(ar.map((work) => work.id), ['IH0103', 'IH0101', 'IH0102'])

  const recent = select(works, sanitizeCommand({ sort: 'recent', limit: 3 }, vocab))
  assert.deepEqual(recent.map((work) => work.id), ['IH0204', 'IH0309', 'IH0203'])

  const oldest = select(works, sanitizeCommand({ sort: 'oldest' }, vocab))
  assert.equal(oldest[0].id, 'IH0301')
  assert.equal(oldest[oldest.length - 1].year, null, 'undated works come last')

  const games = select(works, sanitizeCommand({ tags: ['game'] }, vocab))
  assert.deepEqual(games.map((work) => work.id).sort(), ['IH0201', 'IH0308'])

  const y2025 = select(works, sanitizeCommand({ years: [2025, 2025] }, vocab))
  assert.ok(y2025.length === 3 && y2025.every((work) => work.year === 2025))
})

test('command: focus alone does not count as a different view', () => {
  const a = sanitizeCommand({ kind: 'ar' }, vocab)
  const b = sanitizeCommand({ kind: 'ar', focus: 'IH0102' }, vocab)
  assert.ok(sameView(a, b))
  assert.ok(!sameView(a, sanitizeCommand({ kind: 'xr' }, vocab)))
  assert.ok(hasFilter(a))
  assert.ok(!hasFilter(sanitizeCommand({ layout: 'grid', sort: 'recent' }, vocab)))
})
