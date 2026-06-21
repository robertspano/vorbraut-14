# Vorbraut 14 — raunsæ 3D gönguferð (Unreal Engine / Twinmotion)

Markmið: ljósmyndaraunsæ, húsgagnað gönguferð um íbúðirnar sem fer á vefsíðuna.

Þú átt nú þegar **alvöru módelið**: BIM/IFC-skrá arkitektsins
`~/Downloads/26-0608 - Vorbraut 14.ifc` (IFC2X3). Hún fer beint inn í Twinmotion/Unreal.

Vefsíðan er þegar tilbúin að taka við úttakinu — sjá „Koma á síðuna" neðst.

---

## Leið A — Twinmotion (auðveldast, ókeypis, mælt með)

Twinmotion (frá Epic, sami grunnur og Unreal) er gert fyrir nákvæmlega þetta.

1. **Sæktu Twinmotion** (ókeypis): twinmotion.com / Epic Games launcher.
2. **Flyttu inn IFC:** `File → Import → Geometry` → veldu IFC-skrána. Hún kemur inn með réttum
   veggjum, gólfum, hurðum, gluggum (réttar stærðir, í metrum).
3. **Veldu íbúð:** fela/eyða hinum íbúðunum (eða einangraðu eina hæð) svo þú vinnir með eina í einu.
4. **Efni (drag & drop úr safninu):** parket á gólf, máln. á veggi, flísar á baðherbergi, gler í glugga.
5. **Húsgögn:** dragðu úr Twinmotion-safninu (rúm, sófar, eldhús, borð, plöntur) — staðsettu eftir
   `assets/plans_tex/<id>.png` (textured grunnmyndinni) svo það passi við markaðs-renderinn.
6. **Lýsing:** stilltu sól/himin + innilýsing (Lumen, sjálfvirkt raunsætt).
7. **Úttak — tvær leiðir:**
   - **Twinmotion Cloud / Presenter:** `Export → Twinmotion Cloud` → birtir gagnvirka göngu á vefnum →
     afritaðu **hlekkinn** og sendu mér → ég felli hann inn á Vorbraut-síðuna.
   - **GLB:** `Export → Datasmith` → opnaðu í Unreal → keyrðu `ue_export_web.py` (sjá Leið B) → GLB.
     (Twinmotion exportar ekki GLB beint, en Datasmith → Unreal → glTF virkar.)

---

## Leið B — Unreal Engine (mesta stjórn / Pixel Streaming)

1. **UE5** — virkjaðu viðbætur (Edit → Plugins): **Datasmith**, **Python Editor Script Plugin**,
   **glTF Exporter**, (og **Pixel Streaming** ef þú vilt rauntíma-streymi).
2. **Flyttu inn módelið:** annaðhvort Datasmith úr Twinmotion, eða glTF/FBX, eða IFC→Datasmith.
3. **Efni:** keyrðu `ue_materials.py` (Window → Developer Tools → Output Log → Python) til að
   úthluta PBR-efnum sjálfvirkt eftir nöfnum (Wall/Slab/Window/Door…). Lagaðu efnis-slóðir efst í skránni.
4. **Húsgögn + lýsing:** Quixel Megascans / Bridge fyrir húsgögn, Lumen + Lightmass fyrir ljós.
5. **Úttak:**
   - **Vefur (GLB):** keyrðu `ue_export_web.py` → glTF/GLB.
   - **Pixel Streaming:** pakka verkefninu og keyra á skýja-GPU (Arcware/Eagle3D eða eigin server) →
     sendu mér streymis-hlekkinn → ég felli hann inn.

---

## Koma á síðuna

**GLB (einfaldast):**
1. Nefndu skrána eftir íbúð: `0401.glb`, `0402.glb`, …
2. Settu hana í `assets/models/`.
3. Það er allt — gönguferðin (`ibud-3d.html`, takkinn „Ganga um í 3D") **hleður GLB sjálfkrafa**
   (fyrstu persóna + doll house + árekstrar virka strax). GLB hefur forgang fram yfir BIM-JSON.
4. Kveiktu á íbúðinni: settu `walk3d: true` á hana í `js/data.js` (0401/0402 eru þegar á).

**Cloud / Pixel Streaming hlekkur:** sendu mér URL-ið → ég felli það inn (iframe eða „Skoða í 3D" takki).

### Export-ráð fyrir hreint vef-GLB
- **Metrar**, **Y-up**, rétt stærð (íbúð ~13 m breið).
- **Hurðir opnar eða fjarlægðar** — annars lokast dyragöt og maður kemst ekki á milli rýma.
- Bakaðu/innfelldu áferð (embedded textures). Draco/meshopt þjöppun ef hægt.
- Haltu þríhyrningafjölda hóflegum (< ~1–2M) svo það keyri vel í vafra.
- Eitt GLB per íbúð (ekki allt húsið) — léttara og fókuserað.

---

*Athugið: ég (Claude) get ekki keyrt Unreal/Twinmotion héðan — þetta er gert á þinni vél eða af
archviz-verktaka. En vefurinn + skripturnar hér eru tilbúin að taka við úttakinu.*
