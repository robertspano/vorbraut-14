#!/usr/bin/env python3
"""
A/B prufa: endurstíla grunnmyndir með OpenAI (gpt-image-1) og Gemini (2.5 Flash Image).
Lyklar: úr umhverfi EÐA úr tools/keys.env (OPENAI_API_KEY=... / GEMINI_API_KEY=...).
Notkun:  /tmp/vbifc/bin/python tools/restyle_ab.py [0302 0104 ...]
Útkoma:  assets/plans_ai/<id>_openai.png, <id>_gemini.png, compare_<id>.png
"""
import os, sys, io, base64
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path("/Users/robert/Vorbraut 14")
PLANS, OUT = ROOT/"assets/plans", ROOT/"assets/plans_ai"
OUT.mkdir(exist_ok=True)

# lyklar úr öruggri skrá utan verkefnis (~/.vorbraut_aikeys) eða umhverfi
for kf in (Path.home()/".vorbraut_aikeys", ROOT/"tools/keys.env"):
    if kf.exists():
        for ln in kf.read_text().splitlines():
            ln = ln.strip()
            if ln and not ln.startswith('#') and '=' in ln:
                k, v = ln.split('=', 1); os.environ.setdefault(k.strip(), v.strip().strip('"\''))

PROMPT = ("Re-render THIS EXACT architectural floor plan in a premium, smooth, soft photorealistic top-down "
  "style: light oak wood floors, realistic soft furniture, gentle ambient shadows, calm muted palette "
  "(warm beige, sage green, soft warm greys, off-white). "
  "ACCURACY IS THE TOP PRIORITY, FAR ABOVE BEAUTY. You MUST reproduce the COMPLETE floor plan exactly: EVERY "
  "single room, wall, doorway, door swing, window, closet, bathroom, kitchen, balcony/verönd and every label "
  "must be present, in the EXACT same position, shape, size, count and proportion as the original line drawing. "
  "Overlay your render precisely on the original — match it one-to-one. Do NOT omit, merge, add, move, resize, "
  "rotate or relabel ANYTHING. Do not leave out any space. Every text label from the original must remain, "
  "unchanged and readable. Only change the visual style, never the geometry or contents. White background, no "
  "watermark, no extra text, no dimension numbers.")

PLANS_TO_DO = sys.argv[1:] or ["0302", "0104"]
HAS_OAI = bool(os.environ.get("OPENAI_API_KEY"))
HAS_GEM = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
if not (HAS_OAI or HAS_GEM):
    print("ENGIR LYKLAR. Settu OPENAI_API_KEY og/eða GEMINI_API_KEY í tools/keys.env (sjá keys.env.example)."); sys.exit(0)
print(f"OpenAI lykill: {'JÁ' if HAS_OAI else 'nei'} · Gemini lykill: {'JÁ' if HAS_GEM else 'nei'}")

def savepng(b, p): Image.open(io.BytesIO(b)).convert("RGB").save(p)

def run_openai(src, out):
    from openai import OpenAI
    r = OpenAI().images.edit(model="gpt-image-1", image=open(src, "rb"), prompt=PROMPT, size="auto", quality="high")
    savepng(base64.b64decode(r.data[0].b64_json), out)

def run_gemini(src, out):
    from google import genai
    c = genai.Client(api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
    for model in ("gemini-2.5-flash-image", "gemini-3.1-flash-image", "gemini-3-pro-image"):
        try:
            r = c.models.generate_content(model=model, contents=[PROMPT, Image.open(src)])
            for part in r.candidates[0].content.parts:
                if getattr(part, "inline_data", None) and part.inline_data.data:
                    savepng(part.inline_data.data, out); return
        except Exception as e:
            last = e
    raise last

def cell(path, cap):
    im = Image.open(path).convert("RGB"); im.thumbnail((540, 680))
    c = Image.new("RGB", (im.width, im.height + 30), (255, 255, 255)); c.paste(im, (0, 30))
    d = ImageDraw.Draw(c); d.rectangle([0, 0, c.width, 28], fill=(40, 42, 44)); d.text((8, 8), cap, fill=(255, 255, 255))
    return c

for pid in PLANS_TO_DO:
    src = PLANS/f"{pid}.png"
    if not src.exists(): print("vantar", pid); continue
    cells = [cell(src, "NÚVERANDI")]
    if HAS_OAI:
        try: o = OUT/f"{pid}_openai.png"; run_openai(src, o); cells.append(cell(o, "ChatGPT · gpt-image-1")); print(pid, "openai OK")
        except Exception as e: print(pid, "openai FAIL:", str(e)[:160])
    if HAS_GEM:
        try: g = OUT/f"{pid}_gemini.png"; run_gemini(src, g); cells.append(cell(g, "Gemini 2.5 Flash Image")); print(pid, "gemini OK")
        except Exception as e: print(pid, "gemini FAIL:", str(e)[:160])
    if len(cells) >= 2:
        h = max(c.height for c in cells); w = sum(c.width for c in cells) + 18*(len(cells)-1)
        comp = Image.new("RGB", (w, h), (244, 242, 236)); x = 0
        for c in cells: comp.paste(c, (x, 0)); x += c.width + 18
        comp.save(OUT/f"compare_{pid}.png"); print("samanburður:", OUT/f"compare_{pid}.png")
print("DONE")
