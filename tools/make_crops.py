#!/usr/bin/env python3
"""Découpe les captures des exercices dans les PDF des livres (book/*.webp).

Usage : python3 tools/make_crops.py HSK1_Textbook.pdf HSK1_Workbook.pdf [--force]
Les rectangles viennent des lignes « IMG » de raw/*.txt (via tools/build_data.py -> tools/crops.json).
Nécessite pdftoppm (poppler) et Pillow.
"""
import json, os, subprocess, sys, tempfile
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = {"tb": 15, "wb": 7}  # page du PDF = page imprimée + décalage
DPI = 150
args = [a for a in sys.argv[1:] if not a.startswith("--")]
force = "--force" in sys.argv
pdf = {"tb": args[0], "wb": args[1]}
crops = json.load(open(os.path.join(ROOT, "tools", "crops.json"), encoding="utf-8"))
out_dir = os.path.join(ROOT, "book"); os.makedirs(out_dir, exist_ok=True)
tmp = tempfile.mkdtemp(); cache = {}
def page(book, n):
    k = (book, n)
    if k not in cache:
        p = n + OFFSET[book]; base = os.path.join(tmp, "%s-%d" % k)
        subprocess.run(["pdftoppm", "-r", str(DPI), "-f", str(p), "-l", str(p), "-singlefile", "-png", pdf[book], base], check=True)
        cache[k] = Image.open(base + ".png").convert("RGB")
    return cache[k]
wanted = set()
for name, rects in crops.items():
    dst = os.path.join(out_dir, name + ".webp"); wanted.add(name + ".webp")
    if os.path.exists(dst) and not force: continue
    parts = []
    for book, n, x0, y0, x1, y1 in rects:
        im = page(book, n); W, H = im.size
        parts.append(im.crop((int(W * x0 / 100), int(H * y0 / 100), int(W * x1 / 100), int(H * y1 / 100))))
    w = max(p.width for p in parts); h = sum(p.height for p in parts)
    res = Image.new("RGB", (w, h), "white"); y = 0
    for p in parts: res.paste(p, (0, y)); y += p.height
    if res.width > 1100: res = res.resize((1100, int(res.height * 1100 / res.width)), Image.LANCZOS)
    res.save(dst, "WEBP", quality=72, method=6)
    print("ok", name, res.size, os.path.getsize(dst) // 1024, "Ko")
for f in os.listdir(out_dir):
    if f.endswith(".webp") and f not in wanted: os.remove(os.path.join(out_dir, f)); print("supprimé", f)
