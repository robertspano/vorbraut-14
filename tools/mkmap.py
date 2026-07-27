#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Smíðar SVG-þjónustukort fyrir Vorbraut 14 úr OSM-gögnum."""
import json, math, os, glob

SP = "/private/tmp/claude-501/-Users-robert-Vorbraut-14/92e39197-2d69-4d18-8638-f484719153d2/scratchpad"
HOME = (64.091985, -21.875719)
R_M = 1560.0                      # sýnilegur radíus í metrum
W, H = 1150, 1000                 # SVG-teiknisvið
CY = 0.44                         # Vorbraut 14 situr ofar en miðja -> meira af vatninu sést

# ---------------------------------------------------------------- vörpun
LAT0 = math.radians(HOME[0])
M_LAT = 111132.0
M_LON = 111320.0 * math.cos(LAT0)


def xy(lat, lon):
    """Metrar frá Vorbraut 14 -> SVG-hnit (jafnt hlutfall, norður upp)."""
    dx = (lon - HOME[1]) * M_LON
    dy = (lat - HOME[0]) * M_LAT
    s = min(W, H) / (2 * R_M)
    return (W / 2 + dx * s, H * CY - dy * s)


SCALE = min(W, H) / (2 * R_M)     # SVG-einingar á metra


def load(name):
    p = os.path.join(SP, name + ".json")
    if not os.path.exists(p):
        return []
    try:
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
    except Exception:
        return []
    return d.get("elements", [])


