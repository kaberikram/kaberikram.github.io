"""Build Kertas, the board's own typeface, from the skeletons in glyphs.py.

    pip install fonttools brotli
    python3 tools/kertas/build.py

Writes app/fonts/Kertas.woff2: one variable font with two axes.

  wght  300-700  how wide the pen is
  HAND  0-100    0 is the clean drawing; 100 is the same letter cut out of
                 paper by hand: edges a little uneven, strokes wander, each
                 letter sits a touch off the line at its own small angle

Every master is made from the same skeletons and the same number of points,
so they always interpolate. The wobble is seeded by the glyph's name, so it is
the same on every build.
"""

import math
import os
import random
import sys

from fontTools.designspaceLib import AxisDescriptor, DesignSpaceDocument, SourceDescriptor
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools import varLib
from fontTools.otlLib.builder import buildStatTable
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

sys.path.insert(0, os.path.dirname(__file__))
from glyphs import G  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'app', 'fonts')

UPM = 1000
STEP = 26          # skeleton sampling, in units: small facets, like scissor cuts
CAP_POINTS = 7     # points on each round end
SB = 52            # base side bearing
WEIGHT = {300: 50, 700: 104}   # pen width at each end of wght
SPACE = 240
NARROW = 0.93   # letters drawn round, then set a touch narrow


# ---- skeleton ----

def split_corners(pts, limit=32):
    """Split a stroke where it turns sharply, so the turn becomes a round joint."""
    pts = [p for i, p in enumerate(pts) if i == 0 or math.dist(p, pts[i - 1]) > 0.5]
    out, cur = [], [pts[0]]
    for i in range(1, len(pts)):
        cur.append(pts[i])
        if 0 < i < len(pts) - 1:
            a = math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])
            b = math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])
            turn = abs((b - a + math.pi) % (2 * math.pi) - math.pi)
            if math.degrees(turn) > limit:
                out.append(cur)
                cur = [pts[i]]
    out.append(cur)
    return [c for c in out if len(c) > 1]


def resample(pts, closed=False):
    if closed:
        pts = pts + [pts[0]]
    seg = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    total = sum(seg)
    n = max(2, math.ceil(total / STEP) + 1)
    if closed:
        n = max(n, 12)
    out, i, acc = [], 0, 0.0
    count = n - 1 if closed else n
    for k in range(count):
        d = total * k / (n - 1)
        while i < len(seg) - 1 and acc + seg[i] < d:
            acc += seg[i]
            i += 1
        t = 0 if seg[i] == 0 else min(1, (d - acc) / seg[i])
        out.append((pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t))
    return out, total


def strokes_of(glyph_strokes):
    """Skeleton strokes, split and resampled: identical for every master."""
    out = []
    for s in glyph_strokes:
        s = dict(s, pts=[(x * NARROW, y) for x, y in s['pts']])
        if s.get('closed'):
            pts, length = resample(s['pts'], closed=True)
            out.append({'pts': pts, 'closed': True, 'w': s.get('w', 1), 'len': length})
        elif s.get('dot'):
            out.append({'pts': s['pts'], 'closed': False, 'w': s.get('w', 1), 'len': 6, 'dot': True})
        else:
            for part in split_corners(s['pts']):
                pts, length = resample(part)
                out.append({'pts': pts, 'closed': False, 'w': s.get('w', 1), 'len': length})
    return out


# ---- the hand ----

class Noise:
    """Smooth 1D value noise along a stroke, by arc length."""

    def __init__(self, seed, wavelength):
        self.r = random.Random(seed)
        self.v = [self.r.uniform(-1, 1) for _ in range(64)]
        self.wl = wavelength

    def __call__(self, d):
        x = d / self.wl
        i = int(math.floor(x))
        f = x - i
        f = f * f * (3 - 2 * f)
        return self.v[i % 64] * (1 - f) + self.v[(i + 1) % 64] * f


def frames(pts, closed):
    n = len(pts)
    out = []
    for i in range(n):
        a = pts[(i - 1) % n] if closed or i > 0 else pts[i]
        b = pts[(i + 1) % n] if closed or i < n - 1 else pts[i]
        tx, ty = b[0] - a[0], b[1] - a[1]
        L = math.hypot(tx, ty) or 1
        tx, ty = tx / L, ty / L
        out.append(((tx, ty), (-ty, tx)))
    return out


