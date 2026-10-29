// Work records for the field. Order in LINE is the spiral the grid samples;
// (0,0) is the focused centre tile, Reality to bend.

export const WORKS = [
  { c: 'IH0101', t: 'Geospatial AR', l: 'Google Maps, I/O pilot', y: '[TBC]', cat: 'AR / Lenses', im: 'geo' },
  { c: 'IH0102', t: 'Ghost Catch', l: 'Spectacles, 2nd at Snap AR Day', y: '2024', cat: 'AR / Lenses', im: 'ghost' },
  { c: 'IH0103', t: 'Spectacles tools', l: 'Teleprompter, Currency, Pomodoro', y: '2024–25', cat: 'AR / Lenses', im: 'pomodoro' },
  { c: 'IH0201', t: 'Quest MR games', l: 'Dreampop, Take a Leap', y: '[TBC]', cat: 'XR / Mixed reality', im: 'dreampop' },
  { c: 'IH0202', t: 'MOMNTS', l: 'Face-AR editor', y: 'Jul 2026', cat: 'XR / Mixed reality', im: 'live-momnts' },
  { c: 'IH0203', t: 'Dimensional', l: 'Reel. A scene, scrubbed by hand', y: 'Sep 2026', cat: 'XR / Mixed reality', im: 'a14f' },
  { c: 'IH0204', t: 'Reality to bend', l: 'Reel. A room stretches, then shatters', y: 'Oct 2026', cat: 'XR / Mixed reality', im: 'b26f' },
  { c: 'IH0301', t: 'Webcam particles', l: 'Three.js', y: '2019', cat: 'Web / Creative dev', im: null },
  { c: 'IH0302', t: 'World End Tree', l: 'Spotify data, R3F', y: 'May 2025', cat: 'Web / Creative dev', im: 'live-worldendtree' },
  { c: 'IH0303', t: 'Styling Canvas', l: 'Drag a shirt onto a model', y: 'May 2025', cat: 'Web / Creative dev', im: null },
  { c: 'IH0304', t: 'TIC Corp', l: 'Parody label, working shop', y: '2025', cat: 'Web / Creative dev', im: 'tic' },
  { c: 'IH0305', t: 'depth-vfx', l: 'Light becomes rays', y: 'Mar 2026', cat: 'Web / Creative dev', im: null },
  { c: 'IH0306', t: 'Speakfall', l: 'Speak. The words fall.', y: 'Apr 2026', cat: 'Web / Creative dev', im: 'live-speakfall' },
  { c: 'IH0307', t: 'Astral Angels', l: 'Client site, KL. Scope [TBC]', y: '2026', cat: 'Web / Creative dev', im: 'astral' },
  { c: 'IH0308', t: 'Aetherial', l: 'Browser game', y: 'Jul 2026', cat: 'Web / Creative dev', im: 'live-aetherialgame' },
  { c: 'IH0309', t: 'Volta', l: 'Music-video editor', y: 'Oct 2026', cat: 'Web / Creative dev', im: 'live-volta' },
  { c: 'IH0310', t: 'Depth Warp', l: 'A room from one photo', y: '[TBC]', cat: 'Web / Creative dev', im: 'warp-room' },
  { c: 'IH0401', t: 'EPF i-Akaun', l: 'UI/UX designer, EPF', y: '[TBC]', cat: 'Product / UI', im: null },
  { c: 'IH0402', t: 'SHXFT Studio', l: 'Creative developer, contract', y: '[TBC]', cat: 'Product / UI', im: 'shxft' },
]

export const GREY = new Set(['IH0304', 'IH0307'])

export const LINE = [
  'IH0204', 'IH0203', 'IH0310', 'IH0301', 'IH0306', 'IH0202', 'IH0103', 'IH0302', 'IH0303',
  'IH0201', 'IH0101', 'IH0309', 'IH0305', 'IH0102', 'IH0308', 'IH0304', 'IH0401', 'IH0402', 'IH0307',
]

const BY = {}
for (const work of WORKS) BY[work.c] = work

export function workByCode(code) {
  return BY[code]
}

export function mod(a, n) {
  return ((a % n) + n) % n
}

export function codeAt(i, j) {
  return LINE[mod(i + j * 7, LINE.length)]
}

export function imgUrl(name) {
  return new URL(`../img/${name}.jpg`, import.meta.url).href
}

