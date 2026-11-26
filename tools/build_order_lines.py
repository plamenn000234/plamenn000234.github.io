#!/usr/bin/env python3
"""Fill missing order (product) lines in index.json from the recipe cards in r/*.json.

For every recipe whose product list (index.json r[i][10]) is empty, each numeric
ingredient of its recipe card is matched to a product in index.json "products":
exact name, then names learned from recipes that already have product lines,
then looser forms (no brackets, part before the comma, singular/plural).
Ingredients that match nothing become new products, with a section guessed from
the name. Water, ice and "Yield" rows are skipped; sub-recipe rows such as
"Beef ragù (A)" are skipped too, because their own ingredients are listed.

Usage: python3 tools/build_order_lines.py [--dry]
"""
import json, glob, re, sys, unicodedata, collections

DRY = "--dry" in sys.argv
D = json.load(open("index.json", encoding="utf-8"))
det = {p[2:-5]: json.load(open(p, encoding="utf-8")) for p in glob.glob("r/*.json")}


def fold(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"\s+", " ", re.sub(r"[̀-ͯ]", "", s)).strip()


YIELD = re.compile(r"^(cooked |total )?yield", re.I)
SKIP = re.compile(r"^(water|ice|ice water|ice cubes|crushed ice|water, (hot|cold|warm|boiling|iced|filtered|sparkling)|hot water|cold water|iced water|boiling water|warm water)$")
SUBREC = re.compile(r"\([A-Z]\)\s*$")

P = D["products"]
PN = {fold(p[0]): i for i, p in enumerate(P)}

# learn ingredient-name -> product from recipes that already have product lines
alias = collections.defaultdict(collections.Counter)
for a in D["r"]:
    if not a[10]:
        continue
    d = det[D["folders"][a[2]][1]].get(a[0])
    if not d:
        continue
    N = a[4] or 1
    ing = collections.defaultdict(float)
    for c in d["c"]:
        for x in c[2]:
            if isinstance(x[1], (int, float)) and not YIELD.match(x[0]):
                ing[x[0]] += x[1]
    lines = [(pi, g * N) for pi, g in a[10]]
    used = set()
    for name, q in ing.items():
        cands = [k for k, (pi, g) in enumerate(lines) if k not in used and abs(g - q) <= max(0.6, q * 0.02)]
        ex = [k for k in cands if lines[k][0] == PN.get(fold(name))]
        k = ex[0] if ex else (cands[0] if len(cands) == 1 else None)
        if k is None:
            continue
        used.add(k)
        alias[fold(name)][lines[k][0]] += 1
ALIAS = {}
for n, cnt in alias.items():
    top = cnt.most_common(2)
    if top[0][1] >= 2 and (len(top) == 1 or top[0][1] >= 2 * top[1][1]):
        ALIAS[n] = top[0][0]


def look(f):
    if f in PN:
        return PN[f]
    return ALIAS.get(f)


def variants(name):
    f = fold(name)
    yield f
    nb = fold(re.sub(r"\s*\([^)]*\)", "", name))
    yield nb
    for base in (f, nb):
        head = base.split(",")[0].strip()
        yield head
        for h in (base, head):
            yield h[:-1] if h.endswith("s") else h + "s"
            if h.endswith("es"):
                yield h[:-2]
            if h.endswith("ies"):
                yield h[:-3] + "y"


def match(name):
    for v in variants(name):
        if v and look(v) is not None:
            return look(v)
    return None


