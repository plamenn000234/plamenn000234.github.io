// "What's new": one short card on Today after an update, until the cook taps "Got it". The full list is in Settings.
// Add new entries at the top; the first entry's id is what the card compares with bb-news3.
import { Persisted, KEYS, read } from "./store.svelte";
export interface News { id: string; date: string; items: [title: string, text: string, href: string][] }
export const NEWS: News[] = [
  { id: "2026-11-28", date: "28 November 2026", items: [
    ["Recipes by dish", "Recipes → What dish: soups, mains, desserts… then pick what it is made of and the cuisine.", "#recipes"],
    ["52 new Bulgarian tech cards", "Kapama, shkembe, tas kebap, garash and more, in Adriatic & Balkan → Bulgaria.", "#c-adriatic-balkan"],
    ["49 more Balkan tech cards", "Serbia, Croatia, Romania, North Macedonia, Bosnia, Montenegro, Slovenia and now Albania: sarma, gregada, bograč, tavë kosi…", "#c-adriatic-balkan"],
    ["50 Eastern European & Caucasus tech cards", "Żurek, solyanka, stroganoff, chicken Kyiv, medovik, chakhokhbili, harissa, dovga…", "#c-eastern-european"],
    ["50 hotel tech cards", "Buffet mains, sides and cold starters, breakfast, soups and puddings: salmon Wellington, beef daube, celeriac gratin, apple charlotte…", "#recipes"],
    ["63 Spanish & Portuguese tech cards", "Paella valenciana, callos, zarzuela, lechazo, tocino de cielo; bacalhau com grão, chanfana, ovos moles…", "#c-spanish-tapas"],
    ["49 Greek & Italian tech cards", "Patsas, ktapodi stifado, gida vrasti, kaimaki; vincisgrassi, sartù di riso, cinghiale in umido, focaccia di Recco, struffoli…", "#c-italian"],
    ["57 French tech cards", "Baeckeoffe, tête de veau, tripes à la mode de Caen, bourride, sandre au beurre blanc, aligot, pâté de campagne, flan pâtissier…", "#c-french"],
    ["31 German & Austrian tech cards", "Pichelsteiner, Gaisburger Marsch, Hasenpfeffer, Rehrücken Baden-Baden, Karpfen blau, Saumagen, Wiener Beuschel, Prinzregententorte, Baumkuchen, Topfenknödel…", "#c-german-austrian"],
    ["33 Nordic tech cards", "Rullepølse, Västkustsallad, plukfisk, kalakukko, lohilaatikko, pinnekjøtt, karjalanpaisti, kroppkakor, Janssons frestelse, kransekake, Runeberg tortes…", "#c-nordic"],
    ["33 British & Irish tech cards", "Arbroath smokie pots, jellied eels, Welsh cawl, boxty, Scottish steak pie, pie & mash with liquor, haggis, faggots, roast grouse, Sussex pond pudding, parkin, barmbrack…", "#c-british-irish-pub"],
    ["49 Turkish tech cards", "Yaprak sarma, lakerda, İmam bayıldı, tarhana, kelle paça, kuşbaşılı pide, talaş böreği, Urfa and cağ kebabı, kokoreç, hamsili pilav, uskumru dolması, perde pilavı, tavuk göğsü, katmer…", "#c-turkish"],
    ["41 Middle Eastern tech cards", "Hindbeh, kibbeh labanieh, shish barak, dawood basha, kubba hamuth, kebab karaz, masgouf, machboos, mandi, saltah, ka'ak al Quds, mafroukeh, meghli, kleicha…", "#c-middle-eastern"],
    ["26 North African tech cards", "Houria, chorba beida, fricassé tunisien, mhajeb, karantika, tajine zitoune, mloukhia, douara, couscous royal, chakhchoukha, rechta, zlabia, assida zgougou…", "#c-north-african"],
    ["17 Persian tech cards", "Ash-e doogh, borani bademjan, kufteh Tabrizi, khoresh aloo esfenaj, lubia polo, shirin polo, kabab bakhtiari, sohan, koloocheh…", "#c-persian"],
    ["24 African tech cards", "Efo riro, ayamase, kedjenou, banga soup, attiéké, kitfo leb leb, zigni, kuku paka, frango piri-piri, ingelegde vis, umngqusho, matapa…", "#c-african"],
    ["25 Thai tech cards", "Massaman, gaeng som, jungle curry, gaeng hung lay, nam tok, hor mok, son-in-law eggs, rad na, boat noodles, khao kluk kapi, nam prik pao, khao man gai…", "#c-pan-asian"],
    ["26 Japanese tech cards", "Nikujaga, saba misoni, buri daikon, katsudon, tendon, hiyashi chūka, korokke, menchi katsu, hambāgu, omuraisu, beef curry, chikuzen-ni, tonjiru, yudōfu…", "#c-pan-asian"],
    ["25 Chinese tech cards", "Chongqing chilli chicken, twice-cooked pork, water-boiled fish, lion's head, Dongpo pork, black pepper beef, zhajiang mian, claypot rice, beef noodle soup, lu rou fan, three-cup chicken…", "#c-pan-asian"],
    ["25 Korean tech cards", "Tteokgalbi, samgyetang, galbitang, seolleongtang, yukgaejang, bossam, dongchimi, gamjatang, jangjorim, bibim guksu, kalguksu, dakgangjeong, LA galbi, kimchi jeon…", "#c-pan-asian"],
    ["17 Vietnamese tech cards", "Bò kho, cà ri gà, chả cá Lã Vọng, bún riêu, bún thịt nướng, mì Quảng, hủ tiếu Nam Vang, bánh cuốn, cháo gà, nem nướng, bò lá lốt, gà kho gừng…", "#c-pan-asian"],
    ["17 Malaysian, Indonesian & Singaporean tech cards", "Gulai kambing, asam laksa, ayam masak merah, opor ayam, asam pedas, ikan bakar, otak-otak, bak kut teh, Hokkien prawn mee, mee siam, ayam percik…", "#c-pan-asian"],
    ["15 Asian dessert & drink tech cards", "Bánh flan, bánh da lợn, kuih dadar, bubur cha cha, cendol, sago gula melaka, tāng yuán, dòu huā, ginger milk curd, sujeonggwa, yakgwa, mizu yōkan, purin, tub tim grob…", "#c-pan-asian"],
    ["70 Indian tech cards", "Bhel puri, dahi bhalla, galouti kebab, misal pav, pindi chole, rasam, Kolhapuri chicken, xacuti, nalli nihari, haleem, sorpotel, balchão, paneer lababdar, undhiyu, sarson ka saag, bisi bele bath, neer dosa, rasgulla, Mysore pak…", "#c-indian"],
  ] },
  { id: "2026-11-27", date: "27 November 2026", items: [
    ["Make it mine", "Copy any library recipe and change grams, steps and serving.", "#recipes"],
    ["My notes", "Add your kitchen's notes to any recipe. They show in cook mode and in the PDF.", "#recipes"],
    ["Gels & thickeners", "Gelatin sheets or powder by bloom, agar, starch, roux and xanthan.", "#tool-gel"],
    ["Food safety logs", "Fridge temperatures, cooling and deliveries with a monthly PDF. Turn on in Settings.", "#settings"],
    ["Allergens for guests", "Kitchen → Allergen matrix → QR for guests: table cards with a QR code.", "#kitchen"],
    ["Onboard a new cook", "Learn → For chefs: one link with tests, recipes and a first-week checklist.", "#onboard-new"],
    ["Stock and write-offs", "What you have, write-offs with a reason and value, what to buy for an order. Turn on in Settings.", "#settings"],
    ["Menu engineering", "Tools → Menu engineering: which dishes are stars and which to rework, from your sales.", "#tool-menu"],
    ["Account, if you want one", "Sign in with Google for a cloud copy, a shared kitchen with roles and a live prep board.", "#account"],
    ["Community recipes", "Recipes → Community: find recipes other cooks shared, share your own.", "#community"],
    ["Recipes without…", "Filters → Without: hide recipes with mushrooms, pork or anything else.", "#recipes"],
  ] },
];
const seen = new Persisted<string>(KEYS.news, "");
// A first start gets the welcome tour instead, so it starts with everything marked as seen.
if (!seen.v && !read<number>(KEYS.tour, 0)) seen.set(NEWS[0].id);
class NewsState {
  show = $state(seen.v !== NEWS[0].id);
  done() { this.show = false; seen.set(NEWS[0].id); }
}
export const news = new NewsState();
