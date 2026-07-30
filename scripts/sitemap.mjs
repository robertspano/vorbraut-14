/* ==========================================================================
   Vorbraut 14 — smíðar sitemap.xml og robots.txt út frá skránum sjálfum.
   Keyrt í HVERRI birtingu (package.json -> vercel-build), svo kortið eldist
   aldrei: ný undirsíða, breytt slóð eða síða sem er tekin út skila sér
   sjálfkrafa.

   Reglan er einföld og vélræn: HTML-skrá kemst í kortið AÐEINS ef hún
     • er ekki merkt noindex,
     • ber rel="canonical" á sjálfa sig (þ.e. hún ER canonical-slóðin),
     • er ekki á undanþágulistanum hér að neðan.
   ========================================================================== */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';

const LEN = 'https://vorbraut14.is';
const UNDANSKILID = new Set(['404.html', '500.html']);

const slodFyrir = (skra) => (skra === 'index.html' ? '/' : '/' + skra);

const skrar = readdirSync('.').filter((f) => f.endsWith('.html')).sort();
const medIKorti = [];
const sleppt = [];

for (const f of skrar) {
  if (UNDANSKILID.has(f)) { sleppt.push([f, 'undanskilið']); continue; }
  const s = readFileSync(f, 'utf8');

  const robots = (s.match(/<meta\s+name="robots"[^>]*content="([^"]*)"/i) || [])[1] || '';
  if (/noindex/i.test(robots)) { sleppt.push([f, 'noindex']); continue; }

  const canon = (s.match(/<link\s+rel="canonical"[^>]*href="([^"]*)"/i) || [])[1];
  if (!canon) { sleppt.push([f, 'engin canonical']); continue; }

  const vaent = LEN + slodFyrir(f);
  if (canon !== vaent) { sleppt.push([f, `canonical bendir á ${canon}`]); continue; }

  medIKorti.push({ slod: vaent, breytt: statSync(f).mtime.toISOString().slice(0, 10) });
}

// forsíðan efst, svo stafrófsröð
medIKorti.sort((a, b) => (a.slod === LEN + '/' ? -1 : b.slod === LEN + '/' ? 1 : a.slod.localeCompare(b.slod)));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${medIKorti.map((u) => `  <url>
    <loc>${u.slod}</loc>
    <lastmod>${u.breytt}</lastmod>
  </url>`).join('\n')}
</urlset>
`;
writeFileSync('sitemap.xml', xml);

const robotsTxt = `# Vorbraut 14 — ${LEN}
User-agent: *
Allow: /

# ATH: stjórnborðið og innri verkfærin (admin, floorplans, ibud-3d) eru EKKI
# lokuð hér heldur bera noindex. Disallow hefði verið verra: leitarvél sem má
# ekki sækja síðuna SÉR ekki noindex-merkið og getur þá skráð slóðina eina og
# sér. Skrið er leyft svo merkið sjáist og síðurnar falli örugglega út.
Disallow: /api/

Sitemap: ${LEN}/sitemap.xml
`;
writeFileSync('robots.txt', robotsTxt);

console.log(`sitemap.xml: ${medIKorti.length} slóðir`);
medIKorti.forEach((u) => console.log('   +', u.slod));
sleppt.forEach(([f, hv]) => console.log('   -', f, '(' + hv + ')'));
