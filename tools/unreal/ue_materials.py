# Vorbraut 14 — Unreal: úthluta PBR-efnum sjálfvirkt eftir nöfnum (úr IFC/Datasmith-innflutningi).
# Keyra í Unreal: Window > Developer Tools > Output Log > smelltu "Cmd" reit, veldu "Python", límdu inn.
# (Eða: py "C:/.../ue_materials.py")
#
# Datasmith heldur IFC-nöfnum (IfcWall, IfcSlab, IfcWindow, IfcDoor, IfcRailing...).
# Stilltu efnis-slóðirnar (MATS) á þín eigin Material/MaterialInstance — dæmin nota Starter Content.
#
# ATH: Þetta er upphafspunktur; API getur þurft smá aðlögun eftir UE-útgáfu.

import unreal

# keyword (lágstafir) -> efnis-slóð í Content Browser
MATS = {
    "slab":    "/Game/StarterContent/Materials/M_Wood_Floor_Walnut_Inst",  # gólf/parket
    "floor":   "/Game/StarterContent/Materials/M_Wood_Floor_Walnut_Inst",
    "wall":    "/Game/StarterContent/Materials/M_Basic_Wall",              # málaðir veggir
    "window":  "/Game/StarterContent/Materials/M_Glass",                   # gler
    "glass":   "/Game/StarterContent/Materials/M_Glass",
    "door":    "/Game/StarterContent/Materials/M_Wood_Walnut",             # hurðir
    "railing": "/Game/StarterContent/Materials/M_Metal_Steel",
    "rail":    "/Game/StarterContent/Materials/M_Metal_Steel",
}

# hladið efnum
loaded = {}
for k, path in MATS.items():
    m = unreal.EditorAssetLibrary.load_asset(path)
    if m:
        loaded[k] = m
    else:
        unreal.log_warning("Efni fannst ekki: %s (%s)" % (path, k))

actors = unreal.EditorLevelLibrary.get_all_level_actors()
applied = 0
for a in actors:
    name = a.get_actor_label().lower()
    mat = None
    for k, m in loaded.items():
        if k in name:
            mat = m
            break
    if not mat:
        continue
    for comp in a.get_components_by_class(unreal.StaticMeshComponent):
        n = comp.get_num_materials() if hasattr(comp, "get_num_materials") else 1
        for i in range(max(1, n)):
            comp.set_material(i, mat)
            applied += 1

unreal.log("Vorbraut 14: efni úthlutað á %d slots." % applied)
