// The on-device brain: free text in, a Command out, instantly, with no network.
//
// It also reports which words it understood (so the bar can underline them as
// you type) and a one-line plan in your voice ("Showing my newest AR work").
// Pure functions: tests import this file in Node.

import { HOME, select } from './command.js'

export const LEXICON = {
  sort: {
    proud: ['proudest', 'proud', 'pride', 'best', 'favourite', 'favorite', 'favourites', 'favorites', 'top', 'strongest', 'highlights', 'highlight', 'showcase', 'standout'],
    recent: ['recent', 'recently', 'latest', 'newest', 'newer', 'lately'],
    oldest: ['oldest', 'earliest', 'early'],
  },
  layout: {
    grid: ['grid', 'tidy', 'neat', 'organised', 'organized', 'rows'],
    timeline: ['timeline', 'chronological', 'chronologically', 'history', 'over time', 'by year', 'by date', 'by time'],
    stack: ['stack', 'pile'],
    scatter: ['everything', 'all', 'all of it', 'overview', 'board', 'messy', 'home', 'reset', 'start over', 'show all'],
  },
  kind: {
    ar: ['ar', 'augmented reality', 'lens', 'lenses'],
    xr: ['xr', 'vr', 'mr', 'mixed reality', 'quest', 'meta', 'headset', 'immersive'],
    web: ['web', 'website', 'websites', 'creative dev', 'creative coding', 'browser', 'site', 'sites'],
    product: ['product', 'ui', 'ux', 'design', 'designer', 'interface', 'app', 'apps'],
  },
  panel: {
    about: ['about', 'who are you', 'who is ikram', 'bio', 'yourself', 'your story', 'background', 'introduce'],
    contact: ['contact', 'email', 'hire', 'reach', 'touch', 'message', 'mail', 'instagram', 'work with you', 'talk to you'],
  },
}

// Words that carry no request. They are understood (and ignored) so a
// sentence made only of them is treated as chat, not as a command.
const FILLER = new Set(['show', 'me', 'your', 'my', 'the', 'of', 'work', 'works', 'projects', 'project', 'stuff', 'things', 'please', 'what', 'have', 'you', 'done', 'made', 'a', 'an', 'in', 'and', 'some', 'just', 'only', 'most', 'is', 'are', 'do', 'how', 'can', 'i', 'to', 'see', 'look', 'at', 'with', 'for', 'whats', 'any', 'pieces', 'piece'])

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }

const WORD = /[\p{L}\p{N}][\p{L}\p{N}.+#'-]*/gu

function clean(word) {
  return word.toLowerCase().replace(/'s$/, '').replace(/[.'-]+$/, '')
}

const cache = new WeakMap()

function indexOf(content) {
  if (cache.has(content)) return cache.get(content)
  const phrases = new Map()
  const add = (phrase, entry) => {
    if (!phrases.has(phrase)) phrases.set(phrase, entry)
  }

  // Full titles first: "Reality to bend" is a work, not three loose words.
  for (const work of content.works) add(work.title.toLowerCase().replace(/[.]+$/, ''), { type: 'work', value: work.id })
  for (const type of ['sort', 'layout', 'kind', 'panel']) {
    for (const [value, words] of Object.entries(LEXICON[type])) {
      for (const word of words) add(word, { type, value })
    }
  }
  const kindIds = new Set(content.kinds.map((kind) => kind.id))
  for (const tag of new Set(content.works.flatMap((work) => work.tags))) {
    if (kindIds.has(tag)) continue
    add(tag, { type: 'tag', value: tag })
    if (!tag.endsWith('s')) add(`${tag}s`, { type: 'tag', value: tag })
  }

  // A distinctive single word from a title or line names its work, but only
  // when it names exactly one ("volta", "dreampop"). Shared words ("reel",
  // "spectacles") are left to tags.
  const owners = new Map()
  for (const work of content.works) {
    const words = [
      ...work.title.split(/\s+/).map(clean).filter((w) => w.length >= 4),
      ...work.line.split(/[\s,]+/).map(clean).filter((w) => w.length >= 6),
    ]
    for (const word of new Set(words)) {
      if (phrases.has(word) || FILLER.has(word)) continue
      if (!owners.has(word)) owners.set(word, new Set())
      owners.get(word).add(work.id)
    }
  }
  for (const [word, ids] of owners) {
    if (ids.size === 1) add(word, { type: 'work', value: [...ids][0] })
  }

  const maxYear = Math.max(...content.works.map((work) => work.year || 0))
  const index = { phrases, maxYear }
  cache.set(content, index)
  return index
}

