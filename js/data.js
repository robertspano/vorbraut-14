/* ==========================================================================
   Vorbraut 14 — data model
   Heimild: Skráningartafla & aðaluppdrættir (ARCHUS arkitektar, apríl 2026)
   Stærðir = birt flatarmál skv. skráningartöflu. Herbergjafjöldi skv.
   aðaluppdráttum; staðfestist í kaupsamningi.
   ========================================================================== */

/* Each apartment.
   id      – íbúðarnúmer
   floor   – hæð (1–4)
   area    – birt flatarmál (m²)
   rooms   – herbergjafjöldi
   type    – flokkur (key í i18n)
   outdoor – key: 'verond' | 'svalir' | 'thaksvalir'
   ceiling – salarhæð (m) þar sem á við
   status  – 'available' | 'reserved' | 'sold'
   plan    – nákvæm grunnmynd íbúðarinnar (skrá í assets/plans/)
   planExact – true = nákvæm teikning (allar staðfestar gegn aðaluppdráttum)
*/
const APARTMENTS = [
  // Stærðir/verð/herbergi staðfest gegn söluskrá Miklaborgar (miklaborg.is, 2026-06-22):
  //   til sölu (9): 0102,0104,0202,0203,0204,0301,0302,0303,0402  — verð skráð.
  //   selt (5): 0101,0103,0201,0304,0401.
  //   area = BIRT STÆRÐ = birt flatarmál (heildarstærð íbúðar MEÐ sérgeymslu), skv. skráningartöflu.
  //   beds = svefnherbergi.  price = ISK (heiltala).
  // ---- 1. hæð (jarðhæð) — sérafnotareitir / verönd ----
  { id: '0101', floor: 1, area: 127.2, rooms: 4, beds: 3, type: 'fam', outdoor: 'verond', status: 'sold', plan: '0101.png', planExact: true },
  { id: '0102', floor: 1, area: 70.2,  rooms: 2, beds: 1, type: 'two', outdoor: 'verond', status: 'available', price: 69900000,  plan: '0102.png', planExact: true, parking: 0 },
  { id: '0103', floor: 1, area: 69.5,  rooms: 2, beds: 1, type: 'two', outdoor: 'verond', status: 'sold', plan: '0103.png', planExact: true, parking: 0 },
  { id: '0104', floor: 1, area: 115.6, rooms: 3, beds: 2, type: 'fam', outdoor: 'verond', status: 'available', price: 104900000, plan: '0104.png', planExact: true },
  // ---- 2. hæð — svalir ----
  { id: '0201', floor: 2, area: 128.8, rooms: 4, beds: 3, type: 'fam', outdoor: 'svalir', balcony: 8.1, status: 'sold', price: 119900000, plan: '0201.png', planExact: true },
  { id: '0202', floor: 2, area: 69.5,  rooms: 2, beds: 1, type: 'two', outdoor: 'svalir', balcony: 5.9, status: 'available', price: 71900000,  plan: '0202.png', planExact: true, parking: 0 },
  { id: '0203', floor: 2, area: 69.6,  rooms: 2, beds: 1, type: 'two', outdoor: 'svalir', balcony: 5.9, status: 'available', price: 71900000,  plan: '0203.png', planExact: true, parking: 0 },
  { id: '0204', floor: 2, area: 131.6, rooms: 4, beds: 3, type: 'fam', outdoor: 'svalir', balcony: 8.1, status: 'available', price: 119900000, plan: '0204.png', planExact: true },
  // ---- 3. hæð — svalir ----
  { id: '0301', floor: 3, area: 130.3, rooms: 4, beds: 3, type: 'fam', outdoor: 'svalir', balcony: 8.1, status: 'available', price: 122900000, plan: '0301.png', planExact: true },
  { id: '0302', floor: 3, area: 70.1,  rooms: 2, beds: 1, type: 'two', outdoor: 'svalir', balcony: 5.9, status: 'available', price: 73900000,  plan: '0302.png', planExact: true, parking: 0 },
  { id: '0303', floor: 3, area: 68.6,  rooms: 2, beds: 1, type: 'two', outdoor: 'svalir', balcony: 5.9, status: 'available', price: 73900000,  plan: '0303.png', planExact: true, parking: 0 },
  { id: '0304', floor: 3, area: 130.1, rooms: 4, beds: 3, type: 'fam', outdoor: 'svalir', balcony: 8.1, status: 'sold', plan: '0304.png', planExact: true },
  // ---- 4. hæð (efsta hæð) — þaksvalir, aukin lofthæð ----
  // Staðfest skv. fasteignasala + skráningartöflu: 0401 = hægri þakíbúð SELD (171,0 m²);
  // 0402 = vinstri þakíbúð TIL SÖLU (167,5 m² / 219,9 m.kr.). Bæði með 2 bílastæði. EKKI víxla aftur.
  { id: '0401', floor: 4, area: 171.0, rooms: 4, beds: 3, type: 'pent', outdoor: 'thaksvalir', ceiling: '3,45–3,70', status: 'sold', plan: '0401.png', planExact: true, walk3d: true, parking: 2 },
  { id: '0402', floor: 4, area: 167.5, rooms: 4, beds: 3, type: 'pent', outdoor: 'thaksvalir', ceiling: '3,45–3,70', status: 'available', price: 219900000, plan: '0402.png', planExact: true, tex: '0401.png', walk3d: true, parking: 2 },
];

