import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { prepareContent } from '../app/js/content.js'
import { SUGGESTIONS, describe, parse } from '../app/js/brain/parse.js'
import { sanitizeCommand, select, vocabOf } from '../app/js/brain/command.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const content = prepareContent(JSON.parse(readFileSync(`${root}app/content/content.json`, 'utf8')))
const vocab = vocabOf(content)

// text -> the parts of the Command that must come out. Anything not listed is not checked.
const CASES = [
  ['show me your proudest work', { sort: 'proud', limit: 5, focus: 'first' }],
  ['Show me your best stuff', { sort: 'proud' }],
  ["what's most recent?", { sort: 'recent', focus: 'first' }],
  ['latest', { sort: 'recent' }],
  ['top 3 AR', { sort: 'proud', kind: 'ar', limit: 3 }],
  ['just the AR work', { kind: 'ar', focus: null }],
  ['mixed reality', { kind: 'xr' }],
  ['quest games', { kind: 'xr', tags: ['game'] }],
  ['anything for the web in 2026', { kind: 'web', years: [2026, 2026] }],
  ['everything by year', { layout: 'timeline' }],
  ['the timeline please', { layout: 'timeline' }],
  ['grid', { layout: 'grid' }],
  ['pile it up', { layout: 'stack' }],
  ['show everything', { layout: 'scatter', kind: null }],
  ['spectacles', { tags: ['spectacles'] }],
  ['volta', { focus: 'IH0309' }],
  ['Reality to bend', { focus: 'IH0204' }],
  ['dreampop', { focus: 'IH0201' }],
  ['MOMNTS', { focus: 'IH0202' }],
]

for (const [text, expected] of CASES) {
  test(`parse: "${text}"`, () => {
    const result = parse(text, content)
    assert.ok(result.understood, 'understood')
    const command = sanitizeCommand(result.command, vocab)
    for (const [key, value] of Object.entries(expected)) assert.deepEqual(command[key], value, key)
  })
}

test('parse: panels', () => {
  for (const [text, panel] of [['who are you?', 'about'], ['tell me about yourself', 'about'], ['how do I reach you?', 'contact'], ['contact', 'contact'], ['email', 'contact']]) {
    const result = parse(text, content)
    assert.equal(result.panel, panel, text)
    assert.equal(result.boardChange, false, `${text} leaves the board alone`)
  }
})

test('parse: chat and nonsense are not mistaken for requests', () => {
  for (const text of ['', '   ', 'hello there', 'xyzzy', 'how are you doing today']) {
    const result = parse(text, content)
    assert.equal(result.understood, false, `"${text}"`)
    assert.equal(result.boardChange, false)
  }
})

test('parse: every suggestion chip does something', () => {
  for (const text of SUGGESTIONS) {
    const result = parse(text, content)
    assert.ok(result.understood, text)
    assert.ok(describe(result, content).length > 4, text)
  }
})

test('parse: understood words are located exactly, for the underline', () => {
  const text = 'show me your proudest AR work'
  const { found } = parse(text, content)
  assert.deepEqual(found.map((item) => text.slice(item.start, item.end)), ['proudest', 'AR'])
})

test('parse: a work is only named by a word that names one work', () => {
  assert.equal(parse('reel', content).command.focus, null, '"reel" is shared by two works')
  assert.deepEqual(parse('reel', content).command.tags, ['reel'])
})

test('parse: never produces a Command that selects nothing for these asks', () => {
  for (const [text] of CASES) {
    const command = sanitizeCommand(parse(text, content).command, vocab)
    assert.ok(select(content.works, command).length > 0, text)
  }
})

test('describe: speaks as the owner and counts honestly', () => {
  assert.equal(describe(parse('top 3 AR', content), content), 'Showing my proudest AR / Lenses work, top 3')
  assert.equal(describe(parse('just the AR work', content), content), 'Showing my AR / Lenses work, 3 pieces')
  assert.equal(describe(parse('volta', content), content), 'Going to Volta')
  assert.equal(describe(parse('everything by year', content), content), 'Showing my work, all of it, 19 pieces, as a timeline')
})
