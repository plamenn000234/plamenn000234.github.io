"""Fill the missing portion weight (index.json r[5] pg, r[6] pu) from the yield line of each recipe card.

Reads the "yl" text in r/<collection>.json, e.g. "Portion: 3 pcs ≈ 135 g", "50 guests · 90 g per guest",
"Bowl: 250 ml", "Yield: 20 pcs · ≈ 52 g baked". Recipes whose yield line gives no weight are left as they are
and listed at the end. Run from the repo root: python3 tools/fill_portion_weights.py
"""
import json, re

j = json.load(open("index.json", encoding="utf-8"))
F = j["folders"]
cache = {}
def detail(a):
    s = F[a[2]][1]
    if s not in cache:
        cache[s] = json.load(open("r/%s.json" % s, encoding="utf-8"))
    return cache[s].get(a[0]) or {}

N = r"(\d+(?:[.,]\d+)?)"
RULES = [
    re.compile(r"Portion[^·]*?(?:≈|~)?\s*" + N + r"\s*(g|ml)\b", re.I),          # Portion: 3 pcs ≈ 135 g
    re.compile(N + r"\s*(g)\s+(?:cooked meat\s+|cooked\s+)?per guest", re.I),      # 90 g per guest
    re.compile(r"(?:Bowl|Order|Glass|Cup)[^·]*?(?:≈|~)?\s*" + N + r"\s*(g|ml)\b", re.I),  # Bowl: 250 ml, Order: 2 halves ≈ 250 g
]
PCS = re.compile(r"Yield:\s*(\d+)\s*(?:pcs|pieces|tartlets|buns)\b[^·]*·\s*(?:\d+\s*g raw\s*/\s*)?≈\s*" + N + r"\s*g", re.I)  # Yield: 20 pcs · ≈ 52 g

# Checked by hand: the yield line splits the portion in a way the rules read wrong.
FIX = {"5bad24e8": (28.0, "g")}  # satay canapé: 1 skewer ≈ 20 g + 8 g sauce
filled, left = 0, []
for a in j["r"]:
    if a[5]:
        continue
    yl = detail(a).get("yl") or ""
    got = FIX.get(a[0])
    if a[4] == 1 and not got:  # a one-batch card (a mix, a crumb, a dough): its portion is the whole batch
        left.append((a[1], yl)); continue
    # In the Portion part, the served weight after "≈" wins over a raw weight in brackets.
    seg = re.search(r"Portion:([^·]*)", yl, re.I)
    if seg and not got:
        ap = re.findall(r"≈\s*" + N + r"\s*(g|ml)\b(?![^(]*raw\b)", seg.group(1))
        if ap:
            got = (float(ap[-1][0].replace(",", ".")), ap[-1][1].lower())
    for rx in ([] if got else RULES):
        m = rx.search(yl)
        if m:
            got = (float(m.group(1).replace(",", ".")), m.group(2).lower()); break
    if not got:
        m = PCS.search(yl)
        if m and int(m.group(1)) == a[4]:
            got = (float(m.group(2).replace(",", ".")), "g")
    if got and 0 < got[0] < 3000:
        a[5], a[6] = got[0], got[1]; filled += 1
    else:
        left.append((a[1], yl))

open("index.json", "w", encoding="utf-8").write(json.dumps(j, ensure_ascii=False, separators=(",", ":")))
print("filled", filled, "left", len(left))
for n, yl in left:
    print(" -", n[:70], "|", yl[:80])