/* Gagnvirkir hover-fletir á lokaramma kvikmyndarinnar (f096, 1280×720).
   Hnit í myndrými 0 0 1280 720 — sömu fletir og myndavélin lendir á. */
const FACADE = {
  viewBox: '0 0 1280 720',
  zones: {
    '0101': [[822,458],[995,459],[995,495],[1004,496],[1055,518],[1056,540],[1071,549],[1072,562],[1049,562],[839,563],[840,523],[822,505]],
    '0102': [[635,458],[822,458],[822,505],[840,523],[839,563],[635,565]],
    '0103': [[453,459],[635,458],[635,565],[427,564],[432,552],[432,523],[453,504]],
    '0104': [[289,459],[452,460],[451,505],[432,523],[432,552],[427,564],[201,564],[201,548],[209,544],[208,540],[210,534],[215,530],[217,529],[217,520],[282,490],[282,459]],
    '0201': [[826,374],[1014,374],[1014,409],[1047,416],[1047,459],[826,460]],
    '0202': [[636,376],[826,376],[826,460],[636,460]],
    '0203': [[445,375],[636,375],[636,459],[445,459]],
    '0204': [[264,375],[447,375],[447,459],[231,459],[231,417],[264,416],[264,377]],
    '0301': [[826,289],[1025,289],[1025,301],[1014,301],[1014,331],[1044,331],[1044,374],[826,374]],
    '0302': [[637,289],[826,289],[826,376],[637,376]],
    '0303': [[453,289],[639,289],[639,375],[446,375],[446,330],[446,289],[453,289]],
    '0304': [[256,289],[446,289],[446,375],[233,375],[233,330],[253,330],[253,328],[263,328],[263,300],[256,300]],
    '0401': [[637,162],[745,162],[745,175],[817,175],[817,144],[826,144],[826,175],[912,174],[912,176],[996,177],[996,200],[977,209],[977,239],[1020,239],[1019,269],[1026,269],[1026,288],[637,288]],
    '0402': [[279,177],[450,174],[450,144],[459,144],[459,175],[528,175],[528,162],[634,162],[635,288],[251,288],[251,270],[257,270],[257,239],[300,239],[300,207],[280,199]],
  }
};

/* Handvirk kvörðun (úr ?edit tólinu) hefur forgang ef hún er til. */
try {
  const saved = JSON.parse(localStorage.getItem('vb-zones') || 'null');
  if (saved && typeof saved === 'object' && Object.keys(saved).length) FACADE.zones = saved;
} catch (e) { /* ignore */ }

/* Hæðarkort fyrir popup-ið — RAUNVERULEGAR útlínur íbúðanna séð ofan frá,
   nákvæmlega eins og þær raðast í aðaluppdráttunum. Hnitin eru reiknuð beint
   úr BIM-líkani hússins (IFC) og íbúðirnar eru LÍMDAR SAMAN að veggjamiðju —
   þær snertast og mynda eina samfellda byggingu (eins og hjá vesturvin). Snúið
   svo langhliðin liggi lárétt (0x04 vinstra, 0x01 hægra; á 4. hæð 0402 vinstra).
   Stigahús/lyfta = 'core' (sýnt sem ljóst skarð). northDeg = norður á skjánum.
   northDeg=-144 mælt af norðurpílu á SAMÞYKKTUM aðaluppdrætti ARCHUS (A02 grunnmynd,
   norður ~54° rangsælis frá uppstefnu blaðs); grunnmyndarstefna mín = stefna uppdráttar. */
