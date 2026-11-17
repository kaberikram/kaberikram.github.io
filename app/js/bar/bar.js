// The bar: one surface that changes shape to fit the moment.
//
//   idle     a pill with a few things to try
//   typing   a plan line says what is about to happen; understood words are
//            underlined; the board previews it live. Enter commits.
//   answer   one sentence with editable blanks: "Here's my [proudest] work [of
//            any kind], shown as [a board]." Change a blank, the board follows.
//   detail   the focused work, with its facts and a way to get in touch.
//   talk     a conversation: what the visitor said and what you say back,
//            from app/content/chat.md. The board may move with an answer.
//
// It never moves a card itself. It reads the director's state and sends it
// Commands, like every other input.

import { SUGGESTIONS, LAYOUT_TEXT, describe, parse, sortText } from '../brain/parse.js'
import { hasFilter, toHash } from '../brain/command.js'
import { escapeHtml, hashString, roughEdge } from '../util.js'
import { cue } from '../cue.js'
import { answerHtml } from '../chat/script.js'

const SORTS = [['proud', 'proudest'], ['recent', 'newest'], ['oldest', 'earliest']]
const LAYOUTS = [['scatter', 'a board'], ['grid', 'a grid'], ['timeline', 'a timeline'], ['stack', 'a stack']]

