// Which topic a visitor's words are closest to. Two ways of judging, and the
// higher wins:
//
//   words    shared words, rare ones counting more. Instant, needs nothing
//            loaded, and exact for the suggested questions.
//   meaning  a small sentence model running in the browser turns text into a
//            vector; close vectors mean close meaning, whatever the words.
//            ("where do you live" finds "where are you based".)
//
// Pure functions, so tests import this file in Node.

import { normalize } from './script.js'

// Above SURE the chat answers even if the words also read as a board request.
// Between CLOSE and SURE it answers when the board has nothing better to do.
export const SURE = 0.72
export const CLOSE = 0.55

const EMPTY = new Set(['a', 'an', 'the', 'to', 'of', 'please', 'so', 'just', 'um', 'uh', 'ok', 'okay'])

function stem(word) {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3)
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

export function tokens(text) {
  return normalize(text).split(' ').filter((w) => w && !EMPTY.has(w)).map(stem)
}

export function createMatcher(script) {
  const variants = []
  for (const topic of script.topics) {
    for (const question of topic.questions) {
      variants.push({ topic, text: normalize(question), words: new Set(tokens(question)) })
    }
  }

  const df = new Map()
  for (const v of variants) for (const w of v.words) df.set(w, (df.get(w) || 0) + 1)
  const n = variants.length
  const weight = (w) => Math.log(1 + n / (df.get(w) || 0.5))
  for (const v of variants) v.norm = Math.sqrt([...v.words].reduce((s, w) => s + weight(w) ** 2, 0))

  function best(scored) {
    const top = new Map()
    for (const { topic, score } of scored) {
      if (!top.has(topic) || top.get(topic) < score) top.set(topic, score)
    }
    return [...top].map(([topic, score]) => ({ topic, score })).sort((a, b) => b.score - a.score)
  }

  return {
    variants,

    // Every distinct question text, for embedding.
    texts: [...new Set(variants.map((v) => v.text))],

    byWords(query) {
      const text = normalize(query)
      const words = new Set(tokens(query))
      if (!words.size) return []
      const qNorm = Math.sqrt([...words].reduce((s, w) => s + weight(w) ** 2, 0))
      return best(variants.map((v) => {
        if (v.text === text) return { topic: v.topic, score: 1 }
        let dot = 0
        for (const w of words) if (v.words.has(w)) dot += weight(w) ** 2
        return { topic: v.topic, score: v.norm && qNorm ? dot / (v.norm * qNorm) : 0 }
      }))
    },

    // vectorOf(text) gives a unit vector for a question, or nothing if it has
    // not been worked out yet.
    byMeaning(queryVector, vectorOf) {
      return best(variants.flatMap((v) => {
        const vec = vectorOf(v.text)
        return vec ? [{ topic: v.topic, score: dot(queryVector, vec) }] : []
      }))
    },
  }
}

export function dot(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

// Both judgements together: for each topic the better score, best first.
// Once meaning is known, shared words only count when they are near-exact:
// a few common words in common ("tell me about ...") say little.
export function judge(words, meaning) {
  if (!meaning) return combine(words)
  return combine(meaning, (words || []).filter((w) => w.score >= 0.85))
}

// How sure a heard result is. Two topics neck and neck below SURE means it
// could be either, which is as good as neither.
// Shared words alone are only sure when nearly all of them are shared.
export function confidence(top, runnerUp, { wordsOnly = false } = {}) {
  if (!top || !top.topic) return 'none'
  if (top.score >= (wordsOnly ? 0.85 : SURE)) return 'sure'
  if (top.score < CLOSE) return 'none'
  if (runnerUp && top.score < 0.62 && top.score - runnerUp.score < 0.03) return 'none'
  return 'close'
}

export function combine(...lists) {
  const top = new Map()
  for (const list of lists) {
    for (const { topic, score } of list || []) {
      if (!top.has(topic) || top.get(topic) < score) top.set(topic, score)
    }
  }
  return [...top].map(([topic, score]) => ({ topic, score })).sort((a, b) => b.score - a.score)
}

// Precomputed vectors are stored as int8, base64: small, and plenty precise
// for comparing unit vectors.
export function packVector(vec) {
  const bytes = new Int8Array(vec.length)
  for (let i = 0; i < vec.length; i++) bytes[i] = Math.max(-127, Math.min(127, Math.round(vec[i] * 127)))
  let bin = ''
  for (const b of new Uint8Array(bytes.buffer)) bin += String.fromCharCode(b)
  return btoa(bin)
}

export function unpackVector(text) {
  const bin = atob(text)
  const out = new Float32Array(bin.length)
  let sum = 0
  for (let i = 0; i < bin.length; i++) {
    const b = bin.charCodeAt(i)
    out[i] = (b > 127 ? b - 256 : b) / 127
    sum += out[i] * out[i]
  }
  const len = Math.sqrt(sum) || 1
  for (let i = 0; i < out.length; i++) out[i] /= len
  return out
}
