#!/usr/bin/env python3
"""Add new tech cards (TTK) to the library and make the Google Doc copy for Drive "02 Recipes".

Source: tools/recipes/*.txt, one or more cards per file:

  === Shkembe Chorba · Bulgarian Tripe Soup · Garlic-Vinegar Dressing
  at Adriatic & Balkan / Bulgaria · N 10 · pg 350 · bowls
  ## TRIPE
  : Batch · cooked weight ≈ 1.6 kg            (note line under the component, optional)
  Beef tripe, cleaned | 1500
  Yield | 1600
  1. Step text …
  ## SERVICE
  1. …
  st 0–3 °C 48 h; reheat to ≥ 75 °C …
  fry Sunflower oil                            (optional: frying fat, counted at 5 % of the pot (what the food absorbs))
  part Sugar 0.4                               (optional: only this share is eaten, e.g. soaking syrup)
  tag Starters & canapés / Vegetables          (optional: course / main / cuisine, names from tag_recipes_names.py)

Nutrition and allergens come from tools/nutrition.py; an ingredient it does not know stops the run.
Writes r/<collection>.json and index.json rows, then runs build_order_lines.py and tag_recipes.py.
Writes one HTML file per card to --html <dir> (Drive converts it to a Google Doc) and <dir>/manifest.json.
Usage: python3 tools/add_recipes.py [--dry] [--html DIR] [files…]
"""
import json, re, sys, os, glob, hashlib, html, subprocess

sys.path.insert(0, os.path.dirname(__file__))
from nutrition import look

ALG = {1: "Gluten", 2: "Crustaceans", 3: "Eggs", 4: "Fish", 5: "Peanuts", 6: "Soy", 7: "Milk", 8: "Nuts", 9: "Celery", 10: "Mustard", 11: "Sesame", 12: "Molluscs", 13: "Lupin", 14: "Sulphites"}
ROOT = os.path.join(os.path.dirname(__file__), "..")
args = sys.argv[1:]
DRY = "--dry" in args
HT = args[args.index("--html") + 1] if "--html" in args else ""
files = [a for a in args if a.endswith(".txt")] or sorted(glob.glob(os.path.join(ROOT, "tools/recipes/*.txt")))


def num(x):
    x = x.strip().replace(",", ".")
    try:
        v = float(x)
        return int(v) if v == int(v) else v
    except ValueError:
        return None


def parse(path):
    out, cur, comp = [], None, None
    for ln, raw in enumerate(open(path, encoding="utf-8"), 1):
        s = raw.strip()
        if not s or s.startswith("#!"):
            continue
        where = f"{os.path.basename(path)}:{ln}"
        if s.startswith("=== "):
            cur = {"name": s[4:].strip(), "c": [], "st": "", "fry": [], "at": where}
            out.append(cur); comp = None; continue
        if cur is None:
            raise SystemExit(where + ": text before the first ===")
        if s.startswith("at "):
            parts = [p.strip() for p in s[3:].split(" · ")]
            cs = parts[0].split(" / ")
            cur["coll"], cur["sub"] = cs[0].strip(), (cs[1].strip() if len(cs) > 1 else "")
            for p in parts[1:]:
                if p.startswith("N "): cur["N"] = int(p[2:])
                elif p.startswith("pg "): cur["pg"] = num(p[3:])
                else: cur["unit"] = p
        elif s.startswith("## "):
            comp = [s[3:].strip(), [], [], []]; cur["c"].append(comp)
        elif s.startswith(": "):
            comp[1].append(s[2:].strip())
        elif re.match(r"^\d+\.\s", s):
            comp[3].append(re.sub(r"^\d+\.\s+", "", s))
        elif s.startswith("st "):
            cur["st"] = s[3:].strip()
        elif s.startswith("tag "):
            cur["tag"] = [x.strip() for x in s[4:].split(" / ")]
        elif s.startswith("fry "):
            cur["fry"].append(s[4:].strip().lower())
        elif s.startswith("part "):  # part <ingredient start> <share eaten>, e.g. soaking syrup
            a, b = s[5:].rsplit(" ", 1); cur.setdefault("part", []).append((a.strip().lower(), float(b)))
        elif "|" in s:
            n, q = [x.strip() for x in s.rsplit("|", 1)]
            v = num(q)
            comp[2].append([n, v if v is not None else q])
        else:
            raise SystemExit(where + ": cannot read: " + s)
    return out


