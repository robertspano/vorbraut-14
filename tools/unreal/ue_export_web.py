# Vorbraut 14 — Unreal: exporta núverandi Level í glTF/GLB fyrir vefinn.
# Krefst viðbótar "glTF Exporter" (Edit > Plugins > leita "glTF").
# Keyra í Unreal Python (Output Log > Python), eða: py "C:/.../ue_export_web.py"
#
# Stilltu OUT (úttaksskrá) og APT (íbúðarnúmer). Settu svo skrána í verkefninu undir
# assets/models/<APT>.glb — vefurinn hleður henni sjálfkrafa í "Ganga um í 3D".
#
# ATH: glTF Exporter API er aðeins mismunandi eftir UE-útgáfu — ef export_to_gltf finnst ekki,
# notaðu File > Export Selected / Export All og veldu .glb handvirkt (sama útkoma).

import unreal

APT = "0401"
OUT = "C:/Vorbraut14/export/%s.glb" % APT     # <-- breyttu slóð

opts = unreal.GLTFExportOptions()
# raunsæ/vef-væn stilling
opts.export_uniform_scale = 1.0
try:
    opts.bake_material_inputs = unreal.GLTFMaterialBakeMode.SIMPLE
    opts.export_texture_transforms = True
    opts.export_preview_mesh = False
except Exception:
    pass

# allir actorar í levelinu (eða notaðu valda actora)
actors = unreal.EditorLevelLibrary.get_all_level_actors()
selection = unreal.GLTFExporter.get_default_export_options() if False else None

try:
    ok = unreal.GLTFExporter.export_to_gltf(
        unreal.EditorLevelLibrary.get_editor_world(),  # exporta heiminn/levelið
        OUT,
        opts,
        set(actors),
    )
    unreal.log("Vorbraut 14: glTF export %s -> %s" % ("OK" if ok else "MISTÓKST", OUT))
except Exception as e:
    unreal.log_warning("export_to_gltf virkaði ekki (%s). Notaðu File > Export All… og veldu .glb handvirkt." % e)
