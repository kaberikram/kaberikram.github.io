// The bar: one surface that changes shape to fit the moment.
//
//   idle     a pill with a few things to try
//   typing   a plan line says what is about to happen; understood words are
//            underlined; the board previews it live. Enter commits.
//   answer   one sentence with editable blanks: "Here's my [proudest] work [of
//            any kind], shown as [a board]." Change a blank, the board follows.
//   detail   the focused work, with its facts and a way to get in touch.
//
// It never moves a card itself. It reads the director's state and sends it
// Commands, like every other input.

import { SUGGESTIONS, LAYOUT_TEXT, describe, parse, sortText } from '../brain/parse.js'
import { hasFilter, toHash } from '../brain/command.js'
import { escapeHtml } from '../util.js'
import { cue } from '../cue.js'

const SORTS = [['proud', 'proudest'], ['recent', 'newest'], ['oldest', 'earliest']]
const LAYOUTS = [['scatter', 'a board'], ['grid', 'a grid'], ['timeline', 'a timeline'], ['stack', 'a stack']]

export function createBar({ content, director, mount }) {
  mount.innerHTML = `
    <div class="sec sec-detail"><div id="b-detail"></div></div>
    <div class="sec sec-answer"><div id="b-answer"></div></div>
    <div class="sec sec-plan"><div><p id="b-plan" class="plan" aria-live="polite"></p></div></div>
    <form class="row" autocomplete="off">
      <div class="field">
        <div class="mirror" aria-hidden="true"><span></span></div>
        <input id="b-input" type="text" placeholder="Ask me anything" aria-label="Ask about my work" enterkeyhint="go" spellcheck="false" autocapitalize="off">
      </div>
      <button class="send" type="submit" aria-label="Go"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
    </form>
    <div class="sec sec-chips"><div class="chips"></div></div>`

  const $ = (selector) => mount.querySelector(selector)
  const input = $('#b-input')
  const mirror = $('.mirror span')
  const plan = $('#b-plan')
  const detail = $('#b-detail')
  const answer = $('#b-answer')
  const chips = $('.chips')
  const sections = {
    detail: $('.sec-detail'),
    answer: $('.sec-answer'),
    plan: $('.sec-plan'),
    chips: $('.sec-chips'),
  }

  const kindLabel = (id) => content.kindById.get(id).label
  let committed = null // the view to return to if typing is abandoned
  let previewing = false
  let previewTimer = 0
  let blank = null // text we did not understand
  let note = null // { text, at } explanation shown with the answer
  let openSlot = null
  let lastLength = 0
  let lastFound = 0
  let lastMode = null

  const typing = () => input.value.trim().length > 0

  function show(name, on) {
    sections[name].classList.toggle('on', on)
    sections[name].toggleAttribute('inert', !on)
  }

  // ---- typing ---------------------------------------------------------------

  function paintMirror(found) {
    const text = input.value
    let html = ''
    let at = 0
    for (const item of [...found].sort((a, b) => a.start - b.start)) {
      if (item.type === 'limit' && found.length === 1) continue
      html += escapeHtml(text.slice(at, item.start)) + `<u>${escapeHtml(text.slice(item.start, item.end))}</u>`
      at = item.end
    }
    mirror.innerHTML = html + escapeHtml(text.slice(at))
    mirror.style.transform = `translateX(${-input.scrollLeft}px)`
  }

  function preview(result) {
    if (!result.boardChange) {
      if (previewing && committed) {
        previewing = false
        director.apply(committed, { url: 'none', stagger: false })
      }
      return
    }
    if (!committed) committed = director.getState().command
    previewing = true
    director.apply(result.command, { url: 'none' })
  }

  function onInput() {
    if (input.value.length > lastLength) cue('type')
    lastLength = input.value.length
    blank = null
    note = null
    openSlot = null
    clearTimeout(previewTimer)
    if (!typing()) {
      paintMirror([])
      if (previewing && committed) director.apply(committed, { url: 'none', stagger: false })
      previewing = false
      committed = null
      render()
      return
    }
    if (!committed) committed = director.getState().command
    const result = parse(input.value, content)
    if (result.found.length > lastFound) cue('understood')
    lastFound = result.found.length
    paintMirror(result.found)
    plan.textContent = result.understood ? describe(result, content) : 'Keep going, or pick something below'
    plan.classList.toggle('quiet', !result.understood)
    previewTimer = setTimeout(() => preview(result), 170)
    render()
  }

  function finishTyping() {
    clearTimeout(previewTimer)
    input.value = ''
    paintMirror([])
    previewing = false
    committed = null
  }

  function commit(text) {
    const result = parse(text, content)
    clearTimeout(previewTimer)
    lastLength = 0
    lastFound = 0
    if (!result.understood) {
      cue('unsure')
      if (previewing && committed) director.apply(committed, { url: 'none', stagger: false })
      finishTyping()
      blank = text.trim()
      openSlot = 'kind'
      render()
      return
    }
    finishTyping()
    cue('confirm')
    blank = null
    if (result.boardChange) {
      const asked = hasFilter(result.command)
      director.apply(result.command, { url: 'push' })
      const got = director.getState().command
      if (asked && !hasFilter(got)) note = { text: 'Nothing matched all of that, so here is everything.', at: toHash(got) }
      if (result.panel) director.setPanel(result.panel)
    } else {
      if (director.getState().focus) director.unfocus()
      director.setPanel(result.panel)
    }
    input.blur()
    render()
  }

  function ask(text) {
    input.value = text
    commit(text)
  }

  $('.row').addEventListener('submit', (e) => {
    e.preventDefault()
    if (typing()) commit(input.value)
  })
  input.addEventListener('input', onInput)
  input.addEventListener('scroll', () => { mirror.style.transform = `translateX(${-input.scrollLeft}px)` })
  input.addEventListener('focus', () => mount.classList.add('is-open'))
  input.addEventListener('blur', () => {
    if (!typing()) mount.classList.remove('is-open')
  })
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    if (typing()) {
      input.value = ''
      onInput()
    } else {
      input.blur()
    }
  })

  // "/" jumps to the bar from anywhere.
  addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
    const tag = e.target && e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    e.preventDefault()
    input.focus()
  })

  // ---- answer sentence ------------------------------------------------------

  function slot(name, text) {
    return `<button type="button" class="slot${openSlot === name ? ' is-open' : ''}" data-slot="${name}" aria-expanded="${openSlot === name}">${escapeHtml(text)}</button>`
  }

  function optionsFor(name, command) {
    if (name === 'sort') return SORTS.map(([value, text]) => [value, text, (command.sort || 'proud') === value])
    if (name === 'layout') return LAYOUTS.map(([value, text]) => [value, text, command.layout === value])
    return [['any', 'any kind', !command.kind], ...content.kinds.map((kind) => [kind.id, kind.label, command.kind === kind.id])]
  }

  function renderAnswer(state) {
    const c = state.command
    let html
    if (blank) {
      html = `<p class="sentence">Not sure I caught “${escapeHtml(blank)}”. Are you after ${slot('kind', 'a kind of work')}?</p>`
    } else {
      const where = c.kind ? `in ${kindLabel(c.kind)}` : 'of any kind'
      const extra = [...c.tags, c.years ? (c.years[0] === c.years[1] ? String(c.years[0]) : `${c.years[0]}–${c.years[1]}`) : null].filter(Boolean)
      html = `<p class="sentence">Here's my ${slot('sort', sortText(c.sort))} work ${slot('kind', where)}, shown as ${slot('layout', LAYOUT_TEXT[c.layout])}. <span class="count">${state.results.length} piece${state.results.length === 1 ? '' : 's'}${extra.length ? ` · ${escapeHtml(extra.join(', '))}` : ''}</span></p>`
      if (note) html += `<p class="note">${escapeHtml(note.text)}</p>`
    }
    if (openSlot) {
      const options = optionsFor(openSlot, c)
      html += `<div class="options" data-for="${openSlot}">${options.map(([value, text, on]) => `<button type="button" class="opt${on ? ' on' : ''}" data-value="${escapeHtml(value)}">${escapeHtml(text)}</button>`).join('')}</div>`
    }
    answer.innerHTML = html
  }

  answer.addEventListener('click', (e) => {
    const target = e.target.closest('button')
    if (!target) return
    if (target.dataset.slot) {
      openSlot = openSlot === target.dataset.slot ? null : target.dataset.slot
      renderAnswer(director.getState())
      return
    }
    if (!target.dataset.value) return
    const state = director.getState()
    const next = { ...state.command, focus: null }
    const value = target.dataset.value
    if (openSlot === 'sort') next.sort = value
    else if (openSlot === 'layout') next.layout = value
    else if (openSlot === 'kind') {
      next.kind = value === 'any' ? null : value
      next.limit = null
    }
    blank = null
    note = null
    openSlot = null
    director.apply(next)
    render()
  })

  // ---- detail ---------------------------------------------------------------

  function fact(label, value) {
    return value ? `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>` : ''
  }

  function renderWork(state) {
    const work = content.byId.get(state.focus)
    const at = state.results.indexOf(work.id)
    const many = state.results.length > 1
    const links = (work.links || []).map((link) => `<a class="pill" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join('')
    const mail = `mailto:${content.owner.email}?subject=${encodeURIComponent(`About ${work.title}`)}`
    detail.innerHTML = `
      <div class="d-top">
        <span class="d-kind"><i class="dab" style="--dab:${content.kindById.get(work.kind).dab}"></i>${escapeHtml(kindLabel(work.kind))}</span>
        <span class="d-nav">
          ${many ? `<button type="button" data-act="prev" aria-label="Previous work">‹</button><span class="d-count">${at + 1} of ${state.results.length}</span><button type="button" data-act="next" aria-label="Next work">›</button>` : ''}
          <button type="button" data-act="close" aria-label="Close">×</button>
        </span>
      </div>
      <h2 class="d-title">${escapeHtml(work.title)}</h2>
      <p class="d-line">${escapeHtml(work.line)}</p>
      ${work.summary ? `<p class="d-summary">${escapeHtml(work.summary)}</p>` : ''}
      <dl class="d-facts">${fact('When', work.when)}${fact('Role', work.role)}${fact('Made with', (work.tools || []).join(', '))}</dl>
      <div class="d-actions">${links}<a class="pill dark" href="${mail}">Ask me about this</a></div>`
  }

  function renderPanel(name) {
    if (name === 'about') {
      detail.innerHTML = `
        <div class="d-top"><span class="d-kind">About</span><span class="d-nav"><button type="button" data-act="close" aria-label="Close">×</button></span></div>
        <h2 class="d-title">${escapeHtml(content.about.headline)}</h2>
        <p class="d-line">Here is what I make. Pick one to see it.</p>
        <div class="d-actions">${content.kinds.map((kind) => `<button type="button" class="pill" data-kind="${kind.id}"><i class="dab" style="--dab:${kind.dab}"></i>${escapeHtml(kind.label)}</button>`).join('')}</div>`
    } else {
      const c = content.contact
      detail.innerHTML = `
        <div class="d-top"><span class="d-kind">Contact</span><span class="d-nav"><button type="button" data-act="close" aria-label="Close">×</button></span></div>
        <h2 class="d-title">Say hello</h2>
        <p class="d-line">The best way to reach me is email.</p>
        <div class="d-actions"><a class="pill dark" href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>${c.links.map((link) => `<a class="pill" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join('')}</div>`
    }
  }

  detail.addEventListener('click', (e) => {
    const target = e.target.closest('button')
    if (!target) return
    if (target.dataset.kind) {
      director.apply({ kind: target.dataset.kind })
      return
    }
    const act = target.dataset.act
    if (act === 'close') director.back()
    else if (act === 'next') director.next(1)
    else if (act === 'prev') director.next(-1)
  })

  // ---- chips ----------------------------------------------------------------

  chips.innerHTML = SUGGESTIONS.map((text) => `<button type="button" class="chip">${escapeHtml(text)}</button>`).join('')
  chips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip')
    if (chip) ask(chip.textContent)
  })

  // ---- render ---------------------------------------------------------------

  function render() {
    const state = director.getState()
    if (note && note.at !== toHash(state.command)) note = null
    const away = toHash(state.command) !== ''
    const isTyping = typing()
    const hasDetail = !isTyping && Boolean(state.panel || state.focus)
    const hasAnswer = !isTyping && (Boolean(blank) || Boolean(note) || away)
    const mode = isTyping ? 'typing' : hasDetail ? 'detail' : hasAnswer ? 'answer' : 'idle'

    if (hasAnswer) renderAnswer(state)
    if (hasDetail) {
      if (state.panel) renderPanel(state.panel)
      else renderWork(state)
    }
    show('detail', hasDetail)
    show('answer', hasAnswer)
    show('plan', isTyping)
    show('chips', mode === 'idle' || Boolean(blank))
    if (lastMode && mode !== lastMode && mode !== 'typing' && lastMode !== 'typing') cue('shape')
    lastMode = mode
    mount.dataset.mode = mode
    input.placeholder = mode === 'idle' ? 'Ask me anything' : mode === 'detail' ? 'Ask for something else' : 'Ask me anything'
  }

  director.subscribe(() => {
    if (!previewing) {
      // Anything that moves the board other than our own preview supersedes
      // an unanswered "not sure what you meant".
      if (blank && director.getState().focus) blank = null
    }
    render()
  })

  // ---- keep the camera clear of the bar --------------------------------------

  function measure() {
    return Math.round(mount.getBoundingClientRect().height + parseFloat(getComputedStyle(mount).bottom || '0') + 18)
  }

  director.setInset({ bottom: measure() })
  let settle = 0
  let lastInset = measure()
  new ResizeObserver(() => {
    clearTimeout(settle)
    settle = setTimeout(() => {
      const next = measure()
      if (Math.abs(next - lastInset) < 8) return
      lastInset = next
      director.setInset({ bottom: next })
      if (!typing()) director.reframe()
    }, 220)
  }).observe(mount)

  render()
  return { ask, focus: () => input.focus() }
}
