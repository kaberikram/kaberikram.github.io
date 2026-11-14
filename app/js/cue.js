// A named moment worth hearing ("focus", "type", "deal"...). Parts of the page
// announce cues; the sound engine, if present and allowed, plays them. Nothing
// that calls cue() knows or cares how a cue sounds.

export function cue(name, detail = {}) {
  dispatchEvent(new CustomEvent('cue', { detail: { name, ...detail } }))
}
