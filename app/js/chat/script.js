// Reads app/content/chat.md: topics, the ways people ask about them, what to
// say back. Pure functions, so tests import this file in Node.

export const START = '(start)'
export const NOTHING = '(nothing fits)'

// How a question is compared: lower case, curly quotes straightened,
// contractions opened up, punctuation gone. The same function keys the
// precomputed vectors, so a question only needs embedding once.
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\b(what|where|who|how|when|why|that|it|there)'s\b/g, '$1 is')
    .replace(/\b(you|we|they)'re\b/g, '$1 are')
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\b(\w+)n't\b/g, (_, w) => (w === 'can' ? 'can not' : w === 'won' ? 'will not' : `${w} not`))
    .replace(/\b(\w+)'(ve|ll|d)\b/g, (_, w, x) => `${w} ${{ ve: 'have', ll: 'will', d: 'would' }[x]}`)
    .replace(/\bu\b/g, 'you')
    .replace(/\bur\b/g, 'your')
    .replace(/[^\p{L}\p{N}\s.+#]/gu, ' ')
    .replace(/(^|\s)\.+|\.+(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function readScript(text) {
  const topics = []
  let topic = null
  for (const raw of String(text).split(/\r?\n/)) {
    // Indented lines are examples and notes, never read.
    if (/^[ \t]/.test(raw)) continue
    const line = raw.trim()
    const head = /^##\s+(.+)$/.exec(line)
    if (head) {
      topic = { name: head[1].trim(), questions: [], answers: [], show: null, next: [], guess: false }
      topics.push(topic)
      continue
    }
    if (!topic) continue
    const field = /^(Q|A|Show|Next):\s*(.+)$/i.exec(line)
    if (field) {
      const key = field[1].toLowerCase()
      const value = field[2].trim()
      if (key === 'q') topic.questions.push(value)
      else if (key === 'a') topic.answers.push(value)
      else if (key === 'show') topic.show = value.replace(/\s+\(.*\)$/, '')
      else if (topic.next.length < 3) topic.next.push(value)
    } else if (/^guess$/i.test(line)) {
      topic.guess = true
    }
  }
  const special = (name) => topics.find((t) => t.name === name) || { name, questions: [], answers: [], show: null, next: [], guess: false }
  return {
    topics: topics.filter((t) => t.name !== START && t.name !== NOTHING && t.questions.length && t.answers.length),
    start: special(START),
    nothing: special(NOTHING),
  }
}

// Answers may hold [text](url) links. Everything else is plain text.
export function answerHtml(text, escapeHtml) {
  let html = ''
  let at = 0
  for (const m of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    html += escapeHtml(text.slice(at, m.index))
    const url = m[2]
    const safe = /^(https?:|mailto:|\/|#)/i.test(url)
    const outside = /^https?:/i.test(url)
    html += safe
      ? `<a href="${escapeHtml(url)}"${outside ? ' target="_blank" rel="noopener"' : ''}>${escapeHtml(m[1])}</a>`
      : escapeHtml(m[1])
    at = m.index + m[0].length
  }
  return html + escapeHtml(text.slice(at))
}

// The plain words of an answer, for screen readers and tests.
export function answerText(text) {
  return text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
}
