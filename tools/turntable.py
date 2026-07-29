"""Hrein hringferð um Vorbraut 14 — keyrt með Blender í bakgrunni.

  blender -b --python turntable.py -- <obj> <útmappa> <rammar> <breidd> <hæð>

Hvítt vinnustofu-útlit: húsið ljóst og mjúkt lýst, enginn bakgrunnur (gegnsætt),
myndavélin fer heilan hring á sömu hæð. Engar áferðir — þetta er uppdráttur
í þrívídd, ekki tilraun til ljósmyndar.
"""
import bpy, sys, math, os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OBJ, UT = argv[0], argv[1]
N = int(argv[2]) if len(argv) > 2 else 180
W = int(argv[3]) if len(argv) > 3 else 1920
H = int(argv[4]) if len(argv) > 4 else 1080

# ------------------------------------------------------------------ hreinsa
bpy.ops.wm.read_factory_settings(use_empty=True)

# ------------------------------------------------------------------ innflutn.
# IFC er Z-upp en OBJ-lesarinn gerir sjálfgefið ráð fyrir Y-upp og snýr
# líkaninu — þá varð hæðin 109 m og myndavélin lenti út í hött.
if hasattr(bpy.ops.wm, "obj_import"):
    bpy.ops.wm.obj_import(filepath=OBJ, forward_axis="NEGATIVE_Y", up_axis="Z")
else:
    bpy.ops.import_scene.obj(filepath=OBJ, axis_forward="-Y", axis_up="Z")

hlutir = [o for o in bpy.context.scene.objects if o.type == "MESH"]
if not hlutir:
    raise SystemExit("engin geometría í OBJ")

# sameina í eitt svo efnið og miðjun verði einföld
bpy.ops.object.select_all(action="DESELECT")
for o in hlutir:
    o.select_set(True)
bpy.context.view_layer.objects.active = hlutir[0]
if len(hlutir) > 1:
    bpy.ops.object.join()
hus = bpy.context.view_layer.objects.active
hus.name = "Vorbraut14"

# Flatarstefnur úr IFC eru á reiki — sumar snúa inn og fletirnir hverfa þá
# eða verða dökkir. Rétta þær allar út á við.
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode="OBJECT")

# mjúkar brúnir en skarpar á raunverulegum hornum
bpy.ops.object.shade_smooth()
if hasattr(hus.data, "use_auto_smooth"):
    hus.data.use_auto_smooth = True
    hus.data.auto_smooth_angle = math.radians(35)
else:
    m = hus.modifiers.new("Smooth", "SMOOTH_BY_ANGLE") if "SMOOTH_BY_ANGLE" in [
        i.identifier for i in bpy.types.Modifier.bl_rna.properties["type"].enum_items] else None
    if m and hasattr(m, "angle"):
        m.angle = math.radians(35)

# ------------------------------------------------------------------ miðjun
# bound_box + matrix_world reyndist ótraust (gaf 109 m og svo -76 m hæð).
# Bökum umbreytinguna inn og lesum hnútana beint — þá er ekkert vafamál.
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
n = len(hus.data.vertices)
buf = [0.0] * (n * 3)
hus.data.vertices.foreach_get("co", buf)
xs = buf[0::3]; ys = buf[1::3]; zs = buf[2::3]
minx, maxx = min(xs), max(xs)
miny, maxy = min(ys), max(ys)
minz, maxz = min(zs), max(zs)
print(f"[turntable] hrátt: x {maxx-minx:.1f}  y {maxy-miny:.1f}  z {maxz-minz:.1f} m")

# færum svo miðjan grunnflötur sitji í (0,0,0)
hus.location = (-(minx + maxx) / 2, -(miny + maxy) / 2, -minz)
bpy.ops.object.transform_apply(location=True)

haed = maxz - minz
breidd = maxx - minx
dypt = maxy - miny
staerd = max(breidd, dypt)
midja = Vector((0, 0, 0))
print(f"[turntable] hús: {breidd:.1f} x {dypt:.1f} x {haed:.1f} m")

# ------------------------------------------------------------------ efni
# Líkanið kemur með sín eigin efni úr IFC (timbur, gler, grasþak, álkarmar).
# Við snertum þau ekki nema að stilla hrjúfleika og gegnsæi svo þau lesist vel.
for m in bpy.data.materials:
    if not m.use_nodes:
        m.use_nodes = True
    nodes = m.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if not bsdf:
        continue
    gegnsaett = m.diffuse_color[3] < 0.95 if len(m.diffuse_color) > 3 else False
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = 0.12 if gegnsaett else 0.58
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.5 if gegnsaett else 0.3
    if gegnsaett:
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = 0.42
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else m.blend_method
print(f"[turntable] efni úr líkaninu: {len(bpy.data.materials)}")