SEC = [  # (section index, keywords); first match wins, each keyword starts at a word boundary
    (5, r"cocoa|chocolate|gold leaf|wafer|charcoal|gellan|agar|pectin|gelatin|malt powder|biscuit|bread|rolls?\b|loaf|flatbread|flour|pasta|penne|couscous|rice|beans?, dry|beans?\b.*cooked|lentil|sultana|raisin|wood chips|oak chips|chips for smoking|acid\b|custard powder|fondant"),
    (1, r"fish|salmon|trout|cod\b|coley|saithe|turbot|tuna|prawn|shrimp|crab|lobster|mussel|clam|oyster|squid|octopus|scallop|anchov|sardine|mackerel|herring|matjes|rollmops|kipper|carp\b|bream|sea bass|halibut|\beel\b|roe\b|caviar|niboshi|bonito|katsuobushi|seafood|langoustine|cuttlefish|urchin|crayfish"),
    (3, r"\w*berr|currant|jam\b|pur[ée]e|candied|peel\b|lettuce|papaya|plantain|cress|apple|pear\b|quince|cherr|plum|peach|apricot|orange|lemon\b|lime\b|yuzu|mandarin|grape|melon|mango|banana|pineapple|fig\b|date\b|pomegranate|rhubarb|tomato|potato|onion|garlic|shallot|leek|carrot|celer|beet|cabbage|kale|spinach|salad|cucumber|courgette|zucchini|aubergine|chill?i|mushroom|chanterelle|porcini|truffle|pumpkin|squash|cassava|yam\b|parsnip|turnip|radish|kohlrabi|fennel|asparagus|artichoke|avocado|ginger, fresh|greens|shungiku|ramsons|ackee|egusi|fruit|vegetable|corn\b|maize cobs"),
    (0, r"beef|veal|pork|lamb\b|mutton|chicken|duck|goose\b|turkey|quail|venison|rabbit|game\b|guinea fowl|pigeon\b|bacon|ham\b|sausage|salami|chorizo|lingui|mince|oxtail|liver|kidney|tripe|chuck|brisket|ribs\b|belly|loin|steak|lard|casing|prosciutto|pancetta|guanciale|carne|kie[lł]basa|speck|bones?\b"),
    (2, r"milk|cream|butter|cheese|queijo|yog|kefir|eggs?\b|ricotta|mascarpone|mozzarella|parmesan|feta|bryndza|kajmak|labneh|curd|ghee|kibbeh|rennet|culture"),
    (4, r"basil|parsley|coriander leaves|dill\b|mint leaves|chives|tarragon|chervil|sage\b|rosemary|thyme|shiso|mitsuba|lovage|sorrel|herbs?\b"),
    (7, r"stock\b|broth|fond\b|dashi|bouillon|demi"),
    (6, r""),  # everything else that is a liquid, spice or sauce falls here via the default below
]
SPICE = re.compile(r"oil\b|vinegar|sauce|spice|seasoning|pepper|paprika|cumin|cinnamon|nutmeg|clove|cardamom|saffron|vanilla|syrup|honey|mustard|ketchup|mayonnaise|wine|vin\b|vermouth|rum\b|gin\b|vodka|whisk|brandy|liqueur|cacha|campari|bitters|beer|cider|juice|tea\b|coffee|soda|tonic|baharat|advieh|berbere|mitmita|yaji|golpar|sumac|glaze|nappage|colou?r|extract|essence|paste|miso|soy|salt\b|allspice|pimento|chutney|relish|ajvar|amba|giardiniera|piccalilli|shito|cassareep|tenkasu|rose petals|mint\b|flavouring|seeds?\b")
DRINK = re.compile(r"juice|wine|vin\b|vermouth|rum\b|gin\b|vodka|whisk|brandy|liqueur|cacha|campari|bitters|beer|cider|soda|tonic|syrup|milk\b|vinegar|sake|mirin|stock\b|broth|oil\b")


def section(name):
    f = fold(name)
    if SPICE.search(f) and not re.search(r"\b(cheese|butter)\b", f):
        first = None
    for s, kw in SEC[:-1]:
        if re.search(r"\b(" + kw + ")", f):
            if s in (5, 3) and SPICE.search(f) and re.search(r"paste|sauce|spice|syrup|juice", f):
                return 6
            return s
    return 6 if SPICE.search(f) else 5


