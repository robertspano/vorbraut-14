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
  { id: '0101', floor: 1, area: 127.2, rooms: 4, beds: 3, type: 'fam', outdoor: 'verond', status: 'sold', plan: '0101.png', planExact: true , parking: 1 },
  { id: '0102', floor: 1, area: 70.2,  rooms: 2, beds: 1, type: 'two', outdoor: 'verond', status: 'available', price: 69900000,  plan: '0102.png', planExact: true , parking: 0 },
  { id: '0103', floor: 1, area: 69.5,  rooms: 2, beds: 1, type: 'two', outdoor: 'verond', status: 'sold', plan: '0103.png', planExact: true , parking: 0 },
  { id: '0104', floor: 1, area: 115.6, rooms: 3, beds: 2, type: 'fam', outdoor: 'verond', status: 'available', price: 104900000, plan: '0104.png', planExact: true , parking: 1 },
  // ---- 2. hæð — svalir ----
  { id: '0201', floor: 2, area: 128.8, rooms: 4, beds: 3, type: 'fam', outdoor: 'svalir', balcony: 8.1, status: 'sold', price: 119900000, plan: '0201.png', planExact: true , parking: 1 },
  { id: '0202', floor: 2, area: 69.5,  rooms: 2, beds: 1, type: 'two', outdoor: 'svalir', balcony: 5.9, status: 'available', price: 71900000,  plan: '0202.png', planExact: true , parking: 0 },
  { id: '0203', floor: 2, area: 69.6,  rooms: 2, beds: 1, type: 'two', outdoor: 'svalir', balcony: 5.9, status: 'available', price: 71900000,  plan: '0203.png', planExact: true , parking: 0 },
  { id: '0204', floor: 2, area: 131.6, rooms: 4, beds: 3, type: 'fam', outdoor: 'svalir', balcony: 8.1, status: 'available', price: 119900000, plan: '0204.png', planExact: true , parking: 1 },
  // ---- 3. hæð — svalir ----
  { id: '0301', floor: 3, area: 130.3, rooms: 4, beds: 3, type: 'fam', outdoor: 'svalir', balcony: 8.1, status: 'available', price: 122900000, plan: '0301.png', planExact: true , parking: 1 },
  { id: '0302', floor: 3, area: 70.1,  rooms: 2, beds: 1, type: 'two', outdoor: 'svalir', balcony: 5.9, status: 'available', price: 73900000,  plan: '0302.png', planExact: true , parking: 0 },
  { id: '0303', floor: 3, area: 68.6,  rooms: 2, beds: 1, type: 'two', outdoor: 'svalir', balcony: 5.9, status: 'available', price: 73900000,  plan: '0303.png', planExact: true , parking: 0 },
  { id: '0304', floor: 3, area: 130.1, rooms: 4, beds: 3, type: 'fam', outdoor: 'svalir', balcony: 8.1, status: 'sold', plan: '0304.png', planExact: true , parking: 1 },
  // ---- 4. hæð (efsta hæð) — þaksvalir, aukin lofthæð ----
  // Staðfest skv. fasteignasala + skráningartöflu: 0401 = hægri þakíbúð SELD (171,0 m²);
  // 0402 = vinstri þakíbúð TIL SÖLU (167,5 m² / 219,9 m.kr.). Bæði með 2 bílastæði. EKKI víxla aftur.
  { id: '0401', floor: 4, area: 171.0, rooms: 4, beds: 3, type: 'pent', outdoor: 'thaksvalir', ceiling: '3,45–3,70', status: 'sold', plan: '0401.png', planExact: true, walk3d: true , parking: 2 },
  { id: '0402', floor: 4, area: 167.5, rooms: 4, beds: 3, type: 'pent', outdoor: 'thaksvalir', ceiling: '3,45–3,70', status: 'available', price: 219900000, plan: '0402.png', planExact: true, tex: '0401.png', walk3d: true , parking: 2 },
];

/* Gagnvirkir hover-fletir á lokaramma kvikmyndarinnar (f096, 1280×720).
   Hnit í myndrými 0 0 1280 720 — sömu fletir og myndavélin lendir á. */
