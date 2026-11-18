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

## 2026-11-16 · the Tune helper, cleaner
"Wait, I meant the helper UI, not the other UI." The helper is the Tune panel,
the corner button with all the sliders used to try things on the board.

It was a dark slab of default browser sliders and colour boxes. Now it is the
same white glass as the bar:

- Light frosted panel with a hairline edge, one side margin, groups split by a
  single hairline.
- Thin sliders filled in ink up to a small white handle.
- Named settings (palette, card style) are pills to tap instead of sliders.
- Colours are one line each: name, hex code, round swatch.
- Reset, Copy and Paste stay pinned at the bottom while the settings scroll.
- The corner button has a small slider icon and fills in ink when open.

Before and after in `captures/2026-11-16-tune/`.

## 2026-11-16 · the bar talks back
"So we can make a conversational AI chat without even using LLM credit? Some
stuff that we can pre-bake about myself?"

Yes. The bar is now a conversation. Ask "who are you?" or "where do you
live?" and Ikram answers, in a sentence that arrives a word at a time after a
short pause, like someone gathering a thought. The visitor's words sit above
it, small and quiet; the exchange before fades back. Some answers move the
board too ("tell me about Dreampop" flies to it). Board requests ("just the
AR work") still work as before.

No server and no LLM. Every answer is written ahead of time in
`app/content/chat.md`, a plain text file of topics: ways people might ask,
what to say back. Choosing the answer happens on the visitor's device in two
ways: shared words (instant, and exact for the suggested questions), and a
small sentence model (all-MiniLM-L6-v2, about 23 MB, loaded the first time
someone opens the bar, then cached) that matches by meaning, so "where do u
live" finds "where are you based". Nothing typed leaves the device. When no
topic is close enough it says so kindly and offers other questions, instead of
guessing. If the model can't load, it carries on with words alone.

The starter answers were drafted from what the site already says; the ones
marked `Guess` are not yet Ikram's words. Stills in `captures/2026-11-16-chat/`.

## 2026-11-17 · the answers become Ikram's
Asked Ikram twenty questions to check the drafts. The first round of answers
went straight into `chat.md`: based in KL, design and dev both, Reality to
bend as the proudest piece (and why), the TIC Corp game in progress, music
outside work. Only "how are you" is still a guess.

## 2026-11-17 · more to ask about
Grok went through the public record and the chat grew from 25 topics to 40:
education, how the AR work started, the Ghost Catch story, hackathons, press,
EPF, SHXFT, music and more. The research notes themselves stay out of the
repo. TIC Corp is now described in the label's own words, and Tep York (TY) is
simply named as the collaborator on the game until there is more to say. The
new answers marked `Guess` are drafts still waiting for Ikram's words.

## 2026-11-17 · our own letters
"Study allo.joshpuckett.me, make our own font and use it for my website."

Allo is a friendly sans by Josh Puckett: Inter redrawn, with a made-up axis,
Roundness, that slides each letter from sharp to round. The lesson taken from
it: a font can carry a feeling as an axis, not just a weight.

So the board now has its own typeface, **Kertas** (Malay for paper). Nothing
is borrowed from Allo or Inter: every letter is drawn from scratch as a
skeleton, the line a pen would travel (`tools/kertas/glyphs.py`), and a small
script strokes it with a round pen into a variable font
(`tools/kertas/build.py` → `app/fonts/Kertas.woff2`, about 48 KB, 107
characters). Sharp turns become separate strokes, so every joint is soft.

Two axes:

- **Weight** (300–700), how wide the pen is.
- **Hand** (0–100), our own axis. At 0 the letters are the clean drawing. At
  100 the strokes drift a little and each letter sits a touch off the line at
  its own small angle. The site uses 35. It is a slider in Tune ("Letters,
  hand-cut").

Kertas replaces Archivo: the name in the corner, the group labels, card
titles, the open card's title, and Ikram's side of the conversation, so the
answers read as their voice. Inter stays for the small working text (the
input, pills, dates, details). Stills in `captures/2026-11-17-kertas/`.

Same day, after the first look: "so cute! can we improve this font, less paper
drawing like but similar." The first cut had scissor edges: rough outlines and
visible facets. Now the curves are smooth, the edges are clean, and the hand
axis only nudges letters off the line instead of roughing them up. Two
type-designer touches came in too: horizontals are a little thinner than
verticals, and where an arch grows out of a stem (n, m, h, u, r) it thins, so
the joins stay open when the letters are small. `specimen.png` compares
before and after.

Then: "inter swap with allo?" The working text (input, pills, dates,
details, Tune) is now Allo itself, Josh Puckett's font, self-hosted under its
open licence (`app/fonts/allo/`, with `OFL.txt`; cut down to Latin, about
150 KB). So the pair is Kertas for Ikram's voice and Allo for everything
around it. The page no longer loads anything from Google Fonts.

## 2026-11-17 · one conversation
"So far the feeling of my portfolio feels livelier and really magical! But
these 2 different modes [are a] bit disjointed... I feel like we should go
towards the chat-ish vibe, but it's alive and you can choose to arrange."

Until now the bar had two faces that took turns. Talking showed the answer;
looking at a work showed a separate detail card that swapped the
conversation away, and to get from one to the other you had to click off and
click the window again.

Now there is only the conversation. When an answer flies to a work ("what are
you proudest of?"), that work appears as a small card right under the reply:
its kind, title, line and date, ‹ 1 of 5 › to walk the others, and "Tell me
about it", which simply carries on talking (a written answer if one points at
that work, otherwise its own summary in Ikram's voice). Picking a work on the
board does the same: it joins the conversation, and earlier works fold to a
single line you can tap to look again. Esc steps back from the work but keeps
what was said; × ends the conversation and lets the board go.

Arranging stays in reach the whole time: a quiet line under the conversation
says what the board shows ("my [proudest] work [of any kind], as [a board]"),
and each blank can be changed without leaving the chat. Board asks typed into
it ("just the AR work") are answered in the conversation too. Cards can still
be picked up and moved on the board.

Stills in `captures/2026-11-17-one-conversation/`.

Tried live the same evening, then rolled back: "feels a bit too much now! I
think before was better, we have separation, just needed a bit of learning
curve." Talking and looking at a work stay as two modes for now. The stills
above are kept as a record of the experiment.

## 2026-11-17 · the blanks float
"remove ask me about this! and then when tapping on category we make it like a
floating dropdown like this image, also on these tappable category we use
kertas! also make sure the highlight etc not so heavy so it doesnt feel
cluttered"

The work card loses its black "Ask me about this" button; the bar under it is
already the way to ask. The blanks in "Here's my [newest] work [of any kind],
shown as [a board]" are now words in Kertas with a faint underline instead of
grey pills. Tapping one floats a small soft sheet over the card, anchored on
the word: the current choice sits exactly where the word was, the others stack
above and below, also in Kertas. Only a light wash marks the current one. A tap
elsewhere or Esc puts it away without changing anything.

Stills in `captures/2026-11-17-dropdown/`.

Then: "i think we should still show highlight instead of just a line so its
obvious, but the highlight make it like rough paper edges? similar to the
window? then the menu that appear also make it raw rough paper?" The blanks get
their highlight back, but as a scrap of warm paper with the same hand-cut
outline as the windows (`roughEdge`, now in `util.js` and sized to each piece).
The menu is a bigger scrap of the same paper with no shadow, and the current
choice sits on a slightly darker scrap. `three-desktop.jpg` and
`three-phone.jpg` show grey pills, then the plain line, then paper.

Then: "for the floating menu make it smooth, for the highlight less rough then
its good". The menu is a smooth rounded sheet again (warm paper tone, hairline,
soft shadow), its current choice a rounded wash. The blanks keep their paper
scraps, cut about half as rough as before. Final stills: `final-desktop.jpg`,
`final-phone.jpg`.

## 2026-11-18 · the name gets a tail
"i wanna work on my logo on the top left, letd do some variation maybe create a
lab just for this!! was thinking to make the text has some like bended streak
similar to spike jonze etc lets explore"

A separate page, `/logo-lab/`, not linked from the site. The name is set in
Kertas, then one slice of it (a column or a row of pixels) is pulled out long
along a bent path, the same trick as the window walls: no blur, no shader, just
the edge of the letters stretched. A tilted slice crosses several strokes, so
the streak breaks into separate lines. Nine starting points (Tail, Comb,
Hammock, Slit, Drip, Room, Breath, Pencil, Step down), each shown at real size
and close up, with a panel to tune cut, tilt, length, bend, how much it opens
up, fade, colour, motion, weight and HAND. The settings live in the link, so a
pick can be sent back as a URL.

Stills in `captures/2026-11-18-logo-lab/` (`in-the-corner.png` shows all nine
at real size in the corner).

Then a reference (translucent rainbow sheets swept through black space):
"Something like this would be sick but cleaner". A new family, Sheets: the
whole name is swept along a bent path as a few hundred faint layers, each
folding (squashed flat and back) as it goes and coloured like a soap film
(pink, mint, lilac, butter, sky). The stems of the letters pile up into
see-through ribbons that hang off the name. Kept on white, with only a light
halo, to stay clean. Five starting points: Prism, Silk, Curtain, Pearl, Veil.
Stills: `sheets.png`, `sheets-in-the-corner.png`.

Then: "something like pearl but the front text is black also at the end of
streak should have another ikram hakim text so its like joining 2 text
together". The sheet can now land on a second name (`end`: ink or pearl). With
an end, the ribbon is fullest at both names and thins in between, and it comes
back to full size where it lands. Four twins: Twin, Twin stacked, Twin far,
Twin pearl end. Stills: `twins.png`, `twin-corner.png`.

Then Ikram sent back a link from the lab, "lets try this". First pass guessed it
as a twin in soap-film colours (the link didn't carry the switches): "bro seems
like the wrong shit". The real pick: one name, a lagoon-teal sheet arcing up and
back over it (sheet, arch, lagoon, direction -71, fold 0.15, colour cycles 4,
thickness 0.19, glow 1.05, length 1.9, bend -3, opens up -0.6, fade 1), letters
fully hand-cut (HAND 100) at weight 630. It is now the name in the board's
corner (`app/js/brand/mark.js`, drawn by the same `streak.js`, which moved to
`app/js/brand/`); the sheet runs off the left edge of the window. The h1 keeps
the text underneath for screen readers. The lab also now saves every switch (mode, shape, colour, end) in its link.
Stills: `on-the-board-*.png`.

Then: "right now logo is display the text flat front face, i wish we can make it
like 3d rotate so it doesnt feel flat". The whole mark (letters and sheet
together) now turns in space with a CSS 3D transform hinged on the left of the
name: 28 degrees round, tipped back 14, camera 12 em away. On the board it turns
a few degrees more as the pointer moves, like the room. The lab has the same
three sliders (3D: turn, tip back, camera distance). Stills: `turned-*.png`.
