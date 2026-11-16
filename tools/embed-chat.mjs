// Works out the meaning vector of every question in app/content/chat.md, so a
// visitor's browser only has to embed what they type.
//
//   npm i --no-save @huggingface/transformers@4.3.2   (once)
//   node tools/embed-chat.mjs
//
// Optional: --models <dir> to read the model from a local folder laid out
// like Hugging Face (<dir>/Xenova/all-MiniLM-L6-v2/...) instead of downloading.
//
// Skipping this is safe: questions without a vector are embedded in the
// browser once the model has loaded. It only makes the first answer quicker.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { readScript } from '../app/js/chat/script.js'
import { createMatcher, packVector } from '../app/js/chat/match.js'

const MODEL = 'Xenova/all-MiniLM-L6-v2'
const root = fileURLToPath(new URL('..', import.meta.url))
const out = `${root}app/content/chat-vectors.json`

let lib
try {
  lib = await import('@huggingface/transformers')
} catch {
  console.error('Needs the model library once:  npm i --no-save @huggingface/transformers@4.3.2')
  process.exit(1)
}

const at = process.argv.indexOf('--models')
if (at > 0) {
  lib.env.allowRemoteModels = false
  lib.env.localModelPath = process.argv[at + 1]
}

const script = readScript(readFileSync(`${root}app/content/chat.md`, 'utf8'))
const { texts } = createMatcher(script)
const extract = await lib.pipeline('feature-extraction', MODEL, { dtype: 'fp32' })
const result = await extract(texts, { pooling: 'mean', normalize: true })
const rows = result.tolist()

const vectors = {}
texts.forEach((text, i) => { vectors[text] = packVector(rows[i]) })
writeFileSync(out, `${JSON.stringify({ model: MODEL, made: new Date().toISOString().slice(0, 10), vectors }, null, 1)}\n`)
console.log(`${texts.length} questions embedded into app/content/chat-vectors.json`)
