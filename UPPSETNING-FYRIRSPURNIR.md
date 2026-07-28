# Fyrirspurnarformið — uppsetning

Formið á `hafa-samband.html` sendir núna fyrirspurnir gegnum **Resend**.
Þrjú skref eftir, og þau þarf Róbert að gera sjálfur því þau krefjast
reiknings og leynilykils.

## 1. DNS — ⏳ ÞETTA ER EFTIR, OG ÞETTA EITT STÖÐVAR SENDINGU

`fyrirspurn.vorbraut14.is` er þegar skráð í Resend en stendur á **pending**:
engin af DNS-færslunum þremur er komin inn. Ég staðfesti með uppflettingu
að þær séu allar ósettar.

DNS fyrir `vorbraut14.is` er hjá **ISNIC** (`forwarding00/01.isnic.is`).
Settu þessar þrjár færslur inn þar:

| Tegund | Nafn | Gildi |
|---|---|---|
| `TXT` | `resend._domainkey.fyrirspurn` | DKIM-gildið úr Resend (langur `p=MIGfMA0…` strengur) |
| `MX`  | `send.fyrirspurn` | `feedback-smtp.eu-west-1.amazonses.com` (forgangur 10) |
| `TXT` | `send.fyrirspurn` | `v=spf1 include:amazonses.com ~all` |

Nákvæmu gildin eru í Resend → Domains → `fyrirspurn.vorbraut14.is`.
Þegar þær eru komnar inn ýtirðu á **Verify** þar (eða lætur mig gera það).

Þangað til lénið er staðfest hafnar Resend hverri sendingu og formið
fellur á póstforrit gestsins.

## 2. Lykill inn á Vercel — ✅ KLÁRAÐ

Breyturnar eru komnar inn á Vercel-verkefnið `vorbraut-14`, bæði í
Production og Preview:

| Breyta | Gildi |
|---|---|
| `RESEND_API_KEY` | (dulkóðaður) |
| `FYRIRSPURN_TIL` | `miklaborg@miklaborg.is` |
| `FYRIRSPURN_FRA` | `Vorbraut 14 <fyrirspurn@fyrirspurn.vorbraut14.is>` |

Vefurinn þarf **endurbirtingu** til að þær taki gildi.

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