const FLOOR_SHAPES = {
  viewBox: '0 0 300 181', northDeg: -144,
  floors: {
    1: {
      footprint: [[19.8,169.0],[280.3,169.1],[280.3,12.0],[189.7,12.0],[189.7,41.8],[193.3,41.8],[193.3,56.5],[152.2,56.5],[86.8,56.2],[86.8,11.7],[19.8,11.7]],
      apts: {
        '0101': [[215.6,169.1],[232.5,169.1],[280.3,169.1],[280.3,167.6],[280.3,135.5],[280.3,12],[278.4,12],[189.7,12],[189.7,41.8],[193.3,41.8],[193.3,56.6],[215.6,56.5]],
        '0102': [[152.2,169],[215.5,169],[215.5,56.5],[152.2,56.5]],
        '0103': [[86.8,169],[152.2,169],[152.2,56.5],[85.8,56.2]],
        '0104': [[86.8,11.7],[19.8,11.7],[19.8,169],[86.8,169]],
      },
    },
    2: {
      footprint: [[11.9,155.3],[48.9,155.2],[48.9,147.0],[86.2,146.9],[86.2,155.3],[114.2,155.3],[114.2,146.9],[184.4,146.3],[184.4,155.3],[214.7,155.3],[214.7,146.9],[251.0,146.8],[251.0,155.3],[288.0,155.3],[288.0,112.8],[278.3,112.8],[278.3,11.9],[189.1,11.9],[189.1,42.3],[192.8,42.3],[192.8,56.0],[110.0,56.0],[110.0,42.9],[114.2,42.9],[114.2,11.9],[21.6,11.9],[21.6,112.8],[11.9,112.8]],
      apts: {
        '0201': [[214.4,146.9],[251,146.8],[251,155.3],[288,155.3],[288,112.8],[278.3,112.8],[278.3,11.9],[189.1,11.9],[189.1,42.3],[192.8,42.3],[192.8,56.3],[214.7,56]],
        '0202': [[150.2,56],[150,146.9],[184.4,146.3],[184.4,155.3],[214.7,155.3],[214.7,56]],
        '0203': [[86.2,146.9],[86.2,155.3],[114.2,155.3],[114.2,146.9],[150.2,146.9],[150.2,56],[86.2,56]],
        '0204': [[21.6,112.8],[11.9,112.8],[11.9,135.4],[11.9,155.3],[48.9,155.2],[48.9,147],[86.1,146.9],[86.1,56],[110,56],[110,42.9],[114.2,42.9],[114.2,11.9],[21.6,11.9]],
      },
    },
    3: {
      footprint: [[11.9,155.3],[49.4,155.2],[49.4,147.0],[85.5,146.9],[85.5,155.3],[114.2,155.3],[114.2,146.9],[185.8,146.9],[185.8,155.3],[214.4,155.3],[214.4,146.9],[250.5,147.0],[250.5,155.3],[288.0,155.3],[288.0,112.8],[278.3,112.8],[278.3,11.9],[189.1,11.9],[189.1,42.3],[192.8,42.3],[192.8,56.0],[110.0,56.0],[110.0,42.9],[114.1,42.9],[114.1,11.9],[21.6,11.9],[21.6,112.8],[11.9,112.8]],
      apts: {
        '0301': [[214.4,92.5],[214.4,146.9],[250.5,147],[250.5,155.3],[288,155.3],[288,112.8],[278.3,112.8],[278.3,11.9],[189.1,11.9],[189.1,42.3],[192.8,42.3],[192.8,56.3],[214.4,56]],
        '0302': [[150,62.4],[150,146.9],[185.8,146.9],[185.8,155.3],[214.4,155.3],[214.4,133.8],[214.4,56],[153,56],[150,56]],
        '0303': [[85.5,146.9],[85.5,155.3],[114.2,155.3],[114.2,146.9],[150.2,146.9],[150.2,62.7],[150,56],[147,56],[86.2,56]],
        '0304': [[21.6,112.8],[11.9,112.8],[11.9,135.4],[11.9,155.3],[49.4,155.2],[49.4,147],[85.5,146.9],[86.1,56],[110,56],[110,42.9],[114.1,42.9],[114.1,11.9],[21.6,11.9]],
      },
    },
    4: {
      footprint: [[14.4,133.1],[21.9,133.1],[21.9,146.9],[182.9,147.0],[184.4,145.5],[185.8,147.0],[278.3,146.9],[278.3,133.1],[285.3,133.1],[285.3,113.1],[278.3,112.8],[278.3,11.9],[188.9,11.9],[188.9,36.4],[168.0,36.4],[168.0,56.0],[127.4,55.8],[127.4,41.6],[113.3,41.6],[113.3,11.9],[21.9,11.9],[21.9,113.1],[14.4,113.1]],
      apts: {
        '0401': [[150.2,146.9],[182.9,147],[184.4,145.5],[185.8,147],[278.3,146.9],[278.3,133.1],[285.3,133.1],[285.3,113.1],[278.3,112.8],[278.3,11.9],[188.9,11.9],[188.9,36.4],[168,36.4],[168,56],[150.4,56]],  // = hægri þakíbúð
        '0402': [[14.4,113.1],[14.4,133.1],[21.9,133.1],[21.9,146.9],[150.4,146.9],[150.4,56],[127.4,55.8],[127.4,41.6],[113.3,41.6],[113.3,11.9],[21.9,11.9],[21.9,113.1]],  // = vinstri þakíbúð
      },
    },
  },
};