cards = [c for f in files for c in parse(f)]
if not cards:
    raise SystemExit("no cards")
D = json.load(open(os.path.join(ROOT, "index.json"), encoding="utf-8"))
F = [f[0] for f in D["folders"]]
have = {r[0]: i for i, r in enumerate(D["r"])}
names = {r[1].lower(): r[0] for r in D["r"]}
unknown, made, rjs = set(), [], {}
TP = os.path.join(ROOT, "tools/recipes/tags.json")
tags = json.load(open(TP)) if os.path.exists(TP) else {}
for c in cards:
    for k in ("coll", "N", "pg"):
        if k not in c: raise SystemExit(f"{c['at']}: missing {k}")
    if c["coll"] not in F: raise SystemExit(f"{c['at']}: no collection {c['coll']}")
    cid = hashlib.md5(c["name"].encode()).hexdigest()[:8]
    if c["name"].lower() in names and names[c["name"].lower()] != cid:
        raise SystemExit(f"{c['at']}: a recipe with this name already exists")
    tot = [0.0, 0.0, 0.0]; algs = {}; diet = 2
    for comp in c["c"]:
        for n, q in comp[2]:
            if re.match(r"^(cooked |total )?yield", n, re.I) or n.endswith("(above)") or not isinstance(q, (int, float)):
                continue
            v = look(n)
            if v is None:
                unknown.add(n); continue
            pr, fa, ca, al, di = v
            k = q / 100 * (0.3 if re.search(r"\blive\b|in shell|in the shell|shell-on", n, re.I) else 1) * (0.7 if re.search(r"bone-in|jointed|on the bone|whole,", n, re.I) else 1) * (0.05 if any(n.lower().startswith(f) for f in c["fry"]) else 1)
            for a_, b_ in c.get("part", []):
                if n.lower().startswith(a_): k *= b_
            tot[0] += pr * k; tot[1] += fa * k; tot[2] += ca * k
            for a in al: algs.setdefault(a, [])
            for a in al:
                nm = re.sub(r"\s*\(.*?\)", "", n).lower()
                if nm not in algs[a]: algs[a].append(nm)
            diet = min(diet, di)
    N, pg = c["N"], c["pg"]
    p = [round(x / N, 1) for x in tot]; p.append(round(p[0] * 4 + p[1] * 9 + p[2] * 4))
    h = [round(x * 100 / pg, 1) for x in p[:3]]; h.append(round(p[3] * 100 / pg))
    al = " · ".join(f"{a} {ALG[a]} ({', '.join(algs[a])})" for a in sorted(algs))
    al = (al + ". Contains " + ", ".join(ALG[a].lower() for a in sorted(algs)) + ".") if algs else "None of the 14 EU allergens."
    unit = c.get("unit", "plates")
    yl = f"Yield: {N} {unit} · Portion: {pg} g"
    det = {"yl": yl, "c": c["c"], "st": c["st"], "al": al, "nu": {"p": p, "h": h}}
    fi = F.index(c["coll"]); slug = D["folders"][fi][1]
    rjs.setdefault(slug, {})[cid] = det
    row = [cid, c["name"], fi, c["sub"], N, pg, "g", sorted(algs), p[3], [], [], diet]
    if cid in have: D["r"][have[cid]][:12] = row
    else: D["r"].append(row); have[cid] = len(D["r"]) - 1
    made.append((cid, c, det))
    if c.get("tag"):  # course / main / cuisine by name, e.g. "Starters & canapés / Vegetables"
        from tag_recipes_names import COURSES, MAINS, CUISINES
        t = c["tag"] + [None] * (3 - len(c["tag"]))
        tags[cid] = [COURSES.index(t[0]) if t[0] else None, (MAINS.index(t[1]) if t[1] != "-" else -1) if t[1] else None, CUISINES.index(t[2]) if t[2] else None]
