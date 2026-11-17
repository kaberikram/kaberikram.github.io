// The bar: one surface that changes shape to fit the moment.
//
//   idle     a pill with a few things to try
//   typing   a plan line says what is about to happen; understood words are
//            underlined; the board previews it live. Enter commits.
//   answer   one sentence with editable blanks: "Here's my [proudest] work [of
//            any kind], shown as [a board]." Change a blank, the board follows.
//   detail   the focused work, with its facts (only without the chat).
//   talk     one conversation for everything: what the visitor said, what
//            you say back (from app/content/chat.md), and the works being
//            looked at, as small cards inside the conversation. Picking a
//            work on the board, or an answer that flies to one, adds it to
//            the same thread; "Tell me about it" carries on talking. A line
//            under the conversation says what the board shows, with blanks
//            to rearrange it, so nothing ever swaps the chat away.
//
// It never moves a card itself. It reads the director's state and sends it
// Commands, like every other input.

import { SUGGESTIONS, LAYOUT_TEXT, describe, parse, sortText } from '../brain/parse.js'
import { hasFilter, toHash } from '../brain/command.js'
import { escapeHtml } from '../util.js'
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

  // The conversation, oldest first. Two kinds of entry:
  //   { type: 'ex', said, reply, next, pending, fresh, piece }   an exchange;
  //       piece is the work the answer brought forward, if any
  //   { type: 'piece', id, fresh }   a work the visitor picked on the board
  let talk = []
  let lastFocus = null
  const KEEP = 6
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
    if (chat && result.understood && result.boardChange) {
      boardInTalk(text, result)
      return
    }
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

  function push(entry) {
    talk.push(entry)
    talk = talk.slice(-KEEP)
    talking = true
  }

  // The newest entry that carries a work: its card is shown in full.
  function liveEntry() {
    for (let i = talk.length - 1; i >= 0; i--) {
      const e = talk[i]
      if (e.type === 'piece' || (e.type === 'ex' && e.piece)) return e
    }
    return null
  }
  const pieceOf = (e) => (e.type === 'piece' ? e.id : e.piece)

  // Board-only asks ("just the AR work") are answered in the conversation too.
  function boardInTalk(said, result) {
    finishTyping()
    cue('confirm')
    blank = null
    openSlot = null
    const asked = hasFilter(result.command)
    ownMove = true
    director.apply(result.command, { url: 'push' })
    ownMove = false
    const state = director.getState()
    const empty = asked && !hasFilter(state.command)
    const reply = empty
      ? 'Nothing matched all of that, so here is everything.'
      : `${describe(result, content).replace(/^Showing/, "Here's").replace(/^Going to /, 'Here is ')}.`
    push({ type: 'ex', said: said.trim(), reply, next: chat.script.start.next, pending: false, fresh: true, piece: state.focus || null })
    lastFocus = state.focus
    talkView = viewKey()
    if (touch) input.blur()
    render()
  }

  // A work picked on the board joins the conversation. Stepping through works
  // replaces the card at the end instead of piling them up.
  function notePiece(id) {
    const last = talk[talk.length - 1]
    if (last && last.type === 'piece') {
      if (last.id !== id) {
        last.id = id
        last.fresh = true
      }
    } else if (!(last && last.type === 'ex' && last.piece === id)) {
      push({ type: 'piece', id, fresh: true })
    }
    talking = true
  }

  // What you say about one work: a written topic if one points at it,
  // otherwise its own summary, in your voice.
  function tellAbout(id) {
    const work = content.byId.get(id)
    const said = `Tell me about ${work.title}`
    const exchange = { type: 'ex', said, reply: null, next: [], pending: true, fresh: false, piece: null }
    push(exchange)
    render()
    const began = performance.now()
    chat.hear(said, { wait: 2500 }).then((heard) => {
      let reply = null
      let next = chat.script.start.next
      if (heard.topic && heard.level !== 'none' && heard.topic.show) {
        const shown = parse(heard.topic.show, content)
        if (shown.command.focus === id || shown.workId === id) {
          reply = chat.answer(heard.topic)
          if (heard.topic.next.length) next = heard.topic.next
        }
      }
      if (!reply) {
        const mail = `mailto:${content.owner.email}?subject=${encodeURIComponent(`About ${work.title}`)}`
        reply = work.summary
          ? `${work.summary} If you want the longer story, [write to me](${mail}).`
          : `${work.title}: ${work.line}. I haven't written the long version here yet, so [write to me](${mail}) and I'll tell you properly.`
      }
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
      const pause = reduce ? 0 : Math.max(0, Math.min(1100, 320 + reply.length * 4) - (performance.now() - began))
      setTimeout(() => {
        if (!talk.includes(exchange)) return
        exchange.reply = reply
        exchange.next = next
        exchange.pending = false
        exchange.fresh = !reduce
        cue('confirm')
        render()
      }, pause)
    })
  }

  function step(entry, delta) {
    const list = director.getState().results
    const at = list.indexOf(pieceOf(entry))
    if (at < 0 || list.length < 2) return
    const id = list[(at + delta + list.length) % list.length]
    if (entry.type === 'piece') entry.id = id
    else entry.piece = id
    entry.fresh = true
    lastFocus = id
    ownMove = true
    director.focus(id)
    ownMove = false
    render()
  }

  // Hear the words, then either answer in conversation or hand them to the
  // board. A clear board request ("just the AR work") goes to the board unless
  // the chat is sure; anything else the chat gets first. While the sentence
  // model is still loading, a question that is not a board request waits a
  // few seconds for it rather than guess from words.
  function converse(said, result) {
    const exchange = { type: 'ex', said, reply: null, next: [], pending: true, fresh: false, piece: null }
    const restore = previewing && committed ? committed : null
    finishTyping()
    blank = null
    note = null
    openSlot = null
    push(exchange)
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
        // The work the answer flew to sits right under it, in the conversation.
        const focus = director.getState().focus
        if (shown && shown.boardChange && focus) exchange.piece = focus
        lastFocus = focus
        talkView = viewKey()
        talking = true
        render()
      }, pause)
    })
  }

  function pieceHtml(id, live) {
    const work = content.byId.get(id)
    const kind = content.kindById.get(work.kind)
    if (!live) {
      return `<button type="button" class="piece-mini" data-id="${work.id}"><span class="pm-title">${escapeHtml(work.title)}</span><span class="pm-line">${escapeHtml(work.line)}</span></button>`
    }
    const state = director.getState()
    const at = state.results.indexOf(id)
    const many = at >= 0 && state.results.length > 1
    const facts = [work.when, work.role, (work.tools || []).join(', ')].filter(Boolean)
    const links = (work.links || []).map((link) => `<a class="pill" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join('')
    const mail = `mailto:${content.owner.email}?subject=${encodeURIComponent(`About ${work.title}`)}`
    return `
      <div class="piece${state.focus === id ? ' is-shown' : ''}" data-id="${work.id}">
        <div class="p-top">
          <span class="d-kind">${escapeHtml(kind.label)}</span>
          ${many ? `<span class="d-nav"><button type="button" data-act="prev" aria-label="Previous work">‹</button><span class="d-count">${at + 1} of ${state.results.length}</span><button type="button" data-act="next" aria-label="Next work">›</button></span>` : ''}
        </div>
        <h3 class="p-title">${escapeHtml(work.title)}</h3>
        <p class="p-line">${escapeHtml(work.line)}${facts.length ? `<span class="p-facts"> · ${escapeHtml(facts.join(' · '))}</span>` : ''}</p>
        <div class="p-actions"><button type="button" class="pill dark" data-act="more">Tell me about it</button>${state.focus === id ? '' : '<button type="button" class="pill" data-act="look">Show me</button>'}${links}<a class="pill quiet" href="${mail}">Write to me about it</a></div>
      </div>`
  }

  let talkShown = ''
  function renderTalk() {
    // Only when something changes, so a fading-in answer is never cut short.
    const state = director.getState()
    const live = liveEntry()
    const key = JSON.stringify([talk.map((e) => [e.type, e.said, e.reply, pieceOf(e)]), live && pieceOf(live), state.focus, state.results.join()])
    if (key === talkShown) return
    talkShown = key
    talkLog.innerHTML = talk.map((e, i) => {
      const past = i < talk.length - 1 && e !== live
      if (e.type === 'piece') return `<div class="ex is-piece${e === live ? '' : ' past'}${e.fresh ? ' fresh' : ''}">${pieceHtml(e.id, e === live)}</div>`
      const reply = e.pending ? '<p class="reply dots" aria-label="Thinking"><i></i><i></i><i></i></p>' : `<p class="reply${e.fresh ? ' fresh' : ''}">${answerHtml(e.reply, escapeHtml)}</p>`
      const card = e.piece ? `<div class="ex-piece${e === live && e.fresh ? ' fresh' : ''}">${pieceHtml(e.piece, e === live)}</div>` : ''
      return `<div class="ex${past ? ' past' : ''}"><p class="said">${escapeHtml(e.said)}</p>${reply}${card}</div>`
    }).join('')
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
      // The card under an answer comes in once the words have.
      const card = fresh.parentElement.querySelector('.ex-piece.fresh')
      if (card) card.style.setProperty('--after', `${Math.min(1400, i * 34 + 200)}ms`)
    }
    for (const e of talk) e.fresh = false
    talkLog.scrollTop = talkLog.scrollHeight
  }

  talkLog.addEventListener('click', (e) => {
    const mini = e.target.closest('.piece-mini')
    if (mini) {
      director.focus(mini.dataset.id)
      return
    }
    const target = e.target.closest('button[data-act]')
    if (!target) return
    const live = liveEntry()
    if (!live) return
    const act = target.dataset.act
    if (act === 'next') step(live, 1)
    else if (act === 'prev') step(live, -1)
    else if (act === 'more') tellAbout(pieceOf(live))
    else if (act === 'look') {
      lastFocus = pieceOf(live)
      ownMove = true
      director.focus(pieceOf(live))
      ownMove = false
      render()
    }
  })

  function endTalk() {
    talk = []
    talking = false
    // The conversation was what explained the work in view; leave with it.
    if (chat && director.getState().focus) director.unfocus()
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
    } else if (talking && director.getState().focus) {
      director.unfocus()
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
    if (talking && talk.length && !blank) {
      const where = c.kind ? `in ${kindLabel(c.kind)}` : 'of any kind'
      html = `<p class="sentence board-line"><span class="bl-lead">On the board</span> my ${slot('sort', sortText(c.sort))} work ${slot('kind', where)}, as ${slot('layout', LAYOUT_TEXT[c.layout])} <span class="count">${state.results.length} piece${state.results.length === 1 ? '' : 's'}</span></p>`
    } else if (blank) {
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
    // With the chat, a focused work lives inside the conversation, never as a
    // separate card that replaces it.
    const hasDetail = !isTalk && !isTyping && Boolean(state.panel || (state.focus && !chat))
    const hasAnswer = !isTyping && (isTalk || Boolean(blank) || Boolean(note) || away)
    const mode = isTalk ? 'talk' : isTyping ? 'typing' : hasDetail ? 'detail' : hasAnswer ? 'answer' : 'idle'

    if (isTalk || talkLog.firstChild) renderTalk()
    if (isTalk) {
      const last = talk[talk.length - 1]
      setChips(last.type === 'piece' ? starters : last.pending ? [] : last.next)
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
    const now = director.getState()
    if (!chat) {
      if (talking && !previewing && !ownMove && viewKey() !== talkView) talking = false
    } else if (!previewing && !ownMove && now.focus && now.focus !== lastFocus && !now.panel) {
      // A work picked on the board (click, tap, arrow keys, a link): it
      // joins the conversation instead of replacing it.
      notePiece(now.focus)
    }
    if (!previewing) lastFocus = now.focus
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