/* Handvirk breyting á hæðarkorti (úr ?planedit tólinu) hefur forgang — en aðeins ef hún
   er með núverandi útgáfumerki. Þegar nýjar útlínur eru vistaðar varanlega hér er FS_VERSION
   hækkað, og þá hreinsast gamall (úreltur) draft sjálfkrafa svo vefútgáfan birtist. */
const FS_VERSION = 'v6-2026-06-23';
try {
  const savedFS = JSON.parse(localStorage.getItem('vb-floorshapes') || 'null');
  if (savedFS && savedFS.floors && savedFS._v === FS_VERSION) {
    FLOOR_SHAPES.floors = savedFS.floors;
    if (savedFS.viewBox) FLOOR_SHAPES.viewBox = savedFS.viewBox;
    if (savedFS.northDeg != null) FLOOR_SHAPES.northDeg = savedFS.northDeg;
  } else if (savedFS) {
    localStorage.removeItem('vb-floorshapes');   // úreltur draft — nota vistuðu vefútgáfuna
  }
} catch (e) { /* ignore */ }

/* Handvirkar útlínur á framhlið (úr ?mask tólinu) yfirskrifa FACADE.zones. */
try {
  const savedFZ = JSON.parse(localStorage.getItem('vb-facadezones') || 'null');
  if (savedFZ && typeof savedFZ === 'object') Object.assign(FACADE.zones, savedFZ);
} catch (e) { /* ignore */ }

/* Handvirk stilling á grunnmynd í popup (úr ?planimg tólinu): { '<id>': {x,y,w,h} }
   x/y = staðsetning efra-vinstra horns, w/h = stærð ramma — allt í % af reit.
   localStorage ('vb-planimg') yfirskrifar þetta á meðan verið er að fínstilla. */
const PLAN_ADJ = {
  // Allar nýjar grunnmyndir (1.–4. hæð, með titilreit) eru þétt-skornar að íbúðinni → sjálfgefið "contain" rammar þær rétt (engin handstilling).
};
try {
  const savedPA = JSON.parse(localStorage.getItem('vb-planimg') || 'null');
  if (savedPA && typeof savedPA === 'object') Object.assign(PLAN_ADJ, savedPA);
} catch (e) { /* ignore */ }

/* Útbreidd til allra mála */
/* Skilalýsing-PDF (kemur frá Robert) — settu slóð hér til að sýna „Skilalýsing" tengilinn í popup. */
const SKILALYSING = null;
window.VB = { APARTMENTS, FACADE, FLOOR_SHAPES, FS_VERSION, PLAN_ADJ, SKILALYSING };
