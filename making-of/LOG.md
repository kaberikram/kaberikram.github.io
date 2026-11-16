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

## 2026-11-14 · the flight, rebuilt
"The only sound that needs to be better is flight. Now it's sharp and harsh;
needs to sound effortless, lush, clean and impactful." (Flight had been turned
down to 0.1 in Tune.)

Measured the old one: centre 5.1 kHz, half its energy above 4 kHz. First
rebuild overcorrected to a 69 Hz rumble that laptop speakers can't play; the
soft noise also hid low drift and isolated spikes. Fixed both at the source.
Final: warm air in stereo with a body, an impact on long flights and a landing,
centred near 250 Hz, clean above 4 kHz. Short hops whisper, drifts are silent.
Tune values from this round are the new defaults; saved settings reset (v3) so
the flight starts at its new level, 0.5.

## 2026-11-15 · open air, and three card styles to compare
"It's supposed to be a spatial mindmap moodboard, but a shadow on the card
makes it seem like I'm placing everything on a wall. I want it to feel like an
infinite white space." Then: "Pastel sunset. As Spike Jonze as possible. I
really like no card, just image with text below. Do A/B testing."

Why it read as a wall: a shadow needs a surface to land on, the flat warm
canvas looked like that surface, and the white frame looked like a print
pinned to it. Removed all three. No card casts a shadow now; far works thin
out into the air (they turn see-through instead of being tinted) and lose a
little focus. The canvas is a pastel sunset with no edge anywhere: warm light
from far below the frame, a cool sky in the top corner.

Three card styles, switchable live (Tune panel, Cards, Style) or by link:
`/progress/?card=bare`, `?card=file`, `?card=paper`.
- **bare** (default): just the picture, title and date under it.
- **file**: soft corners, one small line under it set like a file name.
- **paper**: the old white sheet with a hairline, minus the shadow.

Stills of each in `captures/2026-11-15-card-ab/`. Saved settings reset (v4) so
the new canvas shows. Not yet restyled to match: the bar, labels and header.

## 2026-11-15 · hand-cut edges, and a room instead of a backdrop
"Let's go with style A, but with not so clean edges, like the boxes are hand
drawn. No frames please! Raw. Also why does the layout and background still
feel flat? I want the spatial endless white room effect."

**Edges.** Every picture is now cut by hand: its outline is a wandering polygon
made from the work's id, so each is different and none is a clean box
(`roughEdge` in `board.js`; Tune, Cards, Hand-drawn edge). No frame, no line.

**Why it was flat, and what changed.**
- The works were packed edge to edge in tidy rows, with only a 2x difference
  in size from front to back. Now there is air between them, they sit off the
  grid, and the space runs almost twice as deep (depth 1.8).
- The camera looked at everything square-on, so nothing shared a vanishing
  direction. The room is now seen from 9 degrees to one side; a focused work
  squares up to be read (Tune, Space, Room angle).
- The background was a wash of colour. It is now a place: pale overhead, a
  glowing horizon low in the frame, a paler floor coming back toward you. It
  slides when the view turns and holds still when the camera travels, the way
  something very far away does.
- The nearest, proudest works used to go soft. Now they are the sharp ones and
  the room fades only with distance. Far works wash out toward the light
  instead of turning see-through.
- The board is laid out for where the camera will really stand, and framed
  with the room's angle counted, so every work still lands on screen.

Stills in `captures/2026-11-15-open-room/`. Saved settings reset (v5).

## 2026-11-15 · what the site is for
Ikram, on the philosophy of the whole site: "I want it to feel like meeting the
love of your life for the first time, having a conversation. That's why the
main interaction is a chat, so you can talk to me, get to know me. The first
social interaction of humans is talking to another. And also like cavemen
leaving their paintings on the world, like an artist displaying their art."

Two things to hold every later choice against: the bar is a conversation, not
a search box; the works are marks left by a hand, not products on a shelf.

## 2026-11-15 · too much colour
"The background colour is too much. I think this is why it feels flat, not an
endless room." Agreed: a strong colour across the whole frame reads as a
surface. The canvas is now pure white; the sunset is only a faint warm glow at
the horizon and a hint of sky in one corner (bloom strength 0.55, was 0.9).
Space is shown by the works' size, focus and the room angle, not by paint.
Saved settings reset (v6).

## 2026-11-15 · colour A/B, away from the Claude look
"Need to do some A/B testing for the colours. I feel like I'm a child of
Claude now." Fair: cream, peach and terracotta are the house colours of
everything Claude makes, and the board had drifted into them.