def outline(stroke, width, hand, seed):
    """Contours for one stroke at one master. hand is 0..1."""
    pts, closed = stroke['pts'], stroke['closed']
    w = width * stroke['w']
    n = len(pts)
    fr = frames(pts, closed)
    walk = Noise(seed + ':walk', 170)
    left_cut = Noise(seed + ':left', 55)
    right_cut = Noise(seed + ':right', 55)
    press = Noise(seed + ':press', 240)
    amp_walk = 11 * hand
    amp_cut = 0.13 * w * hand
    step = stroke['len'] / max(1, (n if closed else n - 1))

    L, Rt = [], []
    for i, (p, ((tx, ty), (nx, ny))) in enumerate(zip(pts, fr)):
        d = i * step
        m = amp_walk * walk(d)
        cx, cy = p[0] + nx * m, p[1] + ny * m
        half = w / 2 * (1 + 0.16 * hand * press(d))
        hl = half + amp_cut * left_cut(d)
        hr = half + amp_cut * right_cut(d)
        L.append((cx + nx * hl, cy + ny * hl, cx, cy, tx, ty, nx, ny, hl))
        Rt.append((cx - nx * hr, cy - ny * hr, cx, cy, tx, ty, nx, ny, hr))

    if closed:
        return [[(q[0], q[1]) for q in L], [(q[0], q[1]) for q in Rt]]

    contour = [(q[0], q[1]) for q in L]
    # round end: from the left edge, around the tip, to the right edge
    e = L[-1]
    hr = Rt[-1][8]
    for k in range(1, CAP_POINTS):
        th = math.pi * k / CAP_POINTS
        r = e[8] + (hr - e[8]) * k / CAP_POINTS
        contour.append((e[2] + e[6] * math.cos(th) * r + e[4] * math.sin(th) * r,
                        e[3] + e[7] * math.cos(th) * r + e[5] * math.sin(th) * r))
    contour += [(q[0], q[1]) for q in reversed(Rt)]
    s = Rt[0]
    hl = L[0][8]
    for k in range(1, CAP_POINTS):
        th = math.pi * k / CAP_POINTS
        r = s[8] + (hl - s[8]) * k / CAP_POINTS
        contour.append((s[2] - s[6] * math.cos(th) * r - s[4] * math.sin(th) * r,
                        s[3] - s[7] * math.cos(th) * r - s[5] * math.sin(th) * r))
    return [contour]


def area(c):
    return sum(c[i][0] * c[(i + 1) % len(c)][1] - c[(i + 1) % len(c)][0] * c[i][1] for i in range(len(c))) / 2


def skeleton_box(strokes):
    xs = [p[0] for s in strokes for p in s['pts']]
    return min(xs), max(xs)


def build_glyph(name, strokes, sb, width, hand):
    rnd = random.Random(name + ':tilt')
    tilt = math.radians(rnd.uniform(-1.6, 1.6)) * hand
    lift = rnd.uniform(-9, 9) * hand
    x0, x1 = skeleton_box(strokes)
    lsb = SB * sb[0] + width / 2
    rsb = SB * sb[1] + width / 2
    adv = round(lsb + (x1 - x0) + rsb)
    cx = (x0 + x1) / 2
    contours = []
    for si, st in enumerate(strokes):
        for c in outline(st, width, hand, f'{name}:{si}'):
            out = []
            for (x, y) in c:
                x -= cx
                y -= 300
                x, y = x * math.cos(tilt) - y * math.sin(tilt), x * math.sin(tilt) + y * math.cos(tilt)
                out.append((x + cx - x0 + lsb, y + 300 + lift))
            contours.append(out)
    return contours, adv


