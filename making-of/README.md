# making-of

Everything for a "how this was made" video, kept next to the code.

```
LOG.md          dated story: what changed, why, which tag to film
captures/       stills (and clips) of each milestone, made by tools/capture.mjs
tune/           the Tune-panel JSON from each round of feedback
(references are listed below, not stored)
```

## Marking a milestone

```
git tag -a v3-card-design -m "New card design"
git push origin v3-card-design
node tools/capture.mjs v3-card-design --video
```

Then add a short entry to `LOG.md` and, if you tuned the look, drop the Copy
JSON from the Tune panel into `tune/` named with the date.

## Filming

```
node tools/capture.mjs                       every tag starting with "v"
node tools/capture.mjs v0-glass v2-bar       just these
node tools/capture.mjs v2-bar --video        adds a short desktop clip
node tools/capture.mjs --current             the working tree, uncommitted
node tools/capture.mjs --path /index.html    a different page (older homepage)
```

It checks each version out into a temporary folder, so your working tree is
never touched. Needs Playwright and Chromium.

For a smoother timelapse, commit in small steps while tuning. Every commit is
filmable: `node tools/capture.mjs <commit-hash>`.

## References studied

Not stored here (they are other people's work, and this folder is published
with the site). Keep your own copies alongside your edit.

- `adaptivedynamic_ui.mp4`: a pill that turns into a signing card and back.
- `handcontrol_reference.mp4`: paper cards in depth; a stack that deals into a row.
- *Beyond Taking Turns* by Bruce Liu: feedforward and leaving blanks.
  https://demos.liubruce.me/intra-turn/
- The Embercrest card (adaptive card with nested corners).
- "John's Break Spot", a sketchbook page (paint dabs as colour code).
- A still from *Her* (pale screen, flat elements at clear depths).
