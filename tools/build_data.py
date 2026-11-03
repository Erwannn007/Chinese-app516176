#!/usr/bin/env python3
"""Convertit raw/*.txt (transcriptions des cours) en data.js pour l'app."""
import json, re, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = {}
def lesson(n):
    return L.setdefault(n, {"n": n, "title": "", "py": "", "fr": "", "obj": [], "texts": [], "grammar": [],
        "tips": [], "pron": [], "hanzi": {"strokes": [], "rules": [], "chars": []}, "ex": [], "tw": None, "pp": []})
def split(s): return [x.strip() for x in s.split("|")]
LAB = re.compile(r"^([A-F]|[①②③④⑤⑥⑦⑧])\s+")
def opts(s): return [LAB.sub("", o.strip()) for o in s.split("/")]
def labels(s):
    ls = [LAB.match(o.strip()) for o in s.split("/")]
    return [m.group(1) for m in ls] if all(ls) else None

# --- captures des livres -------------------------------------------------
# IMG tb 15 13 28 92 56 [+ wb 16 5 5 95 40] | consigne [| t2]
#   tb = manuel, wb = cahier ; numéro de page imprimé dans le livre ; rectangle en % (x0 y0 x1 y1).
#   « t2 » : bouton pour écouter le texte 2 de la leçon (exercices « écoute et choisis »).
# IMG -  : les exercices suivants n'ont plus de capture.
# Une question peut commencer par [n] : numéro de la question dans le livre.
CROPS = {}
IMGCUR = {}
def set_img(rest, les):
    IMGCUR.clear()
    if rest.strip() == "-": return
    parts = split(rest); spec = parts[0]; rects = []
    for r in spec.split("+"):
        b, pg, *box = r.split(); rects.append([b, int(pg)] + [float(x) for x in box])
    first = rects[0]; base = "%s%03d" % (first[0], first[1]); k = 1
    while "%s-%d" % (base, k) in CROPS: k += 1
    name = "%s-%d" % (base, k); CROPS[name] = rects
    IMGCUR.update({"img": name, "help": parts[1] if len(parts) > 1 and parts[1] else "",
                   "listen": int(parts[2][1:]) if len(parts) > 2 and parts[2].startswith("t") else 0, "les": les})
def add_ex(cur, ex, lab=None):
    m = re.match(r"^\[([^\]]+)\]\s*", ex["q"])
    if m: ex["num"] = m.group(1); ex["q"] = ex["q"][m.end():]
    if IMGCUR:
        ex["img"] = IMGCUR["img"]
        if IMGCUR["help"]: ex["help"] = IMGCUR["help"]
        if IMGCUR["listen"]: ex["listen"] = IMGCUR["listen"]
    if lab: ex["lab"] = lab
    cur["ex"].append(ex)

