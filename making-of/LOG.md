# Making of

A dated log of how the site got here, newest at the bottom. Each entry says
what changed, why, and which tag or commit to film it from. Add to it as you
go: two or three lines is enough.

Filming any entry: `node tools/capture.mjs <tag>` (see README).

---

## 2026-11-05 · v0-glass · `c6b48f8`
The starting point of this redesign: `/progress`, a curved sphere of
liquid-glass tiles with a refracting caption, WebGL for both. Beautiful, but
only drag-to-wander: no way to ask for anything, and heavy on phones.

## 2026-11-13 · v1-paper-board · `58669c2`
**The idea:** one open board in 3D space, with a chat/search bar that is alive.
Ask for "your proudest work" and the camera and the work move together.

Studied first: the adaptive-UI video (a pill that becomes a card and back),
the hand-control video (paper cards with real depth, a stack that deals out
into a row, behaviour only, no hand tracking), Bruce Liu's *Beyond Taking
Turns* (feedforward: show the plan while typing; leaving blanks: answer with
fill-in slots), the Embercrest card, a sketchbook page, and a still from *Her*.

Built: paper cards on springs, a camera that flies, five arrangements, one
`Command` for everything (click, key, link, later the bar), URL for every view.
Chose DOM + CSS 3D over three.js: crisp text, real links, no build step.

## 2026-11-13 · feedback round 1
"It feels like a traditional idea board. Things are too messy, tilted. It
should be more like the *Her* still, with the depth being obvious."

Tune values sent back: square corners, pale field, tight spacing, strong depth
(`tune/2026-11-13-first-feedback.json`). Taken as the new defaults.

## 2026-11-13 · v2-bar · `bda701a`
**Board:** every tilt removed. Clusters in tidy rows, works on three depth
planes (proudest nearest), shadow + haze + a touch of blur per depth step.
Labels went from handwriting to small plain caps.

**Bar:** one surface that changes shape (pill, typing, answer, detail).
Understood words underlined as you type, a plan line in your voice, the board
previewing live, Esc to abandon. The answer is a sentence with editable blanks.
A request it can't read gets a blank to fill, never an error.

Bug worth a shot in the video: the live preview focused the previewed card and
stole keyboard focus mid-sentence. Found while filming it; fixed the same hour.

Next: card design, then the Claude fallback for asks the on-device brain can't
read.
