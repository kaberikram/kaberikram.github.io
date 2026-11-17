import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { prepareContent } from '../app/js/content.js'
import { parse } from '../app/js/brain/parse.js'
import { answerHtml, normalize, readScript } from '../app/js/chat/script.js'
import { confidence, createMatcher, judge, packVector, unpackVector } from '../app/js/chat/match.js'
import { createChat } from '../app/js/chat/chat.js'
import { escapeHtml } from '../app/js/util.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const content = prepareContent(JSON.parse(readFileSync(`${root}app/content/content.json`, 'utf8')))
const script = readScript(readFileSync(`${root}app/content/chat.md`, 'utf8'))
const matcher = createMatcher(script)

// No model in Node: answers by shared words only, as a visitor's browser does
// before the sentence model has loaded (or when it cannot).
const offline = { status: 'off', start: async () => false, embed: async () => null }
const chat = createChat(script, null, offline)
const heard = (text) => chat.hear(text)

test('chat.md: topics read, each with questions and answers', () => {
  assert.ok(script.topics.length >= 15)
  for (const topic of script.topics) {
    assert.ok(topic.questions.length > 0, topic.name)
    assert.ok(topic.answers.length > 0, topic.name)
  }
  assert.ok(script.nothing.answers.length > 0, 'something to say when nothing fits')
  assert.ok(script.start.next.length > 0, 'suggestions before anyone has asked')
  assert.ok(!script.topics.some((t) => t.name.includes('a name for the topic')), 'the indented example is not read')
})

test('chat.md: no question is claimed by two topics', () => {
  const owner = new Map()
  for (const topic of script.topics) {
    for (const q of topic.questions) {
      const key = normalize(q)
      assert.ok(!owner.has(key) || owner.get(key) === topic.name, `"${q}" is in both "${owner.get(key)}" and "${topic.name}"`)
      owner.set(key, topic.name)
    }
  }
})

test('chat.md: every Show line is something the board understands', () => {
  for (const topic of script.topics.filter((t) => t.show)) {
    const result = parse(topic.show, content)
    assert.ok(result.understood && result.boardChange, `${topic.name}: "${topic.show}"`)
  }
})

test('chat.md: every suggested question is answered at once, by words alone', async () => {
  const offered = new Set([...script.start.next, ...script.nothing.next, ...script.topics.flatMap((t) => t.next)])
  for (const text of offered) {
    const h = await heard(text)
    const board = parse(text, content)
    assert.ok(h.level === 'sure' || board.understood, `"${text}" has an answer or moves the board`)
  }
})

test('chat: plain rewordings are answered without the model', async () => {
  for (const [text, topic] of [
    ['Hello!', 'hello'],
    ['Who are you?', 'who'],
    ["What's your email?", 'contact'],
    ['where do u live', 'where'],
    ['Are you real?', 'this chat'],
    ['do you know react', 'tools'],
  ]) {
    const h = await heard(text)
    assert.equal(h.topic && h.topic.name, topic, text)
    assert.notEqual(h.level, 'none', text)
  }
})

test('chat: things it was never told get nothing, not a wrong answer', async () => {
  for (const text of ['what is the capital of france', 'recipe for nasi lemak', 'xyzzy', '']) {
    assert.equal((await heard(text)).level, 'none', text)
  }
})

test('normalize: contractions and shorthand', () => {
  assert.equal(normalize("What's your name?"), 'what is your name')
  assert.equal(normalize('where do u live'), 'where do you live')
  assert.equal(normalize("I'm sure you're fine, don't worry"), 'i am sure you are fine do not worry')
  assert.equal(normalize('three.js'), 'three.js')
})

test('confidence: close calls between two topics count as neither', () => {
  const a = { name: 'a' }
  const b = { name: 'b' }
  assert.equal(confidence({ topic: a, score: 0.8 }, { topic: b, score: 0.79 }), 'sure')
  assert.equal(confidence({ topic: a, score: 0.58 }, { topic: b, score: 0.57 }), 'none')
  assert.equal(confidence({ topic: a, score: 0.65 }, { topic: b, score: 0.3 }), 'close')
  assert.equal(confidence({ topic: a, score: 0.78 }, null, { wordsOnly: true }), 'close')
  assert.equal(judge([{ topic: a, score: 0.6 }], [{ topic: b, score: 0.7 }])[0].topic, b, 'loose word overlap does not outvote meaning')
})

test('vectors: packed small and unpacked close to the original', () => {
  const vec = Array.from({ length: 384 }, (_, i) => Math.sin(i * 0.37))
  const len = Math.hypot(...vec)
  const unit = vec.map((v) => v / len)
  const back = unpackVector(packVector(unit))
  const dot = unit.reduce((s, v, i) => s + v * back[i], 0)
  assert.ok(dot > 0.999, `round trip keeps the direction (${dot})`)
})

test('vectors: the precomputed file covers the questions', () => {
  const file = JSON.parse(readFileSync(`${root}app/content/chat-vectors.json`, 'utf8'))
  const missing = matcher.texts.filter((t) => !(t in file.vectors))
  // Not a failure: the browser embeds missing ones itself. Just a nudge.
  if (missing.length) console.log(`  note: ${missing.length} question(s) not in chat-vectors.json yet; run node tools/embed-chat.mjs`)
  assert.ok(Object.keys(file.vectors).length > 0)
})

test('answers: links become links, everything else stays text', () => {
  assert.equal(
    answerHtml('Write to [me](mailto:a@b.c) <b>now</b>', escapeHtml),
    'Write to <a href="mailto:a@b.c">me</a> &lt;b&gt;now&lt;/b&gt;',
  )
  assert.ok(!answerHtml('[x](javascript:alert(1))', escapeHtml).includes('<a'), 'only web, mail and site links')
  assert.ok(answerHtml('[site](https://a.b)', escapeHtml).includes('target="_blank" rel="noopener"'))
})
