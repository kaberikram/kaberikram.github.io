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

## 2026-11-13 · tooling
`tools/capture.mjs` films any tag or commit (stills, optional clip);
`tools/demo.mjs` renders a scripted 60fps demo by stepping the browser's clock.
First demo: deal-in, ask for proudest work, fly-to, step, edit a blank, timeline.

## 2026-11-13 · demo fix
First 60fps demo played far too fast: each screenshot makes the browser render
several frames at once, so springs and CSS transitions ran 3 to 8x ahead.
Fixed by giving the page its own clock (timers, animation frames and CSS
animation time all advance exactly 1/60s per step). Rendering it also showed
a real flaw: the opening deal skipped its stagger, so every card flew out at
once. It now deals out proudest-first.

## 2026-11-13 · housekeeping
Cover images resized to 1280px wide (1.69 MB to 0.99 MB, same look at the sizes
shown). Added a GitHub Action that runs `npm test` on every PR. Generated
`content-checklist.md`: 83 gaps across 19 works, the main thing keeping the
detail cards thin.

## 2026-11-13 · colour dots removed
Said "looks vibecoded as hell": the coloured dot per kind of work (on cards,
cluster labels, the bar and About) is gone everywhere, and the colours are out
of the content file. Text-only cards are now a plain warm grey. Kind is still
shown by the cluster label and the bar's kind name.

## 2026-11-13 · bar: back to the original, chips fixed
The flatter rebuild lost what worked: "rounded looks better, the original bar
was great, just that the chips run off." Restored the original rounded bar and
fixed only the chips: they wrap instead of scrolling, two in the idle pill and
a third once it is open (two on a phone). Kept one invisible fix, the sentence
now says "shown as a board". A new test checks no chip crosses the bar's edge
in any state, on desktop and phone.

## 2026-11-13 · the board becomes a space
"All the tiles lay on the canvas, seems flat, there's no depth in z. I want it
to feel like real 3D spatial, so when the camera moves it's moving spatially."

Why it was flat: the camera never travelled in depth (focus fetched the card to
a front plane), the lens was long, depth cues were fixed per card, and the lean
was 2 degrees.

Now: depth runs continuously from the proudest work (near) to the least (far
back, 1350 units), every card the same real size. Wider lens. Focusing flies
the camera to the card where it lives, passing others on the way; long trips
pull back and push in. Haze, blur and shadow are measured from the camera, so
things sharpen as you approach; cards in front of the focal depth go soft and
see-through; cards at the eye fade out. The lean pivots on what you look at
(up to 5 degrees), so near and far slide against each other. Scrolling travels
in depth along the ray under the pointer.

Also read a teardown of tsubi.club and diana.lu. Taken: one signature done
fully (this camera), one motion language. Later, maybe: a small recorded sound
kit with mute, cued by flights. Left: their palettes, fonts, cursors, wording.

## 2026-11-14 · sound
"No sfx yet?" Chose: every sound generated in the browser, no files; cues for
flights, focus and close, typing and the bar, deal and card handling.

One engine listens for named cues and never starts on its own (first tap or
key wakes it, a speaker button turns it off and is remembered). The flight is
a continuous whoosh driven by camera speed, brighter flying in than back. Card
sounds are panned by screen position and quieter with distance. It sleeps
after four quiet seconds.

Couldn't listen here, so rendered every sound offline to WAV and measured:
nothing clips, but the first pass had ticks near -40 dBFS under a -17 dBFS
whoosh. Rebalanced so notes peak about -18, ticks about -26, whoosh -21.
Renders and levels in `sounds/`.
