// Loads app/content/content.json, the one place the site's content lives.
// The Claude proxy (later) reads the same file, so the two cannot drift apart.

const CONTENT_URL = new URL('../content/content.json', import.meta.url)

export function imgUrl(name) {
  return new URL(`../img/${name}.jpg`, import.meta.url).href
}

// Checks the shape once at load so a typo in the JSON fails loudly here and
// not as a strange layout later. Returns the same data with lookups attached.
export function prepareContent(data) {
  if (!data || !Array.isArray(data.works) || !Array.isArray(data.kinds)) {
    throw new Error('content.json needs "works" and "kinds" arrays')
  }
  const kindIds = new Set(data.kinds.map((kind) => kind.id))
  const seen = new Set()
  for (const work of data.works) {
    if (!work.id || seen.has(work.id)) throw new Error(`content.json: missing or repeated id "${work.id}"`)
    seen.add(work.id)
    if (!kindIds.has(work.kind)) throw new Error(`content.json: "${work.id}" has unknown kind "${work.kind}"`)
    if (!Number.isFinite(work.proud)) throw new Error(`content.json: "${work.id}" needs a "proud" rank`)
    if (!Array.isArray(work.tags)) throw new Error(`content.json: "${work.id}" needs a "tags" array`)
  }
  const byId = new Map(data.works.map((work) => [work.id, work]))
  const kindById = new Map(data.kinds.map((kind) => [kind.id, kind]))
  return { ...data, byId, kindById }
}

export async function loadContent() {
  const response = await fetch(CONTENT_URL)
  if (!response.ok) throw new Error(`Could not load content.json (${response.status})`)
  return prepareContent(await response.json())
}
