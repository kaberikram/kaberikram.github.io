// The Command: one small object that says what the board should show.
// Clicks, keys, links and (later) the bar and Claude all produce one of these,
// so there is exactly one path from "what was asked" to "what the board does".
//
// Pure functions only. Tests import this file in Node.

export const LAYOUT_NAMES = ['scatter', 'grid', 'timeline', 'stack']
export const SORT_NAMES = ['proud', 'recent', 'oldest']

export const HOME = Object.freeze({
  layout: 'scatter',
  kind: null,
  tags: Object.freeze([]),
  years: null,
  sort: null,
  limit: null,
  focus: null,
})

// What a Command is allowed to mention, taken from the content file.
export function vocabOf(content) {
  return {
    ids: new Set(content.works.map((work) => work.id)),
    kinds: new Set(content.kinds.map((kind) => kind.id)),
    tags: new Set(content.works.flatMap((work) => work.tags)),
  }
}

// Turn anything into a valid Command. Unknown keys and values are dropped, so
// nothing from a link or a model reply can ask for something the board lacks.
export function sanitizeCommand(raw, vocab) {
  const input = raw && typeof raw === 'object' ? raw : {}
  const next = { ...HOME, tags: [] }

  if (LAYOUT_NAMES.includes(input.layout)) next.layout = input.layout
  if (typeof input.kind === 'string' && vocab.kinds.has(input.kind)) next.kind = input.kind

  if (Array.isArray(input.tags)) {
    const seen = new Set()
    for (const tag of input.tags) {
      if (typeof tag !== 'string') continue
      const clean = tag.trim().toLowerCase()
      if (vocab.tags.has(clean) && !seen.has(clean)) {
        seen.add(clean)
        next.tags.push(clean)
      }
    }
    next.tags.sort()
  }

  if (Array.isArray(input.years) && input.years.length === 2) {
    const from = Math.round(Number(input.years[0]))
    const to = Math.round(Number(input.years[1]))
    const valid = (y) => Number.isFinite(y) && y >= 1990 && y <= 2100
    if (valid(from) && valid(to)) next.years = [Math.min(from, to), Math.max(from, to)]
  }

  if (SORT_NAMES.includes(input.sort)) next.sort = input.sort

  const limit = Math.round(Number(input.limit))
  if (input.limit != null && Number.isFinite(limit) && limit >= 1 && limit <= 50) next.limit = limit

  if (input.focus === 'first') next.focus = 'first'
  else if (typeof input.focus === 'string' && vocab.ids.has(input.focus)) next.focus = input.focus

  return next
}

export function hasFilter(cmd) {
  return Boolean(cmd.kind || cmd.tags.length || cmd.years || cmd.limit)
}

// True when two Commands show the same cards in the same arrangement.
// Focus is ignored: stepping between cards does not change the view.
export function sameView(a, b) {
  return toHash({ ...a, focus: null }) === toHash({ ...b, focus: null })
}

// The cards a Command selects, in the order it wants them.
export function select(works, cmd) {
  let list = works.filter((work) => {
    if (cmd.kind && work.kind !== cmd.kind) return false
    for (const tag of cmd.tags) {
      if (!work.tags.includes(tag)) return false
    }
    if (cmd.years) {
      if (work.year == null) return false
      if (work.year < cmd.years[0] || work.year > cmd.years[1]) return false
    }
    return true
  })

  const undatedLast = (a, b) => (a.year == null) - (b.year == null)
  if (cmd.sort === 'recent') {
    list.sort((a, b) => undatedLast(a, b) || b.year - a.year || (b.month || 0) - (a.month || 0) || a.proud - b.proud)
  } else if (cmd.sort === 'oldest') {
    list.sort((a, b) => undatedLast(a, b) || a.year - b.year || (a.month || 0) - (b.month || 0) || a.proud - b.proud)
  } else {
    list.sort((a, b) => a.proud - b.proud)
  }

  if (cmd.limit) list = list.slice(0, cmd.limit)
  return list
}

// A Command as a URL hash, so every view has a link and Back can undo it.
// Home is the empty hash.
export function toHash(cmd) {
  const parts = []
  if (cmd.kind) parts.push(`k=${encodeURIComponent(cmd.kind)}`)
  if (cmd.tags.length) parts.push(`t=${cmd.tags.map(encodeURIComponent).join(',')}`)
  if (cmd.years) parts.push(`y=${cmd.years[0]}-${cmd.years[1]}`)
  if (cmd.sort) parts.push(`s=${cmd.sort}`)
  if (cmd.limit) parts.push(`n=${cmd.limit}`)
  if (cmd.layout !== HOME.layout) parts.push(`l=${cmd.layout}`)
  if (cmd.focus) parts.push(`w=${encodeURIComponent(cmd.focus)}`)
  return parts.length ? `#${parts.join('&')}` : ''
}

export function fromHash(hash, vocab) {
  const raw = {}
  const text = String(hash || '').replace(/^#/, '')
  for (const part of text.split('&')) {
    const at = part.indexOf('=')
    if (at < 1) continue
    const key = part.slice(0, at)
    let value = part.slice(at + 1)
    try {
      value = decodeURIComponent(value)
    } catch {
      continue
    }
    if (key === 'k') raw.kind = value
    else if (key === 't') raw.tags = value.split(',')
    else if (key === 'y') raw.years = value.split('-')
    else if (key === 's') raw.sort = value
    else if (key === 'n') raw.limit = value
    else if (key === 'l') raw.layout = value
    else if (key === 'w') raw.focus = value
  }
  return sanitizeCommand(raw, vocab)
}
