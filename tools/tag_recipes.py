#!/usr/bin/env python3
"""Give every recipe in index.json three tags for the 3.0 Recipes screen, stored as r[i][12] = [course, main, cuisine]:
course  = what dish it is (COURSES), main = what it is made of (MAINS, -1 for sweet, drinks and sauces), cuisine = region (CUISINES, -1 = international).
Rules use the collection, the sub-category, the name and the product lines. Run again after adding recipes.
Also moves the old "Bulgarian Classics" collection into "Adriatic & Balkan" (sub "Bulgaria"), as Plamen asked on 28.11.2026.
Usage: python3 tools/tag_recipes.py [--dry]
"""
import json, re, sys, collections, os

COURSES = ["Breakfast", "Starters & canapés", "Salads", "Soups", "Mains", "Sides", "Sauces & dressings", "Bases & stocks", "Desserts", "Bread & bakery", "Drinks"]
MAINS = ["Beef & veal", "Pork", "Lamb & goat", "Poultry", "Game", "Fish", "Seafood", "Eggs", "Cheese", "Vegetables", "Mushrooms", "Pasta, rice & grains", "Legumes"]
CUISINES = ["Balkan", "Mediterranean", "French", "Central & Northern Europe", "Eastern Europe & Caucasus", "Middle East & Africa", "Indian", "East & Southeast Asia", "Latin America & Caribbean", "North American"]
DRY = "--dry" in sys.argv
os.chdir(os.path.join(os.path.dirname(__file__), ".."))
D = json.load(open("index.json", encoding="utf-8"))

