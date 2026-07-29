#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Smíðar SVG-þjónustukort fyrir Vorbraut 14 úr OSM-gögnum.

Keyrsla (þarf nettengingu í fyrsta sinn):

    python3 tools/mkmap.py                  # sjálfgefinn radíus, skrifar beint inn á hverfid.html
    python3 tools/mkmap.py --radius 1560    # þrengra kort
    python3 tools/mkmap.py --an-vegalengda  # sleppa metratölunum í skránni
    python3 tools/mkmap.py --ut /tmp/prufa  # skrifa bara í möppu, snerta ekki vefinn

OSM-gögnin eru sótt frá Overpass og geymd í tools/osm-cache/, svo næsta keyrsla
þarf ekkert net. Staðirnir sjálfir koma úr tools/kort-stadir.json — bættu við
færslu þar (nafn, flokkur, lat, lon) og keyrðu aftur til að fá nýjan stað á kortið.

Kortið er teiknað úr raunverulegum OSM-gögnum. Ekki skipta því út fyrir mynd úr
myndgervli: slíkar myndir skálda landafræðina og stafsetninguna.
"""
import argparse
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
CACHE = os.path.join(TOOLS, "osm-cache")

HOME = (64.091985, -21.875719)    # Vorbraut 14
W, H = 1150, 1000                 # SVG-teiknisvið
CY = 0.44                         # Vorbraut 14 situr ofar en miðja -> meira af vatninu sést

# ---------------------------------------------------------------- vörpun
LAT0 = math.radians(HOME[0])
M_LAT = 111132.0
M_LON = 111320.0 * math.cos(LAT0)


def metrar(lat, lon):
    """Loftlína frá Vorbraut 14 í metrum."""
    return math.hypot((lat - HOME[0]) * M_LAT, (lon - HOME[1]) * M_LON)


# ---------------------------------------------------------------- OSM-sókn
OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# Hvert lag: (nafn, listi af Overpass-síum). Ferningurinn er settur inn á eftir.
LOG = [
    ("vatn", ['way["natural"="water"]',
              'relation["natural"="water"]',
              'way["waterway"="riverbank"]']),
    ("golf", ['way["leisure"="golf_course"]',
              'relation["leisure"="golf_course"]']),
    ("graent", ['way["leisure"~"^(park|garden|nature_reserve|pitch)$"]',
                'way["landuse"~"^(grass|forest|meadow|recreation_ground|village_green|cemetery|allotments)$"]',
                'way["natural"~"^(wood|scrub|heath|grassland)$"]']),
    ("stofn", ['way["highway"~"^(motorway|trunk|primary)(_link)?$"]']),
    ("gotur", ['way["highway"~"^(secondary|tertiary|residential|unclassified|living_street|pedestrian)(_link)?$"]']),
]


def ferningur(radius):
    """Ferningur sem nær yfir allt teiknisviðið, með 8% borði."""
    skali = min(W, H) / (2 * radius)          # SVG-einingar á metra
    aust = (W / 2) / skali * 1.08
    nordur = (H * CY) / skali * 1.08
    sudur = (H * (1 - CY)) / skali * 1.08
    return (HOME[0] - sudur / M_LAT, HOME[1] - aust / M_LON,
            HOME[0] + nordur / M_LAT, HOME[1] + aust / M_LON)


def saekja(nafn, siur, box, hvild=6):
    """Sækir eitt lag frá Overpass — eða les það úr skyndiminni."""
    os.makedirs(CACHE, exist_ok=True)
    leid = os.path.join(CACHE, "%s-%.4f_%.4f_%.4f_%.4f.json" % ((nafn,) + box))
    if os.path.exists(leid):
        with open(leid, encoding="utf-8") as f:
            hlutir = json.load(f).get("elements", [])
        print("  %-8s %5d hlutir (skyndiminni)" % (nafn, len(hlutir)))
        return hlutir

    b = "%.5f,%.5f,%.5f,%.5f" % box
    q = "[out:json][timeout:180];(%s);out geom;" % "".join(f"{s}({b});" for s in siur)

    villa = None
    for endi in OVERPASS:
        try:
            beidni = urllib.request.Request(
                endi, data=urllib.parse.urlencode({"data": q}).encode(),
                headers={"User-Agent": "Vorbraut14-kort/1.0"})
            with urllib.request.urlopen(beidni, timeout=240) as svar:
                gogn = json.load(svar)
            with open(leid, "w", encoding="utf-8") as f:
                json.dump(gogn, f)
            print("  %-8s %5d hlutir" % (nafn, len(gogn.get("elements", []))))
            time.sleep(hvild)          # Overpass er sameign — ekki hamast á honum
            return gogn.get("elements", [])
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as e:
            villa = e
    print("  %-8s SÓTTIST EKKI (%s)" % (nafn, villa), file=sys.stderr)
    return []


NOMINATIM = "https://nominatim.openstreetmap.org/search"


def hnitaleit(stadir, throttle=1.2):
    """Flettir upp hnitum fyrir staði sem vantar þau og skrifar þau í skrána.

    Nominatim leyfir eina fyrirspurn á sekúndu — hvíldin er skilyrði, ekki kurteisi.
    Niðurstaðan er prentuð svo hægt sé að sjá hvað fannst og leiðrétta
    leitarstrenginn í kort-stadir.json ef uppflettingin lenti á vitlausum stað.
    """
    vantar = [s for s in stadir if not (s.get("lat") and s.get("lon"))]
    if not vantar:
        return 0
    print(f"\nFletti upp hnitum fyrir {len(vantar)} staði:")
    fundnir = 0
    for s in vantar:
        leit = s.get("leitarstrengur") or s["nafn"] + ", Iceland"
        slod = NOMINATIM + "?" + urllib.parse.urlencode(
            {"q": leit, "format": "json", "limit": 1, "countrycodes": "is"})
        try:
            beidni = urllib.request.Request(
                slod, headers={"User-Agent": "Vorbraut14-kort/1.0 (thjonustukort)"})
            with urllib.request.urlopen(beidni, timeout=60) as svar:
                nidurstada = json.load(svar)
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as e:
            print(f"  {s['nafn'][:34]:34s} VILLA ({e})")
            time.sleep(throttle)
            continue
        if not nidurstada:
            print(f"  {s['nafn'][:34]:34s} FANNST EKKI — lagfærðu leitarstrenginn")
            time.sleep(throttle)
            continue
        t = nidurstada[0]
        s["lat"] = float(t["lat"])
        s["lon"] = float(t["lon"])
        s["osm"] = t.get("display_name", "")[:70]
        fjarlaegd = round(metrar(s["lat"], s["lon"]))
        print(f"  {s['nafn'][:34]:34s} {fjarlaegd:5d} m  <- {s['osm'][:46]}")
        fundnir += 1
        time.sleep(throttle)
    if fundnir:
        with open(os.path.join(TOOLS, "kort-stadir.json"), "w", encoding="utf-8") as f:
            json.dump(stadir, f, ensure_ascii=False, indent=1)
        print(f"  ({fundnir} hnit vistuð í kort-stadir.json)")
    return fundnir


def hnitalistar(e):
    """Hnitalistar hlutar — bæði fyrir way og relation."""
    if e.get("geometry"):
        return [e["geometry"]]
    return [m["geometry"] for m in e.get("members", []) if m.get("geometry")]


# ---------------------------------------------------------------- einföldun
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


# ---------------------------------------------------------------- kortið
def smida(radius, an_vegalengda):
    SCALE = min(W, H) / (2 * radius)      # SVG-einingar á metra

    def xy(lat, lon):
        """Metrar frá Vorbraut 14 -> SVG-hnit (jafnt hlutfall, norður upp)."""
        dx = (lon - HOME[1]) * M_LON
        dy = (lat - HOME[0]) * M_LAT
        return (W / 2 + dx * SCALE, H * CY - dy * SCALE)

    def path(g, eps=1.1, close=False):
        pts = [xy(p["lat"], p["lon"]) for p in g]
        if not pts:
            return None
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

    # ------------------------------------------------------------ lög
    box = ferningur(radius)
    print("Sæki OSM-gögn (%.4f,%.4f,%.4f,%.4f):" % box)
    lag = {n: saekja(n, s, box) for n, s in LOG}
    tomt = not any(lag.values())

    parts = []
    A = parts.append
    A(f'<svg class="kort__svg" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" '
      f'role="img" aria-labelledby="kortTitill">')
    A('<title id="kortTitill">Þjónustukort — Vorbraut 14 og nágrenni</title>')
    A('<defs><clipPath id="kortRammi"><rect x="0" y="0" '
      f'width="{W}" height="{H}" rx="2"/></clipPath></defs>')
    A('<g clip-path="url(#kortRammi)">')
    A(f'<rect x="0" y="0" width="{W}" height="{H}" fill="#FDFBF7"/>')

    def flotur(hlutir, fill, eps):
        if not hlutir:
            return
        A(f'<g fill="{fill}" stroke="none">')
        for e in hlutir:
            for g in hnitalistar(e):
                d = path(g, eps, close=True)
                if d:
                    A(f'<path d="{d}"/>')
        A("</g>")

    def lina(hlutir, stroke, breidd, eps):
        if not hlutir:
            return
        A(f'<g fill="none" stroke="{stroke}" stroke-width="{breidd}" stroke-linecap="round" '
          'stroke-linejoin="round">')
        for e in hlutir:
            for g in hnitalistar(e):
                d = path(g, eps)
                if d:
                    A(f'<path d="{d}"/>')
        A("</g>")

    flotur(lag["graent"], "#E8EADF", 2.4)      # gróður
    flotur(lag["golf"], "#DFE7D0", 1.6)        # golfvellirnir í Vetrarmýri
    flotur(lag["vatn"], "#C3D6E2", 1.6)        # vatn
    lina(lag["gotur"], "#EDE7DE", 1.8, 1.7)
    lina(lag["stofn"], "#DCD3C6", 4.2, 1.3)

    # fjarlægðarhringir — heilir og áberandi, með hvítri baklýsingu svo þeir
    # haldi sér yfir götum og gróðri
    hringir = [m for m in (500, 1000, 1500, 2000, 2500, 3000) if m <= radius]
    if len(hringir) > 4:                       # of þéttir hringir verða að grind;
        # 500 m situr alltaf eftir — það er hringurinn sem segir mest um göngufæri
        hringir = [500] + [m for m in hringir if m % 1000 == 0]
    A('<g class="kort__hringir">')
    for m in reversed(hringir):                # ljós bönd inn að miðju
        A(f'<circle cx="{W/2:.0f}" cy="{H*CY:.0f}" r="{m*SCALE:.0f}" fill="#fff" opacity=".30"/>')
    for m in hringir:                          # breið hvít undirlína
        A(f'<circle cx="{W/2:.0f}" cy="{H*CY:.0f}" r="{m*SCALE:.0f}" fill="none" '
          f'stroke="#fff" stroke-width="7" opacity=".9"/>')
    for m in hringir:                          # hringirnir sjálfir
        A(f'<circle class="kort__hringur" cx="{W/2:.0f}" cy="{H*CY:.0f}" r="{m*SCALE:.0f}"/>')
    for m in hringir:                          # merkimiðar á ská upp til hægri
        r = m * SCALE
        lab = (f"{m} m" if m < 1000 else
               (f"{m // 1000} km" if m % 1000 == 0 else f"{m/1000:.1f} km".replace(".", ",")))
        breidd = 26 + 15 * len(lab)
        A(f'<g class="kort__hringmerki" transform="translate({W/2 + r*0.7071:.0f},{H*CY - r*0.7071:.0f})">'
          f'<rect x="{-breidd/2:.0f}" y="-19" width="{breidd}" height="38" rx="19"/>'
          f'<text y="8">{lab}</text></g>')
    A("</g>")
    A("</g>")  # clip

    MERKI = "<!--MERKI-->"
    A(MERKI)
    A(f'<rect x="0.5" y="0.5" width="{W-1}" height="{H-1}" fill="none" stroke="#E8E7E8"/>')
    A("</svg>")
    svg = "\n".join(parts)

    # ------------------------------------------------------------ staðir
    FLOKKAR = [
        ("Skólar", "skoli"),
        ("Afþreying", "utivist"),
        ("Veitingar", "matur"),
        ("Verslanir", "verslun"),
        ("Þjónusta", "thjonusta"),
    ]

    with open(os.path.join(TOOLS, "kort-stadir.json"), encoding="utf-8") as f:
        st = json.load(f)
    hnitaleit(st)                                      # fyllir í það sem vantar

    # Sumir staðir eru flötur, ekki heimilisfang — golfvellirnir í Vetrarmýri eiga
    # ekkert götunúmer til að fletta upp. Fyrir þá er punkturinn tekinn úr OSM-laginu
    # sjálfu: miðja þess flatar sem næstur er Vorbraut 14. Það er ekki vistað í
    # kort-stadir.json, því flöturinn kemur upp á nýtt í hverri framköllun.
    for s in st:
        if s.get("lat") and s.get("lon"):
            continue
        hlutir = lag.get(s.get("midja_ur_lagi") or "")
        if not hlutir:
            continue
        bestu = None
        for e in hlutir:
            for g in hnitalistar(e):
                if len(g) < 3:
                    continue
                la = sum(p["lat"] for p in g) / len(g)
                lo = sum(p["lon"] for p in g) / len(g)
                d = metrar(la, lo)
                if bestu is None or d < bestu[0]:
                    bestu = (d, la, lo)
        if bestu:
            s["lat"], s["lon"] = bestu[1], bestu[2]
            s["osm"] = f"miðja flatar úr OSM-laginu '{s['midja_ur_lagi']}'"
            print(f"  {s['nafn'][:34]:34s} {bestu[0]:5.0f} m  <- {s['osm']}")

    an_hnita = [s["nafn"] for s in st if not (s.get("lat") and s.get("lon"))]
    st = [s for s in st if s.get("lat") and s.get("lon")]
    for s in st:
        s["m"] = round(metrar(s["lat"], s["lon"]))     # reiknað upp á nýtt, ekki treyst
    of_langt = [s["nafn"] for s in st if s["m"] > radius]
    st = [s for s in st if s["m"] <= radius]

    byflokk = {k: [] for k, _ in FLOKKAR}
    for s in st:
        if s["flokkur"] in byflokk:
            byflokk[s["flokkur"]].append(s)
    for k in byflokk:
        byflokk[k].sort(key=lambda s: s["m"])

    # staðsetningar fyrst, svo ýtt í sundur svo merkin skarist ekki
    pos = {}
    for heiti, _ in FLOKKAR:
        for s_ in byflokk[heiti]:
            pos[id(s_)] = list(xy(s_["lat"], s_["lon"]))
    keys = list(pos)
    for _ in range(260):
        moved = False
        for i in range(len(keys)):
            for j in range(i + 1, len(keys)):
                a, b = pos[keys[i]], pos[keys[j]]
                dx, dy = b[0] - a[0], b[1] - a[1]
                dd = math.hypot(dx, dy)
                if dd < 44:
                    if dd < 0.01:
                        dx, dy, dd = 1.0, 0.6, 1.17
                    push = (44 - dd) / 2
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
            x, y = pos[id(s)]
            tx, ty = xy(s["lat"], s["lon"])
            if math.hypot(x - tx, y - ty) > 5:
                marks.append(f'<line class="kort__leggur" x1="{tx:.1f}" y1="{ty:.1f}" '
                             f'x2="{x:.1f}" y2="{y:.1f}"/>')
            marks.append(
                f'<g class="kort__m" data-f="{slug}" data-nr="{n}" transform="translate({x:.1f},{y:.1f})">'
                f'<circle r="19"/>'
                f'<text y="8">{n}</text></g>'
            )
            km = f'{s["m"]/1000:.1f}'.replace(".", ",") + " km" if s["m"] >= 950 else f'{s["m"]} m'
            legend.append(
                f'<li data-nr="{n}"><i>{n}</i><span>{s["nafn"]}</span>'
                + ("" if an_vegalengda else f"<b>{km}</b>") + "</li>"
            )
        legend.append("</ol></div>")

    hx, hy = xy(*HOME)
    marks.append(
        f'<g class="kort__heim" transform="translate({hx:.1f},{hy:.1f})">'
        f'<circle r="15"/><circle class="kort__heimkjarni" r="6"/>'
        f'<text y="-32">VORBRAUT 14</text></g>'
    )

    svg = svg.replace(MERKI, "\n".join(marks))
    return {"svg": svg, "skra": "\n".join(legend), "fjoldi": n, "hringir": hringir,
            "an_hnita": an_hnita, "of_langt": of_langt, "tomt": tomt,
            "byflokk": {k: len(v) for k, v in byflokk.items()},
            "lag": {k: len(v) for k, v in lag.items()}}


# ---------------------------------------------------------------- útskrift
def skipta(texti, byrjun, endir, nytt, skra):
    """Skiptir út kaflanum milli akkeranna — og stöðvar ef þau vantar."""
    i = texti.find(byrjun)
    j = texti.find(endir)
    if i < 0 or j < 0 or j < i:
        sys.exit(f"Akkerin {byrjun} / {endir} fundust ekki í {skra} — ekkert var skrifað.")
    return texti[: i + len(byrjun)] + "\n" + nytt + "\n" + texti[j:]


def main():
    p = argparse.ArgumentParser(description="Smíðar þjónustukortið fyrir Vorbraut 14.")
    # 3000 m nær yfir Garðatorg, Ásgarð og Kjóavelli — sama umfang og kortið sem beðið var um
    p.add_argument("--radius", type=int, default=3000,
                   help="sýnilegur radíus í metrum (sjálfgefið 3000)")
    p.add_argument("--an-vegalengda", action="store_true",
                   help="sleppa metratölunum aftast í skránni")
    p.add_argument("--ut", metavar="MAPPA",
                   help="skrifa aðeins í þessa möppu, ekki inn á vefinn")
    p.add_argument("--leyfa-tom-log", action="store_true",
                   help="skrifa þótt OSM-gögnin hafi ekki sóst — aðeins til prófunar")
    a = p.parse_args()

    r = smida(a.radius, a.an_vegalengda)

    if r["tomt"] and not a.ut and not a.leyfa_tom_log:
        sys.exit("\nOSM-gögnin sóttust ekki og ekkert var í skyndiminni — kortið yrði án\n"
                 "gatna, vatns og gróðurs. Vefurinn var EKKI snertur. Keyrðu aftur með\n"
                 "nettengingu, eða '--ut MAPPA' til að skoða útkomuna fyrst.")

    if a.ut:
        os.makedirs(a.ut, exist_ok=True)
        with open(os.path.join(a.ut, "kort.svg"), "w", encoding="utf-8") as f:
            f.write(r["svg"])
        with open(os.path.join(a.ut, "kort-legend.html"), "w", encoding="utf-8") as f:
            f.write(r["skra"])
    else:
        with open(os.path.join(ROOT, "assets", "map", "thjonustukort.svg"), "w", encoding="utf-8") as f:
            f.write(r["svg"])
        leid = os.path.join(ROOT, "hverfid.html")
        with open(leid, encoding="utf-8") as f:
            h = f.read()
        h = skipta(h, "<!--KORT:SVG-->", "<!--/KORT:SVG-->", r["svg"], "hverfid.html")
        h = skipta(h, "<!--KORT:SKRA-->", "<!--/KORT:SKRA-->", r["skra"], "hverfid.html")
        with open(leid, "w", encoding="utf-8") as f:
            f.write(h)

    print(f"\nSVG: {len(r['svg'])/1024:.0f} KB   staðir á korti: {r['fjoldi']}   radíus: {a.radius} m")
    print("lög -> " + "  ".join(f"{k}:{v}" for k, v in r["lag"].items()))
    print("hringir -> " + ", ".join(f"{m} m" for m in r["hringir"]))
    for heiti in ("Skólar", "Afþreying", "Veitingar", "Verslanir", "Þjónusta"):
        print(f"  {heiti:12s} {r['byflokk'].get(heiti, 0)}")
    if r["an_hnita"]:
        print("\nÁN HNITA (komust ekki á kortið): " + ", ".join(r["an_hnita"]))
    if r["of_langt"]:
        print(f"UTAN RADÍUSS ({a.radius} m): " + ", ".join(r["of_langt"]))
    if not a.ut:
        print("\nMundu: 'kort.sub' í js/content.js nefnir radíusinn — uppfærðu textann ef hann breyttist.")


if __name__ == "__main__":
    main()