def rdp(pts, eps):
    """Douglas-Peucker einföldun."""
    if len(pts) < 3:
        return pts
    x1, y1 = pts[0]
    x2, y2 = pts[-1]
    dmax, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        x0, y0 = pts[i]
        num = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
        den = math.hypot(y2 - y1, x2 - x1) or 1e-9
        d = num / den
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[: idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


def decimate(pts, eps):
    """Radial einföldun — óhætt á lokuðum hringjum, ólíkt RDP."""
    out = [pts[0]]
    for q in pts[1:]:
        if math.hypot(q[0] - out[-1][0], q[1] - out[-1][1]) >= eps:
            out.append(q)
    return out


def path(geom, eps=1.1, close=False):
    pts = [xy(g["lat"], g["lon"]) for g in geom]
    if all(p[0] < -80 or p[0] > W + 80 or p[1] < -80 or p[1] > H + 80 for p in pts):
        return None
    if close:
        # RDP eyðileggur lokaða hringi (fyrsti = síðasti punktur) -> radial í staðinn
        if len(pts) > 2 and abs(pts[0][0] - pts[-1][0]) < 1e-6 and abs(pts[0][1] - pts[-1][1]) < 1e-6:
            pts = pts[:-1]
        pts = decimate(pts, eps)
        if len(pts) < 3:
            return None
        xs = [q[0] for q in pts]
        ys = [q[1] for q in pts]
        if (max(xs) - min(xs)) < 6 and (max(ys) - min(ys)) < 6:
            return None            # örsmáir flekkir -> sleppt
    else:
        pts = rdp(pts, eps)
        if len(pts) < 2:
            return None
    d = "M" + " L".join(f"{x:.0f},{y:.0f}" for x, y in pts)
    return d + "Z" if close else d


# ---------------------------------------------------------------- lög
def collect(names):
    out = []
    for n in names:
        out += load(n)
    return out


water = [e for e in collect(["vatn", "vatnid", "vatn2"]) if e.get("geometry")]
golf  = [e for e in collect(["golf"]) if e.get("geometry")]
green = [e for e in collect(["graent", "graent2"]) if e.get("geometry")]
major = [e for e in collect(["stofn", "stofn2"]) if e.get("geometry")]
minor = [e for e in collect(["got1", "got2", "got3", "got4", "vegir"]) if e.get("geometry")]

parts = []
A = parts.append

A(f'<svg class="kort__svg" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" '
  f'role="img" aria-labelledby="kortTitill">')
A('<title id="kortTitill">Þjónustukort — Vorbraut 14 og nágrenni</title>')
A('<defs><clipPath id="kortRammi"><rect x="0" y="0" '
  f'width="{W}" height="{H}" rx="2"/></clipPath></defs>')
A('<g clip-path="url(#kortRammi)">')
A(f'<rect x="0" y="0" width="{W}" height="{H}" fill="#FBFAF8"/>')

# grænir fletir
if green:
    A('<g fill="#E4E8DC" stroke="none">')
    for e in green:
        d = path(e["geometry"], 2.4, close=True)
        if d:
            A(f'<path d="{d}"/>')
    A("</g>")

# golfvellirnir í Vetrarmýri
if golf:
    A('<g fill="#DBE4CD" stroke="none">')
    for e in golf:
        d = path(e["geometry"], 1.6, close=True)
        if d:
            A(f'<path d="{d}"/>')
    A("</g>")

# vatn
if water:
    A('<g fill="#CBD9E1" stroke="none">')
    for e in water:
        d = path(e["geometry"], 1.6, close=True)
        if d:
            A(f'<path d="{d}"/>')
    A("</g>")

# götur
if minor:
    A('<g fill="none" stroke="#E0DBD3" stroke-width="1.5" stroke-linecap="round" '
      'stroke-linejoin="round">')
    for e in minor:
        d = path(e["geometry"], 1.7)
        if d:
            A(f'<path d="{d}"/>')
    A("</g>")
if major:
    A('<g fill="none" stroke="#CEC7BB" stroke-width="3.6" stroke-linecap="round" '
      'stroke-linejoin="round">')
    for e in major:
        d = path(e["geometry"], 1.3)
        if d:
            A(f'<path d="{d}"/>')
    A("</g>")

# fjarlægðarhringir
A('<g class="kort__hringir">')
for m in (500, 1000, 1500):
    r = m * SCALE
    A(f'<circle cx="{W/2:.1f}" cy="{H*CY:.1f}" r="{r:.1f}" fill="none" '
      f'stroke="#BFB6A9" stroke-width="1" stroke-dasharray="6 6"/>')
    lab = f'{m} m' if m < 1000 else f'{m//1000}' + (',5' if m % 1000 else '') + ' km'
    A(f'<text x="{W/2 + r - 9:.1f}" y="{H*CY - 8:.1f}" text-anchor="end" '
      f'class="kort__hringtxt">{lab}</text>')
A("</g>")
A("</g>")  # clip

PLACEHOLDER_MARKERS = "<!--MARKERS-->"
A(PLACEHOLDER_MARKERS)
A(f'<rect x="0.5" y="0.5" width="{W-1}" height="{H-1}" fill="none" stroke="#E8E7E8"/>')
A("</svg>")

svg = "\n".join(parts)

# ---------------------------------------------------------------- staðir
FLOKKAR = [
    ("Skólar", "skoli"),
    ("Afþreying", "utivist"),
    ("Veitingar", "matur"),
    ("Verslanir", "verslun"),
    ("Þjónusta", "thjonusta"),
]

st = json.load(open(os.path.join(SP, "stadir-hnit.json"), encoding="utf-8"))
st = [s for s in st if s.get("lat") and s.get("m") is not None and s["m"] <= R_M]

byflokk = {k: [] for k, _ in FLOKKAR}
for s in st:
    if s["flokkur"] in byflokk:
        byflokk[s["flokkur"]].append(s)
for k in byflokk:
    byflokk[k].sort(key=lambda s: s["m"])

# staðsetningar fyrst, svo ýtt í sundur svo merkin skarist ekki
pos = {}
for heiti, slug in FLOKKAR:
    for s_ in byflokk[heiti]:
        pos[id(s_)] = list(xy(s_["lat"], s_["lon"]))
keys = list(pos)
for _ in range(220):
    moved = False
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            a, b = pos[keys[i]], pos[keys[j]]
            dx, dy = b[0] - a[0], b[1] - a[1]
            dd = math.hypot(dx, dy)
            if dd < 23:
                if dd < 0.01:
                    dx, dy, dd = 1.0, 0.6, 1.17
                push = (23 - dd) / 2
                ux, uy = dx / dd, dy / dd
                a[0] -= ux * push; a[1] -= uy * push
                b[0] += ux * push; b[1] += uy * push
                moved = True
    if not moved:
        break

n = 0
marks, legend = [], []
for heiti, slug in FLOKKAR:
    rows = byflokk[heiti]
    if not rows:
        continue
    legend.append(f'<div class="kort__flokkur" data-f="{slug}">')
    legend.append(f'<h3>{heiti}</h3><ol>')
    for s in rows:
        n += 1
        s["nr"] = n
        x, y = pos[id(s)]
        tx, ty = xy(s["lat"], s["lon"])
        if math.hypot(x - tx, y - ty) > 5:
            marks.append(f'<line class="kort__leggur" x1="{tx:.1f}" y1="{ty:.1f}" '
                         f'x2="{x:.1f}" y2="{y:.1f}"/>')
        marks.append(
            f'<g class="kort__m" data-f="{slug}" data-nr="{n}" transform="translate({x:.1f},{y:.1f})">'
            f'<rect x="-9" y="-9" width="18" height="18" rx="3"/>'
            f'<text y="4.5">{n}</text></g>'
        )
        km = f'{s["m"]/1000:.1f}'.replace(".", ",") + " km" if s["m"] >= 950 else f'{s["m"]} m'
        legend.append(
            f'<li data-nr="{n}"><i>{n}</i><span>{s["nafn"]}</span><b>{km}</b></li>'
        )
    legend.append("</ol></div>")

hx, hy = xy(*HOME)
marks.append(
    f'<g class="kort__heim" transform="translate({hx:.1f},{hy:.1f})">'
    f'<rect x="-8" y="-8" width="16" height="16" rx="2" transform="rotate(45)"/>'
    f'<text y="-16">VORBRAUT 14</text></g>'
)

svg = svg.replace(PLACEHOLDER_MARKERS, "\n".join(marks))

open(os.path.join(SP, "kort.svg"), "w", encoding="utf-8").write(svg)
open(os.path.join(SP, "kort-legend.html"), "w", encoding="utf-8").write("\n".join(legend))
print(f"SVG: {len(svg)/1024:.0f} KB   staðir á korti: {n}")
print(f"lög -> vatn:{len(water)} golf:{len(golf)} grænt:{len(green)} stofnvegir:{len(major)} götur:{len(minor)}")
for heiti, _ in FLOKKAR:
    print(f"  {heiti:12s} {len(byflokk[heiti])}")