# ---------- Bulgarian Classics -> Adriatic & Balkan ----------
names = [f[0] for f in D["folders"]]
if "Bulgarian Classics" in names:
    bi, ai = names.index("Bulgarian Classics"), names.index("Adriatic & Balkan")
    bslug, aslug = D["folders"][bi][1], D["folders"][ai][1]
    bd = json.load(open(f"r/{bslug}.json", encoding="utf-8")); ad = json.load(open(f"r/{aslug}.json", encoding="utf-8"))
    ad.update(bd)
    for r in D["r"]:
        if r[2] == bi: r[2] = ai; r[3] = "Bulgaria"
    for r in D["r"]:
        if r[2] > bi: r[2] -= 1
    del D["folders"][bi]
    if not DRY:
        json.dump(ad, open(f"r/{aslug}.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        os.remove(f"r/{bslug}.json")
    print("moved", len(bd), "Bulgarian recipes into", aslug)
F = [f[0] for f in D["folders"]]; P = D["products"]

REGION = {
    0: ["Adriatic & Balkan"],
    1: ["Italian", "Spanish & Tapas", "Portuguese", "Greek", "Salumi & Dry-Curing"],
    2: ["French", "Viennoiserie Lab", "Pâtisserie Boutique"],
    3: ["Alpine", "Nordic", "German & Austrian", "British & Irish Pub", "Après-Ski", "Ski Lunches & Mountain Picnic", "Afternoon Tea"],
    4: ["Eastern European", "Georgian & Caucasus"],
    5: ["Middle Eastern", "Persian", "North African", "African", "Turkish", "Iftar & Halal Buffet"],
    6: ["Indian"],
    7: ["Pan-Asian", "Robata & Nikkei", "Sushi & Japanese Counter", "Ramen & Noodle Bar", "Hot Pot, Shabu-Shabu & Table Cooking", "Dim Sum & Cantonese Roast", "Kaiseki & Izakaya", "Asian Pâtisserie"],
    8: ["Latin American", "Caribbean"],
    9: ["American Diner & Southern", "Creole", "BBQ & Smokehouse", "Burgers"],
}
FREG = {n: k for k, v in REGION.items() for n in v}
# words in a name or sub-category that point to a region (for theme collections such as Buffet)
RW = [
    (0, r"bulgar|serbia|croat|dalmat|sloven|bosnia|montenegr|macedon|romania|balkan|banitsa|kavarma|shopska|tarator|lyutenitsa|kebapche|kyufte|ćevap|cevap|pljeskav|ajvar|sarma|gyuvech|kapama|musaka|moussaka bulgar|burek"),
    (1, r"ital|pasta|risotto|pizza|focaccia|gnocchi|lasagn|carbonara|bolognese|tirami|panna cotta|spanish|paella|tapas|gazpacho|tortilla espa|portug|bacalhau|greek|souvlaki|tzatziki|spanakop|mediterr|provenç|caprese|bruschetta|antipast|arancini|osso buco"),
    (2, r"french|fran[cç]ais|bourguignon|provençal|ratatouille|quiche|crêpe|crepe|gratin dauph|niçoise|nicoise|bouillabaisse|confit|vichyssoise|béarnaise|bearnaise|hollandaise|velouté|tarte tatin|cassoulet|coq au vin|blanquette|beurre blanc"),
    (3, r"german|austria|schnitzel|strudel|bavar|swiss|alpine|rösti|rosti|fondue|nordic|scandi|swed|danish|norweg|finn|british|english|irish|scottish|pie and mash|fish and chips|shepherd|yorkshire|sunday roast|bratwurst|spätzle|spaetzle"),
    (4, r"russian|ukrain|polish|borscht|pelmeni|varenik|pierogi|blini|stroganoff|olivier|georgian|khachapuri|khinkali|caucas|armenia|azerbai|czech|hungar|goulash|paprikash|shashlik"),
    (5, r"turkish|lebanes|levant|syrian|israeli|persian|iran|moroc|tagine|couscous|tunis|alger|egypt|ethiop|african|arabic|arab|middle east|hummus|falafel|shawarma|kebab|kofta|mezze|meze|harissa|za'atar|zaatar|shakshuka|baklava|halal|iftar|biryani arab"),
    (6, r"indian|india|curry|tikka|masala|biryani|dal\b|daal|tandoor|paneer|samosa|chutney|naan|korma|vindaloo|raita|pakora"),
    (7, r"asian|thai|japan|sushi|ramen|chinese|cantonese|dim sum|korean|kimchi|bibimbap|vietnam|pho\b|banh|malay|indones|singapor|teriyaki|miso|tempura|udon|soba|wok|stir-fr|satay|nasi|laksa|gyoza|bao\b|katsu|yakitori|pad thai|tom yum"),
    (8, r"mexic|taco|burrito|quesadilla|enchilada|guacamole|salsa verde|ceviche|peru|argentin|chimichurri|brazil|colombia|cuban|caribbean|jerk|jamaic|latin|empanada|churro|mole\b|tamale|arepa"),
    (9, r"american|burger|bbq|barbecue|southern|cajun|creole|gumbo|jambalaya|mac and cheese|mac & cheese|brownie|cheesecake|pancake|buffalo|coleslaw|cornbread|hot dog|pulled pork|brisket|club sandwich|caesar"),
]

C_FOLDER = {
    "Breakfast": 0, "Brunch & Eggs": 0, "Breakfast Preserves": 0,
    "Starters": 1, "Canapés": 1, "Bowl Food & Flying Dishes": 1, "Cheese Course & Trolley": 1, "Garde Manger & Charcuterie": 1, "Salumi & Dry-Curing": 1,
    "Salads": 2, "Soups": 3, "Main Courses": 4, "Sandwiches": 4, "Vegetarian Mains": 4, "Burgers": 4, "Sides": 5,
    "Sauces": 6, "Marinades": 7,
    "Prep & Mise en Place": 7, "Stocks, Fonds & Consommés": 7, "Butchery & Yield Tests": 7, "Fermentation & Pickling": 7, "House Dairy & Cheese-Making": 7,
    "Desserts": 8, "Gelato & Frozen Desserts": 8, "À la Carte Plated Desserts": 8, "Celebration & Wedding Cakes": 8, "Pâtisserie Boutique": 8, "Sugar & Chocolate Décor": 8, "Bonbons & Confectionery": 8, "Asian Pâtisserie": 8,
    "Bakery & Bread": 9, "Sourdough & Long-Fermentation Bread": 9, "Viennoiserie Lab": 9,
    "Drinks": 10, "Classic Cocktails & Bar Spec": 10, "Batch Cocktails & Event Punches": 10, "Zero-Proof & Hot Beverages": 10,
}
# words in the dish name (its first part, before " · ", and the first descriptor)
NW = [
    (3, r"\bsoup|soupe|soppa|\bsupa\b|\bjuha\b|\bzupa\b|leves\b|ciorba|zuppa|sopa\b|suppe|chorba|čorba|ciorb|broth|velout|bisque|chowder|consomm|shorba|shurba|ramen|\bpho\b|laksa|gazpacho|salmorejo|borscht|borsch|tarator|minestrone|ribollita|vichyssoise|potage|caldo|harira|tom yum|tom kha|gumbo|bouillabaisse|solyanka|okroshka|żurek|zurek|shchi|ukha|rassolnik|kharcho|bissara|miso shiru|dashi soup|congee|jook|stracciatella|garbure|cock-a-leekie|cullen skink|mulligatawny|avgolemono|fasolada|kakavia|psarosoupa|patsas|shkembe|škembe|tripe soup|bean soup|lentil soup"),
    (2, r"caesar|salad|salat|salata|slaw|tabbouleh|fattoush|caprese|niçoise|nicoise|panzanella|insalata|ensalada|shopska|som tam|larb|kısır|kisir|horiatiki|vinegret|olivier|pkhali|ensaladilla|poke bowl|ceviche salad"),
    (10, r"\b(?:cocktail|mocktail|\bpunch\b|spritz|negroni|martini|mojito|margarita|daiquiri|sangria|lemonade|limonada|smoothie|milkshake|frappé|frappe|latte|cappuccino|espresso|macchiato|hot chocolate|iced tea|\btea\b|\bchai\b|juice|cordial|kombucha|\bayran\b|\blassi\b|old fashioned|manhattan|boulevardier|last word|sazerac|gimlet|paloma|caipirinha|pisco sour|whisky sour|whiskey sour|amaretto sour|gin sour|mai tai|piña colada|pina colada|bellini|mimosa|bloody mary|\bmule\b|collins|julep|toddy|grog|glühwein|gluhwein|mulled wine|eggnog|horchata|agua fresca|shrub\b|switchel|tonic\b|infusion|tisane|\batay\b|\bsahlab\b|\bsalep\b|\bboza\b|\bkvass\b|\bsbiten\b|\bkompot\b)"),
    (8, r"dessert|cake|gâteau|gateau|torte|\btart\b|tarte|tartlet|pâtiss|gelato|ice cream|sorbet|sorbetto|semifreddo|mousse|cookie|biscuit|bonbon|praline|praliné|truffle|ganache|chocolate|pudding|cheesecake|brownie|blondie|macaron|crème brûlée|creme brulee|crème caramel|flan\b|panna cotta|tiramisu|baklava|kadaif|kataifi|halva|halwa|lokum|meringue|pavlova|éclair|eclair|profiterole|choux|crumble|cobbler|clafoutis|strudel|parfait|trifle|custard|caramel|fudge|petit four|mignardise|financier|madeleine|churro|donut|doughnut|beignet|papanasi|tulumba|garash|mochi|daifuku|kulfi|gulab|jalebi|rasmalai|kheer|sutlijash|sütlaç|sutlac|tres leches|alfajor|brigadeiro|dulce de leche|mazamorra|arroz con leche|rice pudding|risalamande|crêpe suzette|soufflé glacé|bavarois|charlotte|entremet|dacquoise|opera cake|sachertorte|linzer|kaiserschmarrn|palatschinken|knafeh|kunafa|basbousa|loukoumades|galaktoboureko|bougatsa|ravani|tulumba|tatlı|tatli|kozunak|cozonac|lussekatter|stollen|panettone|pandoro|roscón|rosc[oó]n|king cake|babka|rugelach|hamantash|sfogliatell|cannoli|zeppole|bombolon|semlor|kanelbulle|cinnamon bun|sticky toffee|treacle tart|bread and butter pudding|eton mess|syllabub|posset|compote\b|poached pear|fruit salad|granita|affogato|frozen yogurt|popsicle|paleta|s'mores"),
    (9, r"\bbread\b|\bloaf\b|\brolls?\b|focaccia|ciabatta|baguette|brioche|sourdough|bagel|\bpitas?\b|pitta|lepinja|naan|flatbread|chapati|\broti\b|paratha|pogača|pogacha|croissant|danish pastry|pain au|pain suisse|kouign|pretzel|grissini|crispbread|crackers?\b|scone|muffin|banitsa|banica|gibanica|burek|börek|borek|zelnik|tiropita|spanakopita|khachapuri|empanada|quiche|pizza|calzone|piadina|lahmacun|pide\b|manakish|man'oushe|simit|challah|kalach|pogaca|proja|cornbread|soda bread|bannock|tortilla de harina|arepa|pupusa"),
    (6, r"sauce|salsa\b|dressing|vinaigrette|mayonnaise|\bmayo\b|aioli|pesto|\bjus\b|gravy|coulis|chutney|relish|ketchup|mustard|\bdip\b|glaze|hollandaise|béarnaise|bearnaise|beurre blanc|velouté sauce|tahini|tzatziki|ajvar|lyutenitsa|ljutenica|harissa|chimichurri|gremolata|salsa verde|romesco|sambal|tkemali|adjika|ajika|urnebes|mojo\b|ponzu|teriyaki sauce|nuoc cham|nam jim|raita|skordalia|taramosalata|melitzanosalata|tirokafteri|muhammara|toum|zhug|zhoug|chermoula|pistou|persillade|compound butter|flavoured butter|butter blend"),
    (7, r"\bstock\b|\bfond\b|fond de|fumet|demi-glace|glace de|court-bouillon|\bdashi\b|mise en place|\bdough\b|pâte (brisée|sucrée|feuilletée|à choux)|puff pastry|shortcrust|crème pâtissière|creme patissiere|brine\b|\bcure\b|pickle|pickled|ferment|kimchi|sauerkraut|kraut\b|fluid gel|\bgel\b|powder|tuile|crumb\b|clarified|ghee|spice mix|spice blend|seasoning|\brub\b|marinade|curing salt|yield test|ricotta \(house|house ricotta|house halloumi|labneh \(house|paneer \(house|confit\b|stock syrup|simple syrup|sugar syrup"),
    (0, r"breakfast|omelet|omelette|frittata|scrambled|eggs? benedict|benedict|pancake|waffle|porridge|granola|muesli|overnight oats|french toast|shakshuka|huevos|fried eggs?|poached eggs?|boiled eggs?|eggs? royale|eggs? florentine|full english|\bjam\b|marmalade|confiture|preserve\b|grits|hash browns?|bircher|açaí|acai bowl|kaymak breakfast|mekitsi|mekici|kachamak|tortilla española|menemen|kaya toast"),
    (1, r"starter|antipast|mezze|meze|tapas|pintxo|canap|appetizer|amuse|charcuterie|terrine|pâté|\bpate\b|rillette|carpaccio|tartare|\btartar\b|ceviche|crudo|tiradito|sashimi|nigiri|\bmaki\b|sushi|dim sum|dumpling|gyoza|har gow|siu mai|shumai|wonton|bao\b|spring roll|summer roll|samosa|pakora|bhaji|bruschetta|crostini|croquet|croqueta|arancini|falafel|kibbeh|sfiha|fatayer|rakakat|cigar\b|oyster|deviled|devilled|vol-au-vent|blini|gougère|gougere|tempura|satay|skewers?|yakitori|kushiyaki|edamame|hummus|baba ganoush|guacamole|fava\b|ezme|dolma|dolmeh|sarma \(vine|stuffed vine|vine leaves|lonza|coppa|bresaola|biltong|jamón|prosciutto board|cheese board|crisps\b|chips and|nachos|wings\b|calamari fritti|fritto misto|gravlax|gravad|smørrebrød|smorrebrod|pintxos|banderilla|montadito|croque"),
    (5, r"\bside\b|garnish|\bpotatoes\b|potato purée|mashed|\bmash\b|pommes|fries|frites|chips\b|rösti|rosti|gratin dauphinois|dauphinoise|duchess|hasselback|pilaf|pilau|pulao|plov|steamed rice|fried rice|jeera rice|basmati|risotto|polenta|couscous|bulgur|grits side|roasted vegetables|grilled vegetables|ratatouille|creamed spinach|braised cabbage|red cabbage|sauerkraut braised|glazed carrots|green beans|minted peas|petits pois|mushy peas|corn on the cob|elote|coleslaw|mac and cheese|mac & cheese|cauliflower cheese|tahdig|chelow|gemista|briam|imam bayildi|caponata|patatas bravas|papas arrugadas|tostones|plantain|yuca|cassava|spätzle|spaetzle|knödel|knodel|dumplings \(side|gnocchi"),
]
SW = [  # sub-category words that name one course
    (8, r"dessert|dolci|glyka|postres|sweets|pastry|pâtisserie|patisserie|cakes|baking|tatlı|halawiyyat|ḥalawiyyāt|puddings"),
    (3, r"soups?\b|zuppe|soupes|suppen$|ciorbe"),
    (2, r"^salads?$|salates|insalate|ensaladas"),
    (10, r"drinks|beverages|cocktails|mashrūbāt|coffee programme|tea & infusions|juices"),
    (6, r"sauces|salse|saltses|salsas|dressings|condiments"),
    (1, r"starters|antipasti|mezze|meze|mezedes|tapas|appeti|cold cuts|petiscos|small plates|dim sum|raw bar"),
    (5, r"sides|contorni|garnitoures|garnishes|\brice\b|grains|ruzz"),
    (0, r"breakfast|brunch|proino|desayuno"),
    (9, r"bread|psomi|khubz|pites|savoury pies|pizza|viennoiserie"),
    (4, r"main|secondi|plats|kreas|meat|poultry|fish|seafood|kebab|grill|curries|curry|stews|braises|pasta|risotto|noodles|rice bowls"),
]

PRE = [  # checked first: names that the wide lists below would put in the wrong place
    (7, r"baharat|bahārāt|garam masala|ras el hanout|dukkah|duqqa|furikake|shichimi|togarashi|berbere|chaat masala|panch phoron|five-spice|curry powder|spice blend|seven-spice|dry rub|\brub\b|za.atar blend|spice mix"),
    (8, r"roly-poly|suet pudding|spotted dick|sticky toffee"),
    (7, r"cleaning|fabrication|butchery|yield test|protocol|filleting|breakdown|how to "),
    (3, r"(langoustine|mushroom|lobster|crab|chestnut|pumpkin|cauliflower|onion|pea|bean|truffle|celeriac|seafood) cappuccino"),
    (1, r"finger sandwich|sandwich(es)? finger|\bfingers?\b.*(sandwich|watercress)|tarragon mayonnaise finger"),
    (9, r"scrolls?\b|pinwheel"),
    (4, r"sandwich|panini|toastie|\bwrap\b|bocadillo|b[aá]nh m[iì]|club\b|\bsub\b|po'? ?boy|hoagie|\btorta\b|croque|smørrebrød"),
    (1, r"\b(rainbow|california|dragon|spicy tuna|caterpillar|philadelphia|futo|hoso|ura|te)[ -]?(roll|maki)|uramaki|futomaki|hosomaki|temaki|oeufs mayonnaise|œufs mayonnaise|egg mayonnaise|deviled egg|devilled egg"),
]
def course(r):
    f = F[r[2]]
    if f in C_FOLDER: return C_FOLDER[f]
    parts = r[1].split(" · ")
    nm = parts[0].lower(); nm2 = (" ".join(parts[:2])).lower()
    for c, p in PRE + NW:  # the dish name itself
        if re.search(p, nm): return c
    sub = r[3].lower()
    hit = [c for c, p in SW if re.search(p, sub)]
    if len(hit) == 1: return hit[0]  # a sub-category that names one course (mixed ones such as "Soups & Starters" do not count)
    for c, p in NW:  # the first descriptor
        if c in (2, 3, 8, 10) and re.search(p, nm2): return c
    return 4

MW = [
    (6, r"prawn|shrimp|squid|calamar|octopus|cuttlefish|mussel|clam|scallop|lobster|langoust|crab|oyster|seafood|shellfish|crayfish|scampi|sea urchin"),
    (5, r"grouper|kingfish|barramundi|mahi|wahoo|john dory|perch|mullet|sturgeon|pollock|whiting|skate\b|bonito|amberjack|yellowtail|hamachi|cobia|pomfret|sea bream|tilefish|salmon|\bcod\b|tuna|fish|sea bass|seabass|bream|trout|mackerel|halibut|turbot|sole\b|anchov|sardine|herring|monkfish|hake|carp|pike|eel|caviar|roe\b|bacalhau|haddock|swordfish|dorade|branzino|sprat|plaice|zander|catfish|tilapia|snapper"),
    (4, r"venison|wild boar|boar|rabbit|hare|pheasant|partridge|deer|elk|moose|reindeer|quail|pigeon|squab|grouse|game\b"),
    (2, r"lamb|mutton|goat|kid\b"),
    (3, r"chicken|duck|turkey|poultry|goose|guinea fowl|\bcapon\b|hen\b|foie gras"),
    (1, r"pork|bacon|\bham\b|prosciutto|pancetta|guanciale|sausage|chorizo|salami|lardon|lard\b|speck|sujuk|lukanka|kaiserfleisch|suckling"),
    (0, r"beef|veal|vitello|manzo|ox\b|oxtail|brisket|sirloin|ribeye|rib-eye|tenderloin|steak|wagyu|bresaola|pastırma|pastirma|mince"),
]
MWB = [(k, r"\b(?:" + p + ")") for k, p in MW]
def main_of(r, c):
    if c in (6, 7, 8, 9, 10): return -1
    nm = r[1].lower()
    lines = sorted(r[10], key=lambda t: -t[1])
    nm = re.sub(r"goat'?s'? (cheese|curd)|goat cheese|chevre|chèvre", "cheese", nm)
    for part in (nm.split(" · ")[0], nm):  # the dish name first, then the descriptors
        for k, p in MWB:
            if re.search(p, part): return k
    for pi, g in (lines[:4] if c != 5 else []):  # then the heaviest protein product (not for sides: duck fat is not the dish)
        pn = P[pi][0].lower(); sec = P[pi][1]
        if sec in (0, 1):
            for k, p in MWB:
                if re.search(p, pn): return k
            return 5 if sec == 1 else 0
    if re.search(r"mushroom|porcini|chanterelle|morel|truffle|shiitake|ceps|boletus", nm): return 10
    if re.search(r"\begg|omelet|frittata|shakshuka|benedict|quiche|soufflé", nm): return 7
    if re.search(r"bean|lentil|chickpea|pea soup|split pea|dal\b|daal|hummus|falafel|fava|edamame", nm): return 12
    if re.search(r"pasta|spaghetti|penne|tagliatelle|lasagn|ravioli|gnocchi|risotto|rice|pilaf|noodle|ramen|udon|soba|couscous|bulgur|polenta|quinoa|farro|barley|orzo|buckwheat|kasha|grain", nm): return 11
    if re.search(r"cheese|halloumi|feta|sirene|kashkaval|paneer|burrata|mozzarella|ricotta|fondue|raclette|kajmak|labneh|gratin", nm): return 8
    names = " ".join(P[pi][0].lower() for pi, g in lines[:3])
    if re.search(r"\beggs?\b", names) and c == 0: return 7
    if re.search(r"bean|lentil|chickpea", names): return 12
    if re.search(r"pasta|spaghetti|rice|noodle|flour|couscous|bulgur|polenta|barley|buckwheat", names): return 11
    if re.search(r"cheese|feta|sirene|halloumi|ricotta|mozzarella", names): return 8
    if re.search(r"mushroom|porcini", names): return 10
    if c == 0 and re.search(r"egg", names): return 7
    return 9

def region(r):
    f = F[r[2]]
    if f in FREG: return FREG[f]
    s = (r[3] + " " + r[1]).lower()
    for k, p in RW:
        if re.search(p, s): return k
    return -1

cnt = collections.Counter(); mc = collections.Counter(); rc = collections.Counter()
for r in D["r"]:
    c = course(r); m = main_of(r, c); k = region(r)
    t = [c, m, k]
    if len(r) > 12: r[12] = t
    else: r.append(t)
    cnt[COURSES[c]] += 1; mc[MAINS[m] if m >= 0 else "-"] += 1; rc[CUISINES[k] if k >= 0 else "International"] += 1
print(cnt.most_common()); print(mc.most_common()); print(rc.most_common())
if not DRY:
    json.dump(D, open("index.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
if "--sample" in sys.argv:
    import random; random.seed(1)
    for ci, cn in enumerate(COURSES):
        xs = [r for r in D["r"] if r[12][0] == ci]
        print("\n==", cn, len(xs)); [print("  ", F[r[2]][:18], "|", r[3][:22], "|", r[1][:60], "|", MAINS[r[12][1]] if r[12][1] >= 0 else "-") for r in random.sample(xs, 14)]