export function parse(text, content) {
  const { phrases, maxYear } = indexOf(content)
  const tokens = []
  for (const match of String(text).matchAll(WORD)) {
    tokens.push({ word: clean(match[0]), start: match.index, end: match.index + match[0].replace(/[.'-]+$/, '').length })
  }

  const found = []
  let filler = 0
  for (let i = 0; i < tokens.length;) {
    let hit = null
    for (let len = Math.min(4, tokens.length - i); len >= 1 && !hit; len--) {
      const phrase = tokens.slice(i, i + len).map((token) => token.word).join(' ')
      if (phrases.has(phrase)) hit = { len, ...phrases.get(phrase) }
      else if (len === 2 && phrase === 'this year') hit = { len, type: 'years', value: [maxYear, maxYear] }
      else if (len === 2 && phrase === 'last year') hit = { len, type: 'years', value: [maxYear - 1, maxYear - 1] }
    }
    if (!hit) {
      const word = tokens[i].word
      if (/^(19|20)\d\d$/.test(word)) hit = { len: 1, type: 'years', value: [Number(word), Number(word)] }
      else if (/^\d{1,2}$/.test(word) && Number(word) >= 1) hit = { len: 1, type: 'limit', value: Number(word) }
      else if (NUMBER_WORDS[word]) hit = { len: 1, type: 'limit', value: NUMBER_WORDS[word] }
    }
    if (!hit) {
      if (FILLER.has(tokens[i].word)) filler++
      i++
      continue
    }
    found.push({ type: hit.type, value: hit.value, start: tokens[i].start, end: tokens[i + hit.len - 1].end })
    i += hit.len
  }

  const command = { ...HOME, tags: [] }
  let panel = null
  let workId = null
  let layout = null
  let explicitLimit = false
  for (const item of found) {
    if (item.type === 'sort' && !command.sort) command.sort = item.value
    else if (item.type === 'layout' && (!layout || layout === 'scatter')) layout = item.value
    else if (item.type === 'kind' && !command.kind) command.kind = item.value
    else if (item.type === 'tag') command.tags.push(item.value)
    else if (item.type === 'years') command.years = command.years ? [Math.min(command.years[0], item.value[0]), Math.max(command.years[1], item.value[1])] : item.value
    else if (item.type === 'limit') {
      command.limit = item.value
      explicitLimit = true
    } else if (item.type === 'work' && !workId) workId = item.value
    else if (item.type === 'panel' && !panel) panel = item.value
  }
  if (layout) command.layout = layout
  if (workId) {
    // Naming one work goes straight to it; anything else typed is ignored.
    command.focus = workId
  } else if (command.sort) {
    if (!explicitLimit) command.limit = 5
    command.focus = 'first'
  }

  const meaningful = found.filter((item) => item.type !== 'limit' || found.length > 1 || command.sort)
  const boardChange = meaningful.some((item) => item.type !== 'panel')
  const understood = found.length > 0 && (meaningful.length > 0)
  return { command, panel, workId, found, understood, boardChange, filler }
}

const SORT_TEXT = { proud: 'proudest', recent: 'newest', oldest: 'earliest' }
export const LAYOUT_TEXT = { scatter: 'a board', grid: 'a grid', timeline: 'a timeline', stack: 'a stack' }

export function sortText(sort) {
  return SORT_TEXT[sort] || 'proudest'
}

// The plan line shown while typing, in your voice.
export function describe(result, content) {
  if (result.panel && !result.boardChange) {
    return result.panel === 'about' ? 'Opening a bit about me' : 'Opening how to reach me'
  }
  const c = result.command
  if (result.workId) return `Going to ${content.byId.get(result.workId).title}`
  const count = select(content.works, c).length
  const parts = ['Showing my']
  if (c.sort) parts.push(SORT_TEXT[c.sort])
  if (c.kind) parts.push(content.kindById.get(c.kind).label)
  if (c.tags.length) parts.push(c.tags.join(' '))
  parts.push(c.kind || c.sort || c.tags.length ? 'work' : 'work, all of it')
  if (c.years) parts.push(c.years[0] === c.years[1] ? `from ${c.years[0]}` : `from ${c.years[0]} to ${c.years[1]}`)
  let line = parts.join(' ')
  if (count === 0) return 'Nothing matches that, so I would show everything'
  line += c.limit && c.limit < count + 1 ? `, ${count === c.limit ? 'top ' : ''}${count}` : `, ${count} piece${count === 1 ? '' : 's'}`
  if (c.layout !== 'scatter') line += `, as ${LAYOUT_TEXT[c.layout]}`
  return line
}

export const SUGGESTIONS = [
  'Show me your proudest work',
  "What's most recent?",
  'Just the AR work',
  'Everything by year',
  'Who are you?',
  'How do I reach you?',
]