def make_master(width, hand, plan):
    order = ['.notdef', 'space'] + list(G.keys())
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    cmap = {0x20: 'space', 0xA0: 'space'}
    for name, (uni, _, _) in G.items():
        cmap[ord(uni)] = name
    fb.setupCharacterMap(cmap)
    glyphs, metrics = {}, {}
    pen = TTGlyphPen(None)
    pen.moveTo((60, 0)); pen.lineTo((60, 700)); pen.lineTo((440, 700)); pen.lineTo((440, 0)); pen.closePath()
    glyphs['.notdef'] = pen.glyph()
    metrics['.notdef'] = (500, 60)
    glyphs['space'] = TTGlyphPen(None).glyph()
    metrics['space'] = (SPACE + round((width - 50) * 0.4), 0)
    for name, (uni, raw, sb) in G.items():
        strokes, holes = plan[name]
        contours, adv = build_glyph(name, strokes, sb, width, hand)
        pen = TTGlyphPen(None)
        for ci, c in enumerate(contours):
            pts = [(round(x), round(y)) for x, y in c]
            if holes[ci]:
                pts = pts[::-1]
            pen.moveTo(pts[0])
            for p in pts[1:]:
                pen.lineTo(p)
            pen.closePath()
        gl = pen.glyph()
        gl.flags = [f | 0x40 if i == 0 else f for i, f in enumerate(gl.flags)]  # OVERLAP_SIMPLE
        glyphs[name] = gl
        xmin = min((round(p[0]) for c in contours for p in c), default=0)
        metrics[name] = (adv, xmin)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=930, descent=-260)
    fb.setupNameTable({'familyName': 'Kertas', 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=930, sTypoDescender=-260, sTypoLineGap=0, usWinAscent=1000, usWinDescent=320,
                sxHeight=520, sCapHeight=700, fsSelection=0x40 | 0x80, achVendID='IKRM', version=4,
                usWeightClass=400)
    fb.setupPost()
    return fb.font


def plan_glyphs():
    """Skeletons and contour directions, fixed once for all masters."""
    plan = {}
    for name, (uni, raw, sb) in G.items():
        strokes = strokes_of(raw)
        contours, _ = build_glyph(name, strokes, sb, WEIGHT[300], 0)
        holes = []
        for si, st in enumerate(strokes):
            cs = outline(st, WEIGHT[300], 0, 'x')
            if st['closed']:
                a0, a1 = area(cs[0]), area(cs[1])
                outer = 0 if abs(a0) > abs(a1) else 1
                # outer clockwise (negative area), inner counter-clockwise
                holes += [(a0 > 0) if outer == 0 else (a0 < 0), (a1 > 0) if outer == 1 else (a1 < 0)]
            else:
                holes.append(area(cs[0]) > 0)
        plan[name] = (strokes, holes)
    return plan


KERN = """
languagesystem DFLT dflt;
languagesystem latn dflt;
feature kern {
  pos T [a c e o s] -70;  pos T [u r y w v] -50;  pos T [period comma] -80;
  pos [V W Y] [a c e o] -55;  pos [V W Y] [period comma] -70;
  pos A [T V W Y] -55;  pos [T V W Y] A -55;  pos L [T V W Y] -70;
  pos F [a e o period comma] -45;  pos P [period comma] -70;
  pos [r v w y] [period comma] -45;  pos f [period comma] -30;
  pos quoteright s -20;
} kern;
"""


def main():
    plan = plan_glyphs()
    doc = DesignSpaceDocument()
    for tag, name, lo, df, hi in (('wght', 'Weight', 300, 300, 700), ('HAND', 'Hand', 0, 0, 100)):
        a = AxisDescriptor()
        a.tag, a.name, a.minimum, a.default, a.maximum = tag, name, lo, df, hi
        doc.addAxis(a)
    for wv in (300, 700):
        for hv in (0, 100):
            s = SourceDescriptor()
            s.font = make_master(WEIGHT[wv], hv / 100, plan)
            s.location = {'Weight': wv, 'Hand': hv}
            s.name = f'master.{wv}.{hv}'
            doc.addSource(s)
    vf, _, _ = varLib.build(doc, exclude=['MVAR'])
    addOpenTypeFeaturesFromString(vf, KERN)
    name = vf['name']
    name.setName('Kertas', 1, 3, 1, 0x409)
    name.setName('Regular', 2, 3, 1, 0x409)
    name.setName('1.000;IKRM;Kertas', 3, 3, 1, 0x409)
    name.setName('Kertas', 4, 3, 1, 0x409)
    name.setName('Version 1.000', 5, 3, 1, 0x409)
    name.setName('Kertas-Regular', 6, 3, 1, 0x409)
    name.setName('Kertas. Drawn by Ikram Hakim, 2026. Every letter is a pen line, cut from paper.', 10, 3, 1, 0x409)
    buildStatTable(vf, [
        {'tag': 'wght', 'name': 'Weight', 'values': [
            {'value': 300, 'name': 'Light'}, {'value': 400, 'name': 'Regular', 'flags': 2},
            {'value': 500, 'name': 'Medium'}, {'value': 700, 'name': 'Bold'}]},
        {'tag': 'HAND', 'name': 'Hand', 'values': [
            {'value': 0, 'name': 'Drawn', 'flags': 2}, {'value': 100, 'name': 'Cut'}]},
    ])
    os.makedirs(OUT, exist_ok=True)
    vf.flavor = 'woff2'
    path = os.path.join(OUT, 'Kertas.woff2')
    vf.save(path)
    print(path, os.path.getsize(path), 'bytes,', len(G), 'glyphs')


if __name__ == '__main__':
    main()
