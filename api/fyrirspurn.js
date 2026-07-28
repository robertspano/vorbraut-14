/* ==========================================================================
   Vorbraut 14 — móttaka fyrirspurna (Vercel þjónustufall)

   Vefurinn er static. API-lykill Resend MÁ ALDREI fara í kóða sem gestir sjá,
   svo hann býr hér og aðeins í umhverfisbreytum á Vercel.

   Umhverfisbreytur (Vercel -> Project -> Settings -> Environment Variables):
     RESEND_API_KEY   (skylda)  lykill frá resend.com/api-keys
     FYRIRSPURN_TIL   (valfrjálst)  móttakendur, aðskildir með kommu.
                      Sjálfgildi: miklaborg@miklaborg.is
     FYRIRSPURN_FRA   (valfrjálst)  sendandi. VERÐUR að vera á léni sem er
                      staðfest í Resend. Sjálfgildi: vefur@vorbraut14.is
   ========================================================================== */

const HAMARK = { nafn: 120, netfang: 160, simi: 40, skilabod: 4000 };
const TIL_SJALFGILDI = 'miklaborg@miklaborg.is';
const FRA_SJALFGILDI = 'Vorbraut 14 <vefur@vorbraut14.is>';

/* einföld hraðatakmörkun per IP — lifir í minni fallsins, dugar gegn slysum
   og einföldu ruslpóstsflóði (ekki gegn dreifðri árás; Vercel ver fyrir því) */
const saga = new Map();
const GLUGGI_MS = 10 * 60 * 1000;
const HAMARK_A_GLUGGA = 5;

function ofHratt(ip) {
  const nu = Date.now();
  const fyrri = (saga.get(ip) || []).filter((t) => nu - t < GLUGGI_MS);
  if (fyrri.length >= HAMARK_A_GLUGGA) return true;
  fyrri.push(nu);
  saga.set(ip, fyrri);
  if (saga.size > 5000) saga.clear();          // einföld hreinsun
  return false;
}

const hreinsa = (v, hamark) =>
  String(v == null ? '' : v).replace(/\r\n/g, '\n').trim().slice(0, hamark);

const flotta = (s) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, villa: 'adferd' });
  }

  const lykill = process.env.RESEND_API_KEY;
  if (!lykill) {
    // Uppsetningu er ekki lokið. Segjum það hreint út svo framendinn geti
    // boðið netfangið í staðinn — EKKI þykjast hafa sent.
    return res.status(503).json({ ok: false, villa: 'ouppsett' });
  }

  let g = req.body;
  if (typeof g === 'string') { try { g = JSON.parse(g); } catch { g = null; } }
  if (!g || typeof g !== 'object') return res.status(400).json({ ok: false, villa: 'gogn' });

  // hunangsgildra: ósýnilegur reitur sem aðeins vélmenni fylla út
  if (hreinsa(g.vefsida, 200)) return res.status(200).json({ ok: true });

  const nafn = hreinsa(g.nafn ?? g.name, HAMARK.nafn);
  const netfang = hreinsa(g.netfang ?? g.email, HAMARK.netfang);
  const simi = hreinsa(g.simi ?? g.phone, HAMARK.simi);
  const skilabod = hreinsa(g.skilabod ?? g.message, HAMARK.skilabod);

  if (!nafn || !netfang || !skilabod) return res.status(400).json({ ok: false, villa: 'vantar' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(netfang)) return res.status(400).json({ ok: false, villa: 'netfang' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'oþekkt';
  if (ofHratt(ip)) return res.status(429).json({ ok: false, villa: 'ofhratt' });

  const til = (process.env.FYRIRSPURN_TIL || TIL_SJALFGILDI).split(',').map((s) => s.trim()).filter(Boolean);
  const fra = process.env.FYRIRSPURN_FRA || FRA_SJALFGILDI;

  const linur = [
    `Nafn: ${nafn}`,
    `Netfang: ${netfang}`,
    simi ? `Símanúmer: ${simi}` : null,
    '',
    skilabod,
  ].filter((x) => x !== null);

  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#262522">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#aa8765">Fyrirspurn af vorbraut14.is</p>
    <table style="border-collapse:collapse;margin:14px 0">
      <tr><td style="padding:3px 18px 3px 0;color:#6b665f">Nafn</td><td><b>${flotta(nafn)}</b></td></tr>
      <tr><td style="padding:3px 18px 3px 0;color:#6b665f">Netfang</td><td><a href="mailto:${flotta(netfang)}">${flotta(netfang)}</a></td></tr>
      ${simi ? `<tr><td style="padding:3px 18px 3px 0;color:#6b665f">Sími</td><td>${flotta(simi)}</td></tr>` : ''}
    </table>
    <div style="border-left:2px solid #E8E7E8;padding-left:14px;white-space:pre-wrap">${flotta(skilabod)}</div>
  </div>`;

  try {
    const svar = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lykill}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fra,
        to: til,
        reply_to: netfang,            // svar fer beint á fyrirspyrjanda
        subject: `Fyrirspurn – Vorbraut 14 – ${nafn}`,
        text: linur.join('\n'),
        html,
      }),
    });

    if (!svar.ok) {
      const texti = await svar.text().catch(() => '');
      // Lykill/lén aldrei í svarinu til gestsins — aðeins í loggið á Vercel.
      console.error('Resend hafnaði:', svar.status, texti.slice(0, 400));
      return res.status(502).json({ ok: false, villa: 'sending' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Villa við sendingu:', e && e.message);
    return res.status(502).json({ ok: false, villa: 'sending' });
  }
};