if unknown:
    raise SystemExit("add these to tools/nutrition.py:\n  " + "\n  ".join(sorted(unknown)))
print(len(made), "cards:", ", ".join(c["name"].split(" · ")[0] for _, c, _ in made))
if DRY:
    sys.exit(0)
for slug, add in rjs.items():
    p = os.path.join(ROOT, "r", slug + ".json")
    d = json.load(open(p, encoding="utf-8")); d.update(add)
    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump(D, open(os.path.join(ROOT, "index.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump(tags, open(TP, "w"), separators=(",", ":"), sort_keys=True)
subprocess.run([sys.executable, "tools/build_order_lines.py"], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
subprocess.run([sys.executable, "tools/tag_recipes.py"], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)

# ---------- Google Doc copies, in the format of the Drive "02 Recipes" docs ----------
if HT:
    os.makedirs(HT, exist_ok=True)
    E = html.escape
    man = []
    DR = json.load(open(os.path.join(ROOT, "tools/recipes/drive.json")))
    for cid, c, det in made:
        if cid in DR["docs"]: continue  # already on Drive
        name = c["name"]
        o = [f"<h1><b>{E(name)}</b></h1>", f"<p>TTK · {E(det['yl'].replace('Yield: ', 'Yield: '))}</p>",
             f"<p>{E(c['coll'][0] + c['coll'][1:].lower())}{' · ' + E(c['sub'].lower()) if c['sub'] else ''}</p>"]
        for nm, notes, ing, steps in c["c"]:
            o.append(f"<h2><b>{E(nm)}</b></h2>")
            for n in notes: o.append(f"<p>{E(n)}</p>")
            if ing:
                o.append('<table border="1" cellpadding="4"><tr><td>Ingredient</td><td>g</td></tr>' + "".join(f"<tr><td>{E(str(n))}</td><td>{E(str(q))}</td></tr>" for n, q in ing) + "</table>")
            if steps: o.append("<ol>" + "".join(f"<li>{E(s)}</li>" for s in steps) + "</ol>")
        o += ["<h2><b>STORAGE</b></h2>", f"<p>{E(det['st'])}</p>", "<h2><b>ALLERGENS</b></h2>", f"<p>{E(det['al'])}</p>", "<h2><b>NUTRITION</b></h2>",
              '<table border="1" cellpadding="4"><tr><td></td><td>Prot</td><td>Fat</td><td>Carb</td><td>kcal</td></tr>'
              + "".join(f"<tr><td>{lab}</td>" + "".join(f"<td>{v}</td>" for v in vals) + "</tr>" for lab, vals in (("Portion", det["nu"]["p"]), ("100 g", det["nu"]["h"]))) + "</table>"]
        doc = "<html><head><meta charset='utf-8'></head><body>" + "\n".join(o) + "</body></html>"
        ab = "".join(w[0] for w in re.findall(r"[A-Za-z]+", c["coll"]) if w.lower() not in ("and",)).upper()
        short = re.sub(r"[^A-Za-z0-9]+", "_", __import__("unicodedata").normalize("NFKD", name.split(" · ")[0]).encode("ascii", "ignore").decode()).strip("_")
        fp = os.path.join(HT, cid + ".html"); open(fp, "w", encoding="utf-8").write(doc)
        man.append({"id": cid, "title": f"TTK_{ab}_{short}", "folder": DR["folders"].get(c["coll"] + (" / " + c["sub"] if c["sub"] else ""), "?"), "path": os.path.abspath(fp),
                    "sha256": hashlib.sha256(doc.encode()).hexdigest()})
    json.dump(man, open(os.path.join(HT, "manifest.json"), "w"), indent=1, ensure_ascii=False)
    print("html:", len(man), "files in", HT)