const FACADE = {
  viewBox: '0 0 1280 720',
  zones: {
    '0101': [[798,567],[799,539],[969,539],[968,558],[993,594],[992,608],[997,617],[997,628],[853,626],[848,615],[805,615],[806,592]],
    '0102': [[639,533],[731,533],[732,538],[799,539],[798,567],[806,592],[805,615],[754,615],[755,626],[650,626],[639,626],[639,587]],
    '0103': [[548,534],[639,533],[639,587],[639,626],[524,626],[524,614],[472,614],[471,590],[477,566],[475,537],[547,537]],
    '0104': [[344,537],[475,537],[477,566],[471,590],[472,614],[422,612],[416,624],[284,624],[284,615],[289,606],[287,593],[315,555],[314,537],[338,537]],
    '0201': [[806,470],[981,470],[980,487],[995,506],[993,539],[804,539]],
    '0202': [[639,466],[733,466],[734,470],[806,470],[804,539],[732,538],[731,533],[639,533]],
    '0203': [[473,469],[545,469],[546,463],[638,463],[639,533],[548,534],[547,537],[475,537]],
    '0204': [[325,468],[473,466],[475,537],[286,537],[283,504],[298,486],[297,469]],
    '0301': [[808,387],[968,388],[988,388],[988,393],[986,420],[1002,437],[999,470],[806,470]],
    '0302': [[639,387],[808,387],[806,470],[734,470],[733,466],[639,466]],
    '0303': [[489,387],[639,387],[638,463],[546,463],[545,469],[473,469],[472,435],[471,387],[489,387]],
    '0304': [[318,387],[471,387],[473,466],[279,469],[277,435],[292,419],[290,388],[290,388]],
    '0401': [[639,283],[729,283],[725,271],[784,271],[816,271],[817,248],[822,248],[822,271],[984,272],[983,293],[969,293],[968,322],[992,340],[991,367],[995,367],[994,381],[983,381],[983,388],[908,387],[639,387]],
    '0402': [[294,270],[437,270],[457,270],[457,246],[463,246],[464,270],[492,270],[554,270],[550,283],[639,283],[639,387],[397,386],[297,385],[286,384],[285,365],[289,363],[288,337],[311,337],[311,327],[309,291],[296,291]],
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

/* Sjónarhorn hússins í veljaranum. Bættu við færslu til að fá fleiri myndir.
   id      – lykill (keilurnar vísa í hann með 'side')
   label   – texti á takkanum (i18n lykill 'facade.<id>' hefur forgang ef til)
   img     – mynd í assets/
   zones   – true = gagnvirku íbúðasvæðin virka á þessari mynd (aðeins bakhliðin er kvörðuð) */
/* Smellisvæði á FRAMHLIÐINNI — handkvörðuð af Róberti í ?mask=framan.
   Bakhliðin er í FACADE.zones hér að ofan. */
FACADE.zonesHlid = {};        /* kvarðað í ?mask=hlid */
FACADE.zonesKjallari = {    /* EITT svæði, ekki íbúðir — handkvarðað í ?mask=kjallari */
    'kjallari': [[271,457],[602,349],[611,350],[612,342],[825,372],[825,382],[837,384],[837,420],[787,470],[784,479],[570,630],[277,547]],
};    /* EITT svæði, ekki íbúðir — kvarðað í ?mask=kjallari */

FACADE.zonesFraman = {
    '0101': [[354,493],[552,494],[554,554],[469,553],[468,546],[359,545]],
    '0102': [[552,494],[631,494],[631,539],[558,539],[554,554]],
    '0103': [[631,494],[710,494],[709,547],[707,539],[631,539]],
    '0104': [[800,495],[914,497],[909,550],[797,547]],
    '0201': [[348,439],[550,439],[552,494],[354,493]],
    '0202': [[550,439],[631,440],[631,494],[552,494]],
    '0203': [[631,440],[711,439],[710,494],[631,494]],
    '0204': [[711,439],[920,440],[914,497],[710,494]],
    '0301': [[341,381],[458,381],[457,385],[548,385],[550,439],[348,439]],
    '0302': [[548,385],[630,385],[631,440],[550,439]],
    '0303': [[630,385],[712,385],[711,439],[631,440]],
    '0304': [[805,381],[925,382],[920,440],[711,439],[712,385],[807,386]],
    '0401': [[332,309],[455,309],[463,297],[540,297],[548,297],[551,376],[548,385],[457,385],[458,381],[341,381]],
    '0402': [[711,304],[719,304],[718,298],[801,298],[808,311],[932,310],[926,382],[805,381],[807,386],[712,385],[711,375]],
};

/* BÍLAKJALLARINN — lesið af aðaluppdrættinum (assets/plans/bilakjallari.png,
   1506x1010). Hver íbúð á sína geymslu; sex eiga eitt stæði, 0401 og 0402
   eiga tvö hvor. 0102/0103/0202/0203/0302/0303 eiga ekkert stæði. */
const KJALLARI = {
  mynd: 'assets/plans/bilakjallari.png',
  w: 1506, h: 1010,
  ibudir: {
      '0101': { staedi: ['B10'], geymsla: [1282, 688, 1405, 810], reitir: [[1282, 495, 1405, 600]] },
      '0102': { staedi: [], geymsla: [478, 752, 590, 810] },
      '0103': { staedi: [], geymsla: [478, 688, 590, 748] },
      '0104': { staedi: ['B09'], geymsla: [1135, 688, 1278, 810], reitir: [[1137, 495, 1278, 600]] },
      '0201': { staedi: ['B08'], geymsla: [1003, 688, 1131, 810], reitir: [[1004, 495, 1133, 600]] },
      '0202': { staedi: [], geymsla: [478, 618, 590, 678] },
      '0203': { staedi: [], geymsla: [478, 552, 590, 615] },
      '0204': { staedi: ['B07'], geymsla: [860, 688, 1000, 810], reitir: [[862, 495, 1000, 600]] },
      '0301': { staedi: ['B06'], geymsla: [715, 688, 856, 810], reitir: [[720, 495, 858, 600]] },
      '0302': { staedi: [], geymsla: [712, 158, 828, 215] },
      '0303': { staedi: [], geymsla: [905, 143, 1020, 215] },
      '0304': { staedi: ['B05'], geymsla: [598, 688, 712, 810], reitir: [[590, 495, 716, 600]] },
      '0401': { staedi: ['B03', 'B04'], geymsla: [1022, 30, 1133, 150], reitir: [[1136, 200, 1278, 310], [1282, 200, 1405, 310]] },
      '0402': { staedi: ['B01', 'B02'], geymsla: [315, 30, 443, 110], reitir: [[448, 200, 585, 310], [590, 200, 708, 310]] },
  },
};

const VIEWS = [
  { id: 'aftan',    label: 'Bakhlið',      img: 'assets/renders/foto-bak.webp',      zones: true },
  { id: 'framan',   label: 'Framhlið',     img: 'assets/renders/foto-fram.webp', zones: 'framan' },
  { id: 'hlid',     label: 'Hliðin',       img: 'assets/renders/foto-ska.webp', zones: 'hlid' },
  { id: 'kjallari', label: 'Bílakjallari', img: 'assets/renders/foto-rampur.webp',
    zones: 'kjallari', zoneList: ['kjallari'], zoneHref: 'adgengi.html' },
];

/* Útsýnis-keilur á hæðarkortinu (sjónarhornin sem skipta um mynd af húsinu).
   x/y eru í hnitakerfi hæðarkortsins, deg = snúningur (0 = vísar upp), s = stærð.
   Hægt er að draga þær til með ?conedit og vista varanlega hér. */
/* Ein keila á hvert sjónarhorn, staðsett rétt utan við grunnmyndina (viewBox 300×181).
   Hnit verða að haldast nálægt kassanum — keila langt fyrir utan hann teiknast yfir
   fyrirsögnina fyrir ofan (sjá .select__diagram sem klippir af til öryggis). */
const VIEW_CONES = [
  { side: 'framan',   x: 152.4, y:  -31.9, deg: 181, s: 0.80 },
  { side: 'aftan',    x: 152.1, y:  228.5, deg:   0, s: 0.80 },
  { side: 'kjallari', x: -45.6, y:  135.3, deg:  56, s: 0.80 },
  { side: 'hlid',     x: 347.8, y:  219.1, deg: 309, s: 0.80 },
];
try {
  const savedVC = JSON.parse(localStorage.getItem('vb-cones') || 'null');
  if (Array.isArray(savedVC) && savedVC.length) {
    VIEW_CONES.length = 0;                       // vistuð uppsetning kemur í staðinn (má vera fleiri/færri)
    savedVC.forEach((c) => VIEW_CONES.push({
      side: String(c.side || 'aftan'),
      x: +c.x || 0, y: +c.y || 0,
      deg: ((+c.deg || 0) % 360 + 360) % 360,
      s: Math.min(2, Math.max(0.3, +c.s || 0.8)),
    }));
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
/* Handstillt svæði úr ?mask lifa í localStorage þar til þau eru vistuð hér. */
['framan', 'hlid', 'kjallari'].forEach(function (v) {
  try {
    var g = localStorage.getItem('vb-facadezones-' + v);
    if (!g) return;
    var p = JSON.parse(g);
    if (!p || typeof p !== 'object') return;
    // Sjónarhorn með eigin svæði (t.d. bílakjallarinn) má EKKI erfa gamlar
    // íbúðavistanir úr vafranum — henda öllu sem á ekki heima þar.
    var skil = (VIEWS || []).find(function (x) { return x.id === v; });
    if (skil && skil.zoneList) {
      Object.keys(p).forEach(function (k) {
        if (skil.zoneList.indexOf(k) < 0) delete p[k];
      });
    }
    if (Object.keys(p).length) {
      FACADE['zones' + v.charAt(0).toUpperCase() + v.slice(1)] = p;
    } else {
      localStorage.removeItem('vb-facadezones-' + v);
    }
  } catch (e) {}
});

window.VB = {
  KJALLARI, APARTMENTS, FACADE, FLOOR_SHAPES, FS_VERSION, PLAN_ADJ, SKILALYSING, VIEW_CONES, VIEWS };
