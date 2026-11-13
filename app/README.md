# The board

The new site: works laid out as paper cards on an open board in 3D space.
While it is being built it is served at `/progress/`. At launch,
`progress/index.html` becomes the root `index.html` and nothing else moves.

No build step and no dependencies. Edit a file, reload.

```
python3 -m http.server 8123     # then open http://localhost:8123/progress/
npm test                        # unit tests, Node only
node tests/browser.mjs          # end-to-end, needs Playwright and the server above
```

## How it works

Everything that changes the board is a **Command**: a small object saying which
works to show, in what order, in which arrangement, and which one is focused.
A click, a key, a link, and later the bar all produce one.

```
input ──▶ Command ──▶ director ──▶ a pose for every card ──▶ board (springs)
                         │
                         ├──▶ where the camera looks ──▶ camera (springs)
                         └──▶ the URL hash (so Back undoes it and views can be linked)
```

| File | Job |
|---|---|
| `content/content.json` | All content. The only file to edit to add or change a work. |
| `js/brain/command.js` | The Command: validate it, pick the works it selects, read and write it as a URL hash. |
| `js/brain/parse.js` | The on-device brain: text to a Command, which words were understood (for underlining), and a one-line plan. Words live in `LEXICON` at the top. |
| `js/bar/bar.js` | The bar: pill, plan line while typing, answer sentence with editable blanks, work detail, About and Contact. Only sends Commands. |
| `js/brain/director.js` | Turns a Command into card poses, a camera move and a URL. The one path for every change. |
| `js/board/layouts.js` | The arrangements (scatter, grid, timeline, stack, fan). Pure functions. |
| `js/board/board.js` | One element per card and label, moved by springs. |
| `js/board/input.js` | Drag, zoom, click, carry a card, keys. Ends in camera moves and director calls. |
| `js/core/camera.js` | Camera position and all projection maths. |
| `js/core/spring.js` | Springs, and the single animation loop that stops when nothing moves. |
| `js/settings.js` | Look-and-feel values, saved in the browser, pushed to CSS. |
| `js/dev/tune.js` | The Tune panel: press **D**, or add `?debug`. |

## Adding a work

Add an object to `works` in `content/content.json`:

- `id` unique, `title`, `line` (one short sentence).
- `kind` one of the ids in `kinds`. `tags` must include the kind.
- `proud` its rank. 1 is the proudest. Ranks must be 1..n with no repeats, so
  renumber the ones below it.
- `year`, `month`, `when` (the text shown). Leave all three `null` if unknown;
  the timeline then files it under "undated" instead of guessing.
- `cover` the file name in `img/` without `.jpg`, or `null` for a text card.
- `summary`, `role`, `tools`, `links`: leave empty until written. Empty facts
  are hidden, never shown as placeholders.

`npm test` checks the file: unique ids, known kinds, covers that exist, ranks
with no gaps.

## Links

Every view has a URL. Keys: `k` kind, `t` tags, `y` years, `s` sort
(`proud`, `recent`, `oldest`), `n` limit, `l` arrangement, `w` focused work.

```
/progress/#k=ar              AR work, stepped forward
/progress/#s=recent&n=4      the four most recent
/progress/#l=timeline        everything by year
/progress/#w=IH0204          open on one work
```

Add `?fresh` to ignore settings saved in the browser.

## The bar

Press `/` (or click) and type. Understood words are underlined, a plan line says
what will happen, and the board previews it live; Esc abandons it, Enter
commits. Nothing it cannot read is a dead end: it offers a blank to fill.

To teach it a word, add it to `LEXICON` in `js/brain/parse.js` and a case to
`tests/parse.test.js`. Tags come from `content.json` automatically.

## Keys

`/` asks. Arrows step between cards. Enter focuses the first. Esc steps out. Home or 0
goes home. 1 to 4 switch arrangement. + and - zoom. D opens the Tune panel.

## The earlier version

The liquid-glass sphere grid that used to live at `/progress/` is at commit
`c6b48f8`.
