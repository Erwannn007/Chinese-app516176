#!/usr/bin/env python3
"""Convertit raw/*.txt (transcriptions des cours) en data.js pour l'app."""
import json, re, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = {}
def lesson(n):
    return L.setdefault(n, {"n": n, "title": "", "py": "", "fr": "", "obj": [], "texts": [], "grammar": [],
        "tips": [], "pron": [], "hanzi": {"strokes": [], "rules": [], "chars": []}, "ex": [], "tw": None, "pp": []})
def split(s): return [x.strip() for x in s.split("|")]
def opts(s): return [re.sub(r"^[A-F]\s+", "", o.strip()) for o in s.split("/")]

for f in sorted(glob.glob(os.path.join(ROOT, "raw", "L*.txt"))):
    cur = None; text = None; gram = None; bank = None
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
        elif tag == "XB": bank = rest.split("/")
        elif tag == "X":
            q, a, e = split(rest); cur["ex"].append({"type": "fill", "src": "Manuel · Choisir le mot", "q": q, "a": a, "opts": bank, "e": e})
        elif tag == "XC":
            q, a, e = split(rest); cur["ex"].append({"type": "write", "src": "Manuel · Compléter le dialogue", "q": q, "a": a, "e": e})
        elif tag == "XL":
            q, a, o, e = split(rest); cur["ex"].append({"type": "mcq", "src": "Manuel · Compréhension des textes", "q": q, "a": a, "opts": o.split("/"), "e": e})
        elif tag == "XQ":
            q, a = split(rest); cur["ex"].append({"type": "open", "src": "Manuel · Répondre aux questions", "q": q, "a": a})
        elif tag == "XP":
            q, a = split(rest); cur["ex"].append({"type": "open", "src": "Manuel · Décrire l'image", "q": q, "a": a})
        elif re.match(r"^[^\s:：]+[:：]", line) and text is not None:
            who, rest2 = re.split(r"[:：]", line, maxsplit=1)
            zh, fr = split(rest2); text["lines"].append({"who": who.strip(), "zh": zh, "fr": fr})
        else:
            raise SystemExit(f"{f}: ligne non comprise: {line}")

for f in sorted(glob.glob(os.path.join(ROOT, "raw", "W*.txt"))):
    cur = None; bank = None; pron = None
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
        elif tag == "WB": bank = opts(rest)
        elif tag == "WQ":
            q, a, e = split(rest); i = "ABCDEF".index(a)
            cur["ex"].append({"type": "mcq", "src": "Cahier · Exercice type HSK", "q": q, "a": bank[i], "opts": bank, "e": e})
        elif tag == "WR":
            q, o, a = split(rest); o = opts(o); i = "ABCDEF".index(a)
            src = "Cahier · Lecture type HSK" if "★" in q else "Cahier · Prononciation"
            cur["ex"].append({"type": "mcq", "src": src, "q": q, "a": o[i], "opts": o, "e": ""})
        else:
            raise SystemExit(f"{f}: ligne non comprise: {line}")

mock = L.pop(99, None)
data = {"lessons": [L[k] for k in sorted(L)], "mock": mock["ex"] if mock else []}
for les in data["lessons"]:
    les["vocab"] = [dict(v, t=i + 1) for i, t in enumerate(les["texts"]) for v in t["vocab"]]
out = os.path.join(ROOT, "data.js")
with open(out, "w", encoding="utf-8") as fh:
    fh.write("// Généré par tools/build_data.py à partir de raw/*.txt — ne pas modifier à la main.\n")
    fh.write("window.COURSE = " + json.dumps(data, ensure_ascii=False) + ";\n")
print("leçons:", len(data["lessons"]), "| mots:", sum(len(l["vocab"]) for l in data["lessons"]),
      "| exercices:", sum(len(l["ex"]) for l in data["lessons"]), "| HSK blanc:", len(data["mock"]))
for l in data["lessons"]:
    print(l["n"], l["title"], "vocab", len(l["vocab"]), "ex", len(l["ex"]), "gram", len(l["grammar"]), "pron", len(l["pron"]))