for f in sorted(glob.glob(os.path.join(ROOT, "raw", "L*.txt"))):
    cur = None; text = None; gram = None; bank = None; blab = None; IMGCUR.clear()
    for line in open(f, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line.strip(): continue
        tag, _, rest = line.partition(" ")
        if tag == "#":
            n, zh, fr = split(rest); cur = lesson(int(n)); cur["title"] = zh; cur["fr"] = fr
        elif tag == "OBJ": cur["obj"].append(rest)
        elif tag == "##":
            idx, scene = split(rest); text = {"scene": scene, "lines": [], "vocab": []}; cur["texts"].append(text); gram = None
        elif tag == "V":
            zh, py, pos, fr = split(rest); text["vocab"].append({"zh": zh, "py": py, "pos": pos, "fr": fr})
        elif tag == "TIP": cur["tips"].append(rest)
        elif tag == "G":
            t, d = split(rest); gram = {"t": t, "d": d, "ex": []}; cur["grammar"].append(gram)
        elif tag == "EX":
            zh, fr = split(rest); gram["ex"].append({"zh": zh, "fr": fr})
        elif tag == "TW":
            zh, fr = split(rest); cur["tw"] = {"zh": zh, "fr": fr}
        elif tag == "PP":
            zh, fr = split(rest); cur["pp"].append({"zh": zh, "fr": fr})
        elif tag == "IMG": set_img(rest, cur["n"])
        elif tag == "XB": bank = opts(rest); blab = labels(rest)
        elif tag == "X":
            q, a, e = split(rest); add_ex(cur, {"type": "fill", "src": "Manuel · Choisir le mot", "q": q, "a": a, "opts": bank, "e": e}, blab)
        elif tag == "XM":
            q, a, e = split(rest); add_ex(cur, {"type": "fill", "src": "Manuel · Échauffement", "q": q, "a": a, "opts": bank, "e": e}, blab)
        elif tag == "XC":
            q, a, e = split(rest); add_ex(cur, {"type": "write", "src": "Manuel · Compléter le dialogue", "q": q, "a": a, "e": e})
        elif tag == "XL":
            q, a, o, e = split(rest); add_ex(cur, {"type": "mcq", "src": "Manuel · Compréhension des textes", "q": q, "a": a, "opts": opts(o), "e": e}, labels(o))
        elif tag == "XQ":
            q, a, *e = split(rest); add_ex(cur, {"type": "open", "src": "Manuel · Répondre aux questions", "q": q, "a": a, "e": e[0] if e else ""})
        elif tag == "XP":
            q, a, *e = split(rest); add_ex(cur, {"type": "open", "src": "Manuel · Décrire l'image", "q": q, "a": a, "e": e[0] if e else ""})
        elif re.match(r"^[^\s:：]+[:：]", line) and text is not None:
            who, rest2 = re.split(r"[:：]", line, maxsplit=1)
            zh, fr = split(rest2); text["lines"].append({"who": who.strip(), "zh": zh, "fr": fr})
        else:
            raise SystemExit(f"{f}: ligne non comprise: {line}")

for f in sorted(glob.glob(os.path.join(ROOT, "raw", "W*.txt"))):
    cur = None; bank = None; blab = None; pron = None; IMGCUR.clear()
    for line in open(f, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line.strip(): continue
        tag, _, rest = line.partition(" ")
        if tag == "@": cur = lesson(int(rest))
        elif tag == "PRON":
            t, d = split(rest); pron = {"t": t, "d": d, "ex": []}; cur["pron"].append(pron)
        elif tag == "PEX":
            zh, py = split(rest); pron["ex"].append({"zh": zh, "py": py})
        elif tag == "HZ":
            s, d = split(rest); cur["hanzi"]["strokes"].append({"s": s, "d": d})
        elif tag == "HR":
            zh, fr, c = split(rest); cur["hanzi"]["rules"].append({"zh": zh, "fr": fr, "c": c})
        elif tag == "HC": cur["hanzi"]["chars"] += rest.split()
        elif tag == "IMG": set_img(rest, cur["n"])
        elif tag == "WB": bank = opts(rest); blab = labels(rest)
        elif tag == "WQ":
            q, a, e = split(rest); i = (blab or list("ABCDEF")).index(a)
            add_ex(cur, {"type": "mcq", "src": "Cahier · Exercice type HSK", "q": q, "a": bank[i], "opts": bank, "e": e}, blab)
        elif tag == "WR":
            q, o, a, *e = split(rest); lab = labels(o); o = opts(o); i = (lab or list("ABCDEF")).index(a)
            src = "Cahier · Lecture type HSK" if "★" in q else "Cahier · Prononciation"
            add_ex(cur, {"type": "mcq", "src": src, "q": q, "a": o[i], "opts": o, "e": e[0] if e else ""}, lab)
        else:
            raise SystemExit(f"{f}: ligne non comprise: {line}")

mock = L.pop(99, None)
data = {"lessons": [L[k] for k in sorted(L)], "mock": mock["ex"] if mock else []}
for les in data["lessons"]:
    les["vocab"] = [dict(v, t=i + 1) for i, t in enumerate(les["texts"]) for v in t["vocab"]]
with open(os.path.join(ROOT, "tools", "crops.json"), "w", encoding="utf-8") as fh:
    fh.write("{\n" + ",\n".join(json.dumps(k) + ": " + json.dumps(v) for k, v in CROPS.items()) + "\n}\n")
out = os.path.join(ROOT, "data.js")
with open(out, "w", encoding="utf-8") as fh:
    fh.write("// Généré par tools/build_data.py à partir de raw/*.txt — ne pas modifier à la main.\n")
    fh.write("window.COURSE = " + json.dumps(data, ensure_ascii=False) + ";\n")
print("leçons:", len(data["lessons"]), "| mots:", sum(len(l["vocab"]) for l in data["lessons"]),
      "| exercices:", sum(len(l["ex"]) for l in data["lessons"]), "| HSK blanc:", len(data["mock"]))
for l in data["lessons"]:
    print(l["n"], l["title"], "vocab", len(l["vocab"]), "ex", len(l["ex"]), "gram", len(l["grammar"]), "pron", len(l["pron"]))