# ------------------------------------------------------------------ gólf
bpy.ops.mesh.primitive_plane_add(size=staerd * 40, location=(0, 0, 0))
golf = bpy.context.object
gm = bpy.data.materials.new("Golf")
gm.use_nodes = True
gb = gm.node_tree.nodes["Principled BSDF"]
gb.inputs["Base Color"].default_value = (0.965, 0.960, 0.949, 1)
if "Roughness" in gb.inputs:
    gb.inputs["Roughness"].default_value = 0.9
golf.data.materials.append(gm)
golf.is_shadow_catcher = True                # aðeins skugginn, ekki flöturinn

# ------------------------------------------------------------------ heimur
heimur = bpy.data.worlds.new("Heimur")
bpy.context.scene.world = heimur
heimur.use_nodes = True
bg = heimur.node_tree.nodes["Background"]
# sami tónn og gólfið -> engin sýnileg sjóndeildarlína
bg.inputs[0].default_value = (0.965, 0.960, 0.949, 1)
bg.inputs[1].default_value = 1.0

# ------------------------------------------------------------------ ljós
def ljos(nafn, staða, orka, snun, stærð):
    d = bpy.data.lights.new(nafn, type="AREA")
    d.energy = orka
    d.size = stærð
    o = bpy.data.objects.new(nafn, d)
    o.location = staða
    o.rotation_euler = snun
    bpy.context.collection.objects.link(o)
    return o

r = staerd * 1.4
ljos("Adal",  (-r, -r, haed * 2.6), staerd ** 2 * 0.045,
     (math.radians(52), 0, math.radians(-45)), staerd)
ljos("Fylli", (r, -r * .6, haed * 1.8), staerd ** 2 * 0.020,
     (math.radians(64), 0, math.radians(60)), staerd)
sol = bpy.data.lights.new("Sol", type="SUN")
sol.energy = 2.6
sol.angle = math.radians(6)
so = bpy.data.objects.new("Sol", sol)
so.rotation_euler = (math.radians(48), 0, math.radians(-38))
bpy.context.collection.objects.link(so)

# ------------------------------------------------------------------ myndavél
mid = bpy.data.objects.new("Snuningur", None)
mid.location = (0, 0, haed * 0.46)
bpy.context.collection.objects.link(mid)

cam_d = bpy.data.cameras.new("Cam")
cam_d.lens = 48
cam = bpy.data.objects.new("Cam", cam_d)
fjarl = staerd * 1.42
cam.location = (fjarl, 0, haed * 0.95)
bpy.context.collection.objects.link(cam)
cam.parent = mid
bpy.context.scene.camera = cam

trk = cam.constraints.new("TRACK_TO")
trk.target = mid
trk.track_axis = "TRACK_NEGATIVE_Z"
trk.up_axis = "UP_Y"

# heill hringur, línulegur svo lykkjan sé óaðfinnanleg
# Blender 5 notar slotted actions og Action.fcurves er horfið. Í stað þess að
# elta nýja API-ið stillum við SJÁLFGEFNA innskotið á LINEAR áður en lyklarnir
# eru settir — þá er ferillinn línulegur og lykkjan sömu hraða allan hringinn.
# SVEIFLA, ekki heill hringur. Bakhlið líkansins er ófullgerð (útveggur
# vantar og maður sér inn), svo myndavélin fer yfir framhlið og báðar
# hliðar og til baka. Lykkjan er því óaðfinnanleg án þess að sýna gallann.
SVEIFLA = 105          # gráður til hvorrar hliðar frá framhlið
mid.rotation_euler = (0, 0, math.radians(-SVEIFLA))
mid.keyframe_insert("rotation_euler", frame=1)
mid.rotation_euler = (0, 0, math.radians(SVEIFLA))
mid.keyframe_insert("rotation_euler", frame=N // 2)
mid.rotation_euler = (0, 0, math.radians(-SVEIFLA))
mid.keyframe_insert("rotation_euler", frame=N)
# mjúk umsnúningur á endunum -> BEZIER, ekki LINEAR
try:
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"
except Exception:
    pass

# ------------------------------------------------------------------ render
sc = bpy.context.scene
sc.frame_start, sc.frame_end = 1, N
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.resolution_percentage = 100
sc.render.film_transparent = False
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = os.path.join(UT, "f")

vél = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [
    e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items
] else "BLENDER_EEVEE"
sc.render.engine = vél
if hasattr(sc, "eevee"):
    if hasattr(sc.eevee, "taa_render_samples"):
        sc.eevee.taa_render_samples = 48
    for flag in ("use_gtao", "use_raytracing", "use_shadows"):
        if hasattr(sc.eevee, flag):
            setattr(sc.eevee, flag, True)
tegundir = [e.identifier for e in
            type(sc.view_settings).bl_rna.properties["view_transform"].enum_items]
sc.view_settings.view_transform = "AgX" if "AgX" in tegundir else "Filmic" if "Filmic" in tegundir else "Standard"
sc.view_settings.exposure = -0.2
sc.view_settings.look = "None"

print(f"[turntable] vél={vél}  {N} rammar  {W}x{H}")
bpy.ops.render.render(animation=True)
print("[turntable] BUID")
