# Fyrirspurnarformið — uppsetning

Formið á `hafa-samband.html` sendir núna fyrirspurnir gegnum **Resend**.
Þrjú skref eftir, og þau þarf Róbert að gera sjálfur því þau krefjast
reiknings og leynilykils.

## 1. Resend-reikningur og lén

1. Stofnaðu reikning á [resend.com](https://resend.com).
2. **Domains → Add Domain → `vorbraut14.is`.**
3. Resend gefur þér nokkrar DNS-færslur (SPF, DKIM og DMARC). Settu þær inn
   hjá þeim sem hýsir lénið. Staðfesting tekur yfirleitt nokkrar mínútur.

Án staðfests léns er aðeins hægt að senda á netfangið sem á
Resend-reikninginn — þá kemst ekkert til Miklaborgar.

## 2. Lykill inn á Vercel

1. Resend → **API Keys → Create API Key** (nægir `Sending access`).
2. Vercel → verkefnið → **Settings → Environment Variables**:

   | Breyta | Gildi | Skylda |
   |---|---|---|
   | `RESEND_API_KEY` | lykillinn frá Resend | **já** |
   | `FYRIRSPURN_TIL` | `miklaborg@miklaborg.is` (fleiri aðskildir með kommu) | nei |
   | `FYRIRSPURN_FRA` | `Vorbraut 14 <vefur@vorbraut14.is>` | nei |

3. Veldu öll umhverfin (Production, Preview, Development) og **endurbirtu**
   vefinn svo breyturnar taki gildi.

**Lykillinn má aldrei fara í kóðann.** Hann er lesinn í `api/fyrirspurn.js`,
sem keyrir á þjóni Vercel — gestir sjá hann aldrei.

## 3. Prófun

Sendu fyrirspurn af vorbraut14.is og athugaðu hvort hún berist. Ef eitthvað
klikkar sést ástæðan í **Vercel → Logs** (lykillinn er aldrei skrifaður þangað).

---

## Hvað gerist í raun

- Gestur sendir → `POST /api/fyrirspurn` → Resend → póstur til Miklaborgar.
- `reply_to` er netfang gestsins, svo **Svara** í póstforritinu fer beint á hann.
- Takist sendingin ekki (lykill vantar, Resend hafnar, netið dettur) opnast
  póstforrit gestsins með fyrirspurninni og hann fær að vita það hreint út.
  Formið hreinsast **ekki** í því tilviki, svo textinn hans glatast ekki.
- Ósýnileg hunangsgildra (`vefsida`) stöðvar einföld vélmenni þegjandi.
- Hámark 5 fyrirspurnir á 10 mínútum frá sama IP.

## Athugið um forskoðunarvefinn

`robertspano.github.io/vorbraut-14-forskodun` er **GitHub Pages** og keyrir
engin þjónustuföll. Þar mun formið alltaf falla á póstforritið og segja það.
Sendingin sjálf virkar aðeins á Vercel, þ.e. á vorbraut14.is.
