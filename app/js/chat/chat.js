// The chat: what you say back to a visitor, from app/content/chat.md.
//
// No server and no LLM. Answers are written ahead of time; this only picks
// the closest one. Shared words decide at once. A small sentence model,
// started the first time someone opens the bar, judges by meaning once it is
// ready (a few seconds on a phone, then cached).

import { readScript } from './script.js'
import { CLOSE, SURE, confidence, createMatcher, judge, unpackVector } from './match.js'

const SCRIPT_URL = new URL('../../content/chat.md', import.meta.url)
const VECTORS_URL = new URL('../../content/chat-vectors.json', import.meta.url)
const WORKER_URL = new URL('./embed-worker.js', import.meta.url)

export { CLOSE, SURE }

function createEmbedder() {
  let worker = null
  let status = 'idle' // idle, loading, ready, off
  let ready = null
  let seq = 0
  const waiting = new Map()

  function start() {
    if (ready) return ready
    const saveData = navigator.connection && navigator.connection.saveData
    if (saveData || typeof Worker === 'undefined' || /[?&]nomodel\b/.test(location.search)) {
      status = 'off'
      ready = Promise.resolve(false)
      return ready
    }
    status = 'loading'
    ready = new Promise((resolve) => {
      try {
        worker = new Worker(WORKER_URL, { type: 'module' })
      } catch {
        status = 'off'
        resolve(false)
        return
      }
      worker.onmessage = ({ data }) => {
        if (data.type === 'ready') {
          status = 'ready'
          resolve(true)
        } else if (data.type === 'failed') {
          console.warn('chat: the sentence model did not load, matching by words only.', data.message)
          status = 'off'
          resolve(false)
        } else if (data.type === 'vectors') {
          const done = waiting.get(data.id)
          waiting.delete(data.id)
          if (!done) return
          if (data.error) return done(null)
          const out = []
          for (let i = 0; i < data.flat.length; i += data.dims) out.push(data.flat.subarray(i, i + data.dims))
          done(out)
        }
      }
      worker.onerror = (e) => {
        console.warn('chat: the sentence model stopped, matching by words only.', e.message)
        status = 'off'
        resolve(false)
        for (const done of waiting.values()) done(null)
        waiting.clear()
      }
      worker.postMessage({ type: 'load' })
    })
    return ready
  }

  function embed(texts) {
    if (status !== 'ready') return Promise.resolve(null)
    const id = ++seq
    return new Promise((resolve) => {
      waiting.set(id, resolve)
      worker.postMessage({ type: 'embed', id, texts })
    })
  }

  return {
    start,
    embed,
    get status() {
      return status
    },
  }
}

export async function loadChat() {
  const [scriptText, vectorsJson] = await Promise.all([
    fetch(SCRIPT_URL).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`chat.md ${r.status}`)))),
    fetch(VECTORS_URL).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ])
  return createChat(readScript(scriptText), vectorsJson)
}

export function createChat(script, vectorsJson, embedder = createEmbedder()) {
  const matcher = createMatcher(script)
  const vectors = new Map()
  for (const [text, packed] of Object.entries((vectorsJson && vectorsJson.vectors) || {})) vectors.set(text, unpackVector(packed))

  // Questions added since the vectors were last made: worked out here, once,
  // as soon as the model is ready.
  let filled = null
  function fill() {
    if (filled) return filled
    filled = embedder.start().then(async (ok) => {
      if (!ok) return false
      const missing = matcher.texts.filter((text) => !vectors.has(text))
      for (let i = 0; i < missing.length; i += 32) {
        const out = await embedder.embed(missing.slice(i, i + 32))
        if (!out) return false
        out.forEach((vec, j) => vectors.set(missing[i + j], vec))
      }
      return true
    })
    return filled
  }

  const lastAnswer = new Map()
  function pick(list, key) {
    if (!list.length) return ''
    if (list.length === 1) return list[0]
    let next
    do next = list[Math.floor(Math.random() * list.length)]
    while (next === lastAnswer.get(key))
    lastAnswer.set(key, next)
    return next
  }

  return {
    script,

    // Start the model downloading. Call when someone looks likely to talk.
    warm: fill,

    get thinking() {
      return embedder.status === 'loading'
    },

    // The best topics for some words. With wait (ms), holds on for the model
    // that long if it is still loading; otherwise judges by words alone.
    async hear(text, { wait = 0 } = {}) {
      const words = matcher.byWords(text)
      if (words[0] && words[0].score >= 0.999) return { ...words[0], via: 'words', runnerUp: null, level: 'sure' }
      let meaning = null
      if (embedder.status === 'loading' && wait > 0) {
        await Promise.race([fill(), new Promise((r) => setTimeout(r, wait))])
      }
      if (embedder.status === 'ready') {
        await fill()
        const out = await embedder.embed([text])
        if (out) meaning = matcher.byMeaning(out[0], (t) => vectors.get(t))
      }
      const all = judge(words, meaning)
      const top = all[0] || { topic: null, score: 0 }
      const runnerUp = all[1] || null
      const via = meaning && meaning[0] && meaning[0].topic === top.topic && meaning[0].score === top.score ? 'meaning' : 'words'
      return { ...top, via, runnerUp, level: confidence(top, runnerUp, { wordsOnly: via === 'words' }) }
    },

    answer(topic) {
      return pick(topic.answers, topic.name)
    },

    nothing() {
      return pick(script.nothing.answers.length ? script.nothing.answers : ["I haven't written an answer for that one yet."], script.nothing.name)
    },
  }
}
