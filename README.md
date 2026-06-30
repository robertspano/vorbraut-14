# Vorbraut 14 — vefsíða

Gagnvirk nýbyggingavefsíða fyrir Vorbraut 14 (Hnoðraholt, Garðabæ), byggð á
sömu hugmynd og uppbyggingu og vesturvin.is: heilskjás-kaflar sem „snappa“ við
skrun, og gagnvirkt íbúðaval þar sem hver íbúð lýsist upp við hover/smell.

Engin byggingarskref — hreint HTML/CSS/JS. Opnaðu `index.html` eða settu möppuna
beint á hvaða static-hýsingu sem er (Netlify, Vercel, GitHub Pages …).

## Keyra á tölvunni
```bash
cd "Vorbraut 14"
python3 -m http.server 5173
# opnaðu http://localhost:5173
```

## Uppbygging
```
index.html          Öll uppbygging síðunnar (kaflar í réttri röð)
css/styles.css      Útlit — litapalletta og leturkerfi efst í skránni
js/data.js          Íbúðagögn + gagnvirkir hover-fletir á framhlið
js/content.js       Allur texti (íslenska + English)
js/app.js           Virkni: skrun, hover, síur, spjald, tungumál
assets/renders/     aerial.png (hero) · front.jpg (hover) · birdseye.jpg
assets/plans/       Grunnmyndir íbúða (0101.png …)
```

## Upplifun — ein samfelld „kvikmynda“-skrun
Öll síðan er **ein samfelld myndavélaferð á einum `<canvas>`** (`js/cine.js`),
stýrt af skrun-stöðu. Engin aðskilin sections, engin gat. Fjórir áfangar:

1. **Loftmynd → niður** (`assets/cine/` f001–096) — flýgur niður að húsinu.
2. **Heldur kyrru á framhliðinni** (rammi f096) — **gagnvirkt**: hover á hverja
   íbúð → grænt + spjald, smellur opnar grunnmynd. Texti/fletir fjara mjúklega
   inn ofan á sömu mynd. Fletirnir í `js/data.js` (`FACADE`, 1280×720 hnit).
3. **Áfram upp** (`assets/cine2/` f001–096) — flýgur upp í loftmynd að ofan.
4. **180° snúningur** (`assets/cine3/` f001–096) — loftmyndin snýst 180°.

Tæknin: **enginn cross-fade** — alltaf teiknaður næsti rammi heill og skýr
(engin blur/draugamynd). Tímalínan og brotpunktar (`D`, `F`, `U`) eru efst í
`js/cine.js`; heildar-skrunhæð er `.cine{height:720vh}` í `css/styles.css`.
Rammar sóttir úr myndböndunum með ffmpeg (~18 MB alls). Til að skipta um:
settu nýja ramma í viðeigandi `assets/cineN/` möppu.

> Athugið: JS/CSS slóðir hafa `?v=N` (cache-buster). Eftir breytingu á hreyfingu
> þarf stundum **Cmd+Shift+R** (hard reload) til að nýja útgáfan hlaðist.

**Hafa samband** opnast í glugga (modal) — úr valmyndinni, úr hero og úr
íbúðaspjaldinu. Þar eru upplýsingar um byggingaraðila, arkitekt og staðsetningu
(söluaðili bætist við þegar hann liggur fyrir).

Hinir kaflarnir (Staðsetning, Íbúðagerðir, Íbúðayfirlit/listi með síum, Hönnun,
Gæði, Hverfi) eru geymdir í `extras/extra-sections.html` og allur texti þeirra er
áfram í `js/content.js` — auðvelt að bæta hvaða kafla sem er aftur inn.

## Breyta íbúðagögnum
Allt í `js/data.js` (fylkið `APARTMENTS`). Hver íbúð:
- `status: 'available' | 'reserved' | 'sold'` — stýrir merkingu og lit á
  framhliðinni og kortunum (`available` = grænt, `reserved` = blátt, `sold` = grátt).
- `area`, `rooms`, `outdoor`, `ceiling`, `plan`.

Hover-fletirnir (`FACADE.zones`) eru í myndrými `front.jpg` (1920×1080) — auðvelt
að fínstilla hnit ef render breytist.

## Heimildir gagna (allt staðfest við uppdrætti)
- **Skráningartafla & aðaluppdrættir** — ARCHUS arkitektar, apríl 2026.
  Allar 14 íbúðir: birt flatarmál og salarhæðir úr skráningartöflu;
  herbergjafjöldi talinn af grunnmyndum hverrar íbúðar.
- **Grunnmyndir** — nákvæm grunnmynd fyrir hverja íbúð (0101–0402), sótt úr
  möppum eftir hæðum og staðfest gegn teikningatextum.
- **Gagnvirka framhliðin** — staðsetning hverrar íbúðar á norðurhlið staðfest
  gegn grunnmyndum + útlitsteikningu (0x01 austast/vinstra megin, 0x04 vestast/
  hægra megin; 0401 vinstra megin, 0402 hægra megin).
- **Vinnuskjal vefsíðu** — texti, litapalletta og kaflaröð.
- **Renderar** — ARCHUS / framkvæmdaraðili (loftmynd, norðurhlið, yfirlitsmynd).

## Handvirk kvörðun á hover-flötum (`?edit`)
Til að stilla hover-kassana pixel-rétt á íbúðirnar:
1. Opnaðu **http://localhost:5173/?edit**
2. Myndavélin læsist á lokarammanum. Dragðu hvern kassa á sína íbúð, breyttu
   stærð með hornunum (örvalyklar nudda: Shift = 10px, Alt = breyta stærð).
3. Það **vistast sjálfkrafa** (localStorage) og tekur strax gildi á venjulegu
   síðunni. Smelltu **„Afrita kóða“** til að líma `zones: {…}` varanlega inn í
   `js/data.js`. **„Núllstilla“** setur í sjálfgefið, **„Loka“** fer út.

## Næstu skref (staðfesta fyrir birtingu)
- **Verð, staða og afhendingartími** þegar það liggur fyrir.
- **Söluaðili** — nafn, sími, netfang, opið hús.
- **Aukakaflar úr vinnuskjali** ef óskað er: frame-by-frame ferð, útsýnisdæmi,
  gagnvirkt hverfiskort, 360° innanhússferð (þurfa frekara myndefni).
- Staðfesta upplýsingar um hverfi (skóla, verslun, þjónustu) áður en birt er.