export function createBar({ content, director, mount, chat = null }) {
  mount.innerHTML = `
    <div class="sec sec-talk"><div><div class="talk"><button type="button" class="talk-close" aria-label="Close the conversation">×</button><div id="b-talk" aria-live="polite"></div></div></div></div>
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
  const talkLog = $('#b-talk')
  const sections = {
    talk: $('.sec-talk'),
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

  // The conversation. Each exchange: { said, reply, next, pending, fresh }.
  let talk = []
  let talking = false
  let talkView = '' // the board as the last answer left it
  let ownMove = false
  let planUseful = false
  const touch = matchMedia('(pointer: coarse)').matches
  const viewKey = () => {
    const state = director.getState()
    return `${toHash(state.command)}|${state.focus || ''}`
  }

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
    planUseful = result.understood && result.boardChange
    plan.textContent = result.understood ? describe(result, content) : chat ? 'Press Enter to ask me' : 'Keep going, or pick something below'
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
    if (chat) {
      converse(text.trim(), result)
      return
    }
    commitBoard(text, result)
  }

  function commitBoard(text, result) {
    talking = false
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

  // ---- talk -----------------------------------------------------------------

  // Hear the words, then either answer in conversation or hand them to the
  // board. A clear board request ("just the AR work") goes to the board unless
  // the chat is sure; anything else the chat gets first. While the sentence
  // model is still loading, a question that is not a board request waits a
  // few seconds for it rather than guess from words.
  function converse(said, result) {
    const exchange = { said, reply: null, next: [], pending: true, fresh: false }
    const restore = previewing && committed ? committed : null
    finishTyping()
    blank = null
    note = null
    openSlot = null
    talk.push(exchange)
    talk = talk.slice(-2)
    talking = true
    talkView = viewKey()
    if (touch) input.blur()
    render()
    const began = performance.now()
    chat.hear(said, { wait: result.boardChange ? 0 : 5000 }).then((heard) => {
      const answer = heard.level === 'sure' || (heard.level === 'close' && !result.boardChange)
      if (!answer && result.understood) {
        talk = talk.filter((e) => e !== exchange)
        commitBoard(said, result)
        return
      }
      const reply = answer ? chat.answer(heard.topic) : chat.nothing()
      const next = answer ? heard.topic.next : chat.script.nothing.next
      // A short pause, like someone gathering a thought, longer for a longer
      // answer. Time already spent listening counts towards it.
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
      const pause = reduce ? 0 : Math.max(0, Math.min(1100, 320 + reply.length * 4) - (performance.now() - began))
      setTimeout(() => {
        if (!talk.includes(exchange)) return
        exchange.reply = reply
        exchange.next = next.length ? next : chat.script.start.next
        exchange.pending = false
        exchange.fresh = !reduce
        cue(answer ? 'confirm' : 'unsure')
        ownMove = true
        const shown = answer && heard.topic.show ? parse(heard.topic.show, content) : null
        if (shown && shown.boardChange) director.apply(shown.command, { url: 'push' })
        else if (restore) director.apply(restore, { url: 'none', stagger: false })
        ownMove = false
        talkView = viewKey()
        talking = true
        render()
      }, pause)
    })
  }

  let talkShown = ''
  function renderTalk() {
    // Only when the words change, so a fading-in answer is never cut short.
    const key = JSON.stringify(talk.map((e) => [e.said, e.reply]))
    if (key === talkShown) return
    talkShown = key
    talkLog.innerHTML = talk.map((e, i) => `
      <div class="ex${i < talk.length - 1 ? ' past' : ''}">
        <p class="said">${escapeHtml(e.said)}</p>
        ${e.pending ? '<p class="reply dots" aria-label="Thinking"><i></i><i></i><i></i></p>' : `<p class="reply${e.fresh ? ' fresh' : ''}">${answerHtml(e.reply, escapeHtml)}</p>`}
      </div>`).join('')
    // The newest answer arrives a word at a time.
    const fresh = talkLog.querySelector('.reply.fresh')
    if (fresh) {
      const walker = document.createTreeWalker(fresh, NodeFilter.SHOW_TEXT)
      const nodes = []
      while (walker.nextNode()) nodes.push(walker.currentNode)
      let i = 0
      for (const node of nodes) {
        const parts = node.textContent.split(/(\s+)/)
        const frag = document.createDocumentFragment()
        for (const part of parts) {
          if (!part) continue
          if (/^\s+$/.test(part)) frag.append(part)
          else {
            const w = document.createElement('span')
            w.className = 'w'
            w.style.setProperty('--i', i++)
            w.textContent = part
            frag.append(w)
          }
        }
        node.replaceWith(frag)
      }
      for (const e of talk) e.fresh = false
    }
    talkLog.scrollTop = talkLog.scrollHeight
  }

  function endTalk() {
    talk = []
    talking = false
    render()
  }

  $('.talk-close').addEventListener('click', () => {
    endTalk()
    input.focus()
  })

  $('.row').addEventListener('submit', (e) => {
    e.preventDefault()
    if (typing()) commit(input.value)
  })
  input.addEventListener('input', onInput)
  input.addEventListener('scroll', () => { mirror.style.transform = `translateX(${-input.scrollLeft}px)` })
  input.addEventListener('focus', () => {
    mount.classList.add('is-open')
    // Someone who opens the bar is likely to talk: start the model now.
    if (chat) chat.warm()
  })
  input.addEventListener('blur', () => {
    if (!typing()) mount.classList.remove('is-open')
  })
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    if (typing()) {
      input.value = ''
      onInput()
    } else if (talking) {
      endTalk()
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
    answer.innerHTML = html
    answer.querySelectorAll('.slot').forEach((el) => cut(el, `${el.dataset.slot}:${el.textContent}`, 2.2))
    renderMenu()
  }

  // Blanks, their menu and its current choice are cut from paper with the same
  // hand-cut outline as the windows on the board, sized to each piece.
  function cut(el, seed, amount) {
    const w = el.offsetWidth
    const h = el.offsetHeight
    if (!w || !h) return
    el.style.setProperty('--rough', roughEdge(hashString(seed), amount, { w, h }))
  }

  // The choices for a blank float over the card, anchored on the word: the
  // current choice sits right where the word is, the others stack above and
  // below it. The menu lives outside the bar so the bar's rounded edge does
  // not clip it.
  const menu = document.createElement('div')
  menu.className = 'slot-menu'
  menu.setAttribute('role', 'listbox')
  document.body.append(menu)
  let menuFollow = 0

  function renderMenu() {
    const anchor = openSlot && answer.querySelector(`.slot[data-slot="${openSlot}"]`)
    if (!anchor || !sections.answer.classList.contains('on')) {
      menu.classList.remove('on')
      cancelAnimationFrame(menuFollow)
      return
    }
    const options = optionsFor(openSlot, director.getState().command)
    menu.dataset.for = openSlot
    menu.innerHTML = options.map(([value, text, on]) => `<button type="button" role="option" aria-selected="${on}" class="opt${on ? ' on' : ''}" data-value="${escapeHtml(value)}">${escapeHtml(text)}</button>`).join('')
    cut(menu, `menu:${openSlot}`, 3)
    menu.querySelectorAll('.opt').forEach((el) => cut(el, `opt:${el.dataset.value}`, 2))
    placeMenu(anchor)
    menu.classList.add('on')
    // The bar may still be growing or sliding; keep the menu on its word.
    cancelAnimationFrame(menuFollow)
    const until = performance.now() + 700
    const follow = () => {
      const current = openSlot && answer.querySelector(`.slot[data-slot="${openSlot}"]`)
      if (!current) return
      placeMenu(current)
      if (performance.now() < until) menuFollow = requestAnimationFrame(follow)
    }
    menuFollow = requestAnimationFrame(follow)
  }

  function placeMenu(anchor) {
    const word = anchor.getBoundingClientRect()
    const current = menu.querySelector('.opt.on') || menu.firstElementChild
    const width = Math.max(menu.offsetWidth, word.width + 24)
    const height = menu.offsetHeight
    const pad = 8
    let left = word.left + word.width / 2 - width / 2
    let top = word.top + word.height / 2 - (current.offsetTop + current.offsetHeight / 2)
    left = Math.min(Math.max(pad, left), innerWidth - width - pad)
    top = Math.min(Math.max(pad, top), innerHeight - height - pad)
    menu.style.minWidth = `${Math.round(word.width + 24)}px`
    menu.style.left = `${Math.round(left)}px`
    menu.style.top = `${Math.round(top)}px`
    menu.style.transformOrigin = `${Math.round(word.left + word.width / 2 - left)}px ${Math.round(word.top + word.height / 2 - top)}px`
  }

  function closeMenu() {
    if (!openSlot) return false
    openSlot = null
    answer.querySelectorAll('.slot.is-open').forEach((slotEl) => {
      slotEl.classList.remove('is-open')
      slotEl.setAttribute('aria-expanded', 'false')
    })
    renderMenu()
    return true
  }

  answer.addEventListener('click', (e) => {
    const target = e.target.closest('.slot')
    if (!target) return
    openSlot = openSlot === target.dataset.slot ? null : target.dataset.slot
    renderAnswer(director.getState())
  })

  menu.addEventListener('click', (e) => {
    const target = e.target.closest('.opt')
    if (!target) return
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

  // A tap anywhere else, or Esc, puts the menu away without changing anything.
  addEventListener('pointerdown', (e) => {
    if (!openSlot || menu.contains(e.target) || e.target.closest('.slot')) return
    closeMenu()
  }, true)
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !openSlot) return
    e.stopPropagation()
    e.preventDefault()
    closeMenu()
  }, true)
  addEventListener('resize', () => closeMenu())

  // ---- detail ---------------------------------------------------------------

  function fact(label, value) {
    return value ? `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>` : ''
  }

  function renderWork(state) {
    const work = content.byId.get(state.focus)
    const at = state.results.indexOf(work.id)
    const many = state.results.length > 1
    const links = (work.links || []).map((link) => `<a class="pill" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join('')
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
      ${links ? `<div class="d-actions">${links}</div>` : ''}`
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

  let chipsShown = ''
  function setChips(list) {
    const html = list.map((text) => `<button type="button" class="chip">${escapeHtml(text)}</button>`).join('')
    if (html === chipsShown) return
    chipsShown = html
    chips.innerHTML = html
  }
  const starters = chat && chat.script.start.next.length ? chat.script.start.next : SUGGESTIONS
  setChips(starters)
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
    const isTalk = talking && talk.length > 0
    const hasDetail = !isTalk && !isTyping && Boolean(state.panel || state.focus)
    const hasAnswer = !isTalk && !isTyping && (Boolean(blank) || Boolean(note) || away)
    const mode = isTalk ? 'talk' : isTyping ? 'typing' : hasDetail ? 'detail' : hasAnswer ? 'answer' : 'idle'

    if (isTalk || talkLog.firstChild) renderTalk()
    if (isTalk) {
      const last = talk[talk.length - 1]
      setChips(last.pending ? [] : last.next)
    } else {
      setChips(starters)
    }
    show('talk', isTalk)
    if (hasAnswer) renderAnswer(state)
    if (hasDetail) {
      if (state.panel) renderPanel(state.panel)
      else renderWork(state)
    }
    show('detail', hasDetail)
    show('answer', hasAnswer)
    if (!hasAnswer) openSlot = null
    renderMenu()
    show('plan', isTyping && (!isTalk || planUseful))
    show('chips', mode === 'idle' || Boolean(blank) || (isTalk && !isTyping && chipsShown !== ''))
    if (lastMode && mode !== lastMode && mode !== 'typing' && lastMode !== 'typing' && mode !== 'talk' && lastMode !== 'talk') cue('shape')
    lastMode = mode
    mount.dataset.mode = mode
    input.placeholder = mode === 'talk' ? 'Say something back' : mode === 'detail' ? 'Ask for something else' : 'Ask me anything'
  }

  director.subscribe(() => {
    // The visitor moved the board themselves (a card, a key, Back): the
    // conversation steps aside. Reframes and our own answers keep it.
    if (talking && !previewing && !ownMove && viewKey() !== talkView) talking = false
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