Five directions, switchable live (Tune, Canvas, Palette) or by link
(`/progress/?palette=daylight`, `gallery`, `dusk`, `lagoon`, `peach`):
- **daylight** (default for now): white air with a cool blue lifting off the
  floor, from the meme-board reference.
- **gallery**: pure white and grey; all colour comes from the works.
- **dusk**: lilac air, pink-gold horizon (the colour reference's pastels).
- **lagoon**: soft blue-green with an edge of sand (the same reference's sea).
- **peach**: the old warm one, kept only to judge the others against.

Stills in `captures/2026-11-15-palettes/`. Not decided yet.

## 2026-11-15 · windows you look into
"How do we make each tile feel like there's depth? Like looking into a portal.
Some shader trick, like the Apple ads Spike Jonze did, pushed-in walls."

No shader needed. Each picture is now a shallow box: the work is on the back
wall, a little smaller for being further away, and four inner walls run back
to it. The back wall slides toward wherever the eye is pointed and swings with
the lean, so moving the pointer or flying the camera changes what you see
inside every window at once. The walls take their colour from the work itself,
out of focus, like a lit room spilling onto its own walls; the ceiling is in
shade and the floor catches light. The opening keeps its hand-cut edge.

It is plain geometry in CSS (`cards.css`, "The picture is a window"), driven
by two numbers per card from `board.js`. Tune, Cards, Window depth; 0 turns it
off. Stills in `captures/2026-11-15-windows/`. Saved settings reset (v7).

Also from Ikram, "some feeling of how I feel when I look at my website": a
huge pale gridded sheet with a few tiny figures, umbrellas and pencil marks
scattered on it, joined by thin arrows and dotted lines. Small things, vast
emptiness, a little colour, the hand visible. Kept as the measure for scale
and emptiness (not stored here; it is someone else's work).

## 2026-11-15 · the walls on a phone
"On mobile you don't have the depth or the texture on the walls." True: phones
turned the wall colour off to save power, so the windows were only a frame.
Now phones keep the walls' colour: the same picture held a little larger and
faded, with no blur (the blur was the expensive part). Still in
`captures/2026-11-15-windows/phone-walls.png`.

## 2026-11-15 · no blur at all, darker walls
"I think without blur is the way to go! Darken the depth area a bit, and we
can make a fake light blur that's optimised and subtle."

The blur filter is gone on every device. The softness is faked for free: the
wall picture is drawn more than three times too large, so the browser's own
stretching smooths it into broad colour. A dark wash sits over it and the wall
shading is deeper, darkest where the walls meet the work, so the recess reads
as shadowed depth and the work as the lit thing at the back.


## 2026-11-15 · streaks
"Wait, the stretch doesn't have line streaks like the Apple ad, Spike Jonze?"

It did not: the walls were the whole picture scaled up into soft colour. Ikram
had asked for the stretching room in "Welcome Home" earlier ("is texture
stretching like Spike Jonze expensive? let's do that instead") and it was
misread as a question about speed.

Now each wall is painted with the edge of the work itself, pulled out long:
the last few rows of pixels stretched forty times, so every colour on the
picture's edge runs toward you as a streak, and the streaks meet the work
exactly where they came from. To make them converge properly, the window
became a real little room: four walls and a back as planes in 3D inside each
picture, instead of flat shapes redrawn every frame. While the room moves the
browser only shifts one vanishing point per picture. Still no blur. Measured
the same way as before (emulated phone), it runs about as fast as the last
version, 33 against 32.5 frames a second.

Also: the board no longer leans toward the pointer for people who ask their
device for less motion. Stills in `captures/2026-11-15-windows/`
(`streaks-closeup.jpg`, `streaks-phone.jpg`).

## 2026-11-16 · the helper, cleaner
"This is a stretch, but let's improve the helper UI! Make it cleaner and
modern, nice spacing."

The bar at the bottom (where you talk to the board) kept its first look while
the board around it became an open white room. Now it belongs to that room:

- A hairline edge and a faint cool haze instead of a heavy drop shadow, and a
  frostier glass.
- One rhythm: the same side margin everywhere, a 4px grid, one hairline, two
  greys.
- Suggestions and choices are thin outlined pills, filled only when chosen.
- The answer sentence reads as words, not boxes: the parts you can change are
  bold with a dotted underline and a small caret that flips when open.
- Under a work, that sentence steps back to a quiet line of context below a
  hairline, so the work's title leads.
- The send arrow waits greyed until there is something to send.
- On a phone both suggestions fit on one line.

Before and after in `captures/2026-11-16-helper/`.