# hand corrections for names the keyword rules place badly: name -> (section, unit)
M, F, DA, V, H, DR, O, ST = 0, 1, 2, 3, 4, 5, 6, 7
OVERRIDE = {}
for sec, unit, names in [
    (M, "kg", "Chuck roll Black Angus, trimmed|House coppa (cured)|House finocchiona (cured)"),
    (F, "kg", "Hamachi (yellowtail) collar|Red mullet, whole (AP)"),
    (O, "L", "Absinthe|Amaretto|Aperol|Champagne brut|Crème de cassis|Green Chartreuse|Marc de Champagne|Pastis (anise spirit)|Pisco|Tequila blanco (100% agave)|Verjus|Cherry brandy|Orange bitters|Peach liqueur|Garlic-infused olive oil|Mineral water, 500 ml bottle"),
    (O, "kg", "Unagi tare (house eel sauce)|Bajan seasoning (herbs, chilli, garlic, lime)|Plant beurre blanc|Calabrian chillies, crushed"),
    (V, "kg", "Bottle gourd (lauki), peeled|Broccoli stalks, peeled|Burdock root (gobo)|Cauliflower leaves & core|Clementines|Dandelion leaves, young|Elderflower heads|Lotus root|Lychees, peeled, stoned|Persimmon (kaki)|Rosehips, halved & deseeded|Spruce tips, young|Stinging nettle tops|Taro root|Watermelon rind, green skin removed"),
    (H, "kg", "Perilla leaves (kkaennip)|Lemon thyme, fresh|Lemon verbena, fresh|Chinese chives (garlic chives)"),
    (DA, "kg", "Aged Gouda (24 months)|Vacherin Mont d'Or, whole 500 g"),
    (DR, "kg", "Reshteh or linguine, dry|Pigeon peas (gandules), cooked|Kuzu or potato starch|Polvilho azedo (sour cassava starch)|Egusi (ground melon seeds)|Lemon curd"),
    (ST, "L", "Dongchimi or beef broth, chilled (naengmyeon)|Roasted mushroom & kombu jus"),
]:
    for n in names.split("|"):
        OVERRIDE[fold(n)] = (sec, unit)


added = {}
stats = collections.Counter()
for a in D["r"]:
    if a[10]:
        continue
    d = det[D["folders"][a[2]][1]].get(a[0])
    if not d or not d["c"]:
        stats["no card"] += 1
        continue
    N = a[4] or 1
    acc = collections.OrderedDict()
    for c in d["c"]:
        for x in c[2]:
            name, q = x[0], x[1]
            if not isinstance(q, (int, float)) or q <= 0 or YIELD.match(name) or SUBREC.search(name):
                continue
            if SKIP.match(fold(name)):
                stats["skipped water/ice"] += 1
                continue
            pi = match(name)
            if pi is None:
                key = fold(re.sub(r"\s*\([^)]*\)$", "", name)) or fold(name)
                if key not in added:
                    sec, unit = OVERRIDE.get(fold(name), (section(name), "L" if DRINK.search(key) else "kg"))
                    P.append([name[0].upper() + name[1:], sec, unit, 1.0, 1000.0, ""])
                    added[key] = len(P) - 1
                    PN[key] = len(P) - 1
                pi = added[key]
                stats["new product line"] += 1
            else:
                stats["matched line"] += 1
            acc[pi] = acc.get(pi, 0) + q / N
    a[10] = [[pi, round(g, 2) if g >= 0.01 else round(g, 4)] for pi, g in acc.items()]
    stats["recipes filled"] += 1

print(dict(stats))
print("new products:", len(added))
for k, i in list(added.items()):
    print("  ", P[i][0], "|", D["sections"][P[i][1]], "|", P[i][2])
if not DRY:
    with open("index.json", "w", encoding="utf-8") as f:
        json.dump(D, f, ensure_ascii=False, separators=(",", ":"))
    print("index.json written")
