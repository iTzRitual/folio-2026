from pathlib import Path
import bpy
import bmesh
import math
import json
import shutil
from mathutils import Vector

OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.length_unit = 'MILLIMETERS'
asset = bpy.data.collections.new('Monster Mango Loco | 500 ml')
scene.collection.children.link(asset)


def material(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Metallic'].default_value = metallic
    node.inputs['Roughness'].default_value = roughness
    return mat


silver = material('Brushed aluminium', (.64, .68, .72), 1, .27)
dark = material('Recessed score', (.08, .095, .10), .85, .38)
tab_mat = material('Stamped aluminium tab', (.52, .57, .61), 1, .3)
ink = material('Mango Loco | printed aluminium', (1, 1, 1), .15, .36)
shader = ink.node_tree.nodes.get('Principled BSDF')
shader.inputs['Coat Weight'].default_value = .25
shader.inputs['Coat Roughness'].default_value = .24
texture = ink.node_tree.nodes.new('ShaderNodeTexImage')
texture.image = bpy.data.images.load(str(OUT / 'label.png'))
texture.image.pack()
texture.extension = 'EXTEND'
ink.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])


def finish(ob, name, mat):
    ob.name = name
    for collection in list(ob.users_collection):
        collection.objects.unlink(ob)
    asset.objects.link(ob)
    ob.data.materials.append(mat)
    for poly in ob.data.polygons:
        poly.use_smooth = True
    return ob


def lathe(name, profile, mat, label=False):
    n = 128
    vertices = [(r * math.sin(i * math.tau / n), r * math.cos(i * math.tau / n), z)
                for r, z in profile for i in range(n + 1)]
    faces = [(j*(n+1)+i, (j+1)*(n+1)+i, (j+1)*(n+1)+i+1, j*(n+1)+i+1)
             for j in range(len(profile)-1) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    asset.objects.link(ob)
    mesh.materials.append(mat)
    uv = mesh.uv_layers.new(name='Cylindrical label')
    for face in mesh.polygons:
        face.use_smooth = True
        for loop in face.loop_indices:
            index = mesh.loops[loop].vertex_index
            z = vertices[index][2]
            uv.data[loop].uv = (1-(index % (n+1))/n, max(0, min(1, (z-.004)/.161)) if label else z/.168)
    return ob


body = lathe('Printed body and tapered shoulders', [
    (.0278,.0035), (.0295,.0045), (.0313,.0065), (.0325,.009),
    (.03295,.012), (.033,.018), (.033,.145), (.0329,.150),
    (.0324,.153), (.0314,.156), (.0294,.160), (.0282,.1635),
    (.0282,.165)], ink, True)
lathe('Domed bottom and standing chime', [
    (0,.010), (.010,.0098), (.020,.008), (.025,.0048),
    (.0264,.0012), (.0272,0), (.0281,0), (.0288,.0008),
    (.0292,.002), (.0293,.003), (.0288,.004), (.0278,.0042)], silver)
lathe('Double rolled top seam', [
    (.0281,.164), (.0289,.1644), (.0295,.1651), (.02965,.166),
    (.0294,.1671), (.0288,.168), (.0279,.168), (.0272,.1675),
    (.0269,.1666), (.0271,.1654), (.0275,.1648)], silver)
lathe('Recessed lid with concentric countersink', [
    (0,.1636), (.0218,.1636), (.023,.1637), (.024,.1643),
    (.0249,.1645), (.0257,.1635), (.0263,.1633), (.0269,.1643),
    (.0276,.1658)], silver)


def tube(name, points, radius, mat, cyclic=True):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new('POLY')
    spline.points.add(len(points)-1)
    for point, xyz in zip(spline.points, points):
        point.co = (*xyz, 1)
    spline.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, curve)
    asset.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob.select_set(False)
    ob.data.materials.append(mat)
    for face in ob.data.polygons:
        face.use_smooth = True
    return ob


tube('Stay-on opening score', [(.0083*math.sin(t), -.011+.009*math.cos(t), .16373)
     for t in [i*math.tau/80 for i in range(80)]], .00012, dark)
tube('Pull tab rolled edge', [(.0053*math.sin(t), .002+.0105*math.cos(t), .165)
     for t in [i*math.tau/80 for i in range(80)]], .00115, tab_mat)
tube('Pull tab inner grip', [(.0036*math.sin(t), .006+.0045*math.cos(t), .16505)
     for t in [i*math.tau/64 for i in range(64)]], .00048, tab_mat)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0,-.0025,.165))
bridge = bpy.context.object
bridge.dimensions = (.0088,.008,.0012)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bevel = bridge.modifiers.new('Stamped corners', 'BEVEL')
bevel.width = .0007
bevel.segments = 3
bpy.ops.object.modifier_apply(modifier=bevel.name)
finish(bridge, 'Pull tab bridge', tab_mat)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1, location=(0,-.001,.1658))
rivet = bpy.context.object
rivet.scale = (.0016,.0016,.00055)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
finish(rivet, 'Lid rivet', silver)

bpy.ops.object.select_all(action='DESELECT')
for ob in asset.objects:
    ob.select_set(True)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
bpy.ops.export_scene.gltf(filepath=str(OUT / 'monster-mango-loco.glb'), export_format='GLB',
    use_selection=True, export_yup=True, export_cameras=False, export_lights=False)
shutil.copy2(OUT / 'monster-mango-loco.glb', OUT.parents[1] / 'public/glbs/monster-mango-loco.glb')
points = [ob.matrix_world @ Vector(v) for ob in asset.objects for v in ob.bound_box]
report = {'dimensions_m': [max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)],
          'bottom_z_m': min(p.z for p in points), 'objects': len(asset.objects),
          'triangles': sum(len(p.vertices)-2 for ob in asset.objects for p in ob.data.polygons),
          'glb_bytes': (OUT / 'monster-mango-loco.glb').stat().st_size,
          'label': 'Reconstructed from official front packshot; decorative rear, not a full manufacturer scan'}
(OUT / 'asset-report.json').write_text(json.dumps(report, indent=2))
bpy.ops.object.select_all(action='DESELECT')


def aim(ob, target):
    ob.rotation_euler = (Vector(target)-ob.location).to_track_quat('-Z', 'Y').to_euler()


bpy.ops.mesh.primitive_plane_add(size=200)
ground = bpy.context.object
ground.name = 'Studio ground | excluded from export'
ground.data.materials.append(material('Studio charcoal', (.055,.065,.08), 0, .7))
for location, power, size in [((-.17,-.20,.28),2,.20), ((.18,.08,.23),3,.15), ((.08,-.25,.13),.8,.16)]:
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = size
    aim(light, (0,0,.085))
bpy.ops.object.camera_add(location=(.045,-.37,.235))
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = .235
aim(camera, (0,0,.085))
scene.camera = camera
scene.world.color = (.16,.16,.16)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 900
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'monster-mango-loco.blend'))
scene.render.filepath = str(OUT / 'preview.png')
bpy.ops.render.render(write_still=True)
camera.location = (.04,-.12,.32)
aim(camera, (0,0,.15))
camera.data.ortho_scale = .095
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.filepath = str(OUT / 'lid.png')
bpy.ops.render.render(write_still=True)
print(json.dumps(report))
