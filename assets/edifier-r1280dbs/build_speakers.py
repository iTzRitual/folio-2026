import argparse
import json
import math
import os
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

OUT = Path(__file__).resolve().parent
PROJECT = OUT.parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--no-render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
W, H, D = .145, .230, .170
FRONT = .079
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
asset = bpy.data.collections.new('Edifier R1280DBs | grille removed')
scene.collection.children.link(asset)


def group(name):
    obj = bpy.data.objects.new(name, None)
    asset.objects.link(obj)
    return obj


root = group('Edifier_Passive')
root['product'] = 'Edifier R1280DBs, walnut, grille removed'
root['coordinates'] = 'meters; X right, Y up, +Z front; feet at Y=0'
root['placement_envelope_m'] = [W, H, D]


def image(name, pixels, space='sRGB'):
    h, w, _ = pixels.shape
    img = bpy.data.images.new(name, width=w, height=h, alpha=False)
    img.colorspace_settings.name = space
    if space == 'sRGB':
        pixels = np.where(pixels <= .04045, pixels / 12.92, ((pixels + .055) / 1.055) ** 2.4)
    rgba = np.concatenate([pixels, np.ones((h, w, 1))], axis=2).astype(np.float32)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = str(OUT / (name + '.png'))
    img.file_format = 'PNG'
    img.save()
    img.pack()
    return img


rng = np.random.default_rng(1280)
y, x = np.mgrid[0:1024, 0:1024] / 1024
warp = x + .009 * np.sin(y * 5 + x * 9) + .004 * np.sin(y * 13 + x * 14)
tone = np.zeros_like(x)
for frequency, strength in [(18,.024),(70,.018),(260,.024),(900,.018)]:
    knots = rng.normal(0, 1, frequency + 1)
    tone += np.interp(warp, np.linspace(-.02,1.02,frequency+1), knots) * strength
pores = np.maximum(0, np.sin(warp * 3500 + y * 4)) ** 28
tone -= .028 * pores
tone += rng.normal(0, .008, x.shape)
wood_image = image('walnut', np.clip(np.stack([.63 + tone, .405 + tone * .78, .225 + tone * .55], axis=-1), 0, 1))
micro = rng.normal(0, .065, (256, 256, 2))
normal_image = image('surface-normal', np.concatenate([.5 + micro, np.ones((256, 256, 1)) * .993], axis=2), 'Non-Color')
fibers = np.clip(.73 + rng.normal(0, .055, (512,512)), 0, 1)
paper_image = image('paper-fibers', np.repeat(fibers[...,None], 3, axis=2))


def material(name, color, roughness, metallic=0, texture=None, micro_strength=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if texture:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = texture
        mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    if micro_strength:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = normal_image
        normal = mat.node_tree.nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value = micro_strength
        mat.node_tree.links.new(tex.outputs['Color'], normal.inputs['Color'])
        mat.node_tree.links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


wood = material('Walnut veneer', (1, 1, 1), .43, texture=wood_image)
baffle_mat = material('Graphite textured baffle', (.085, .092, .094), .66, micro_strength=.25)
frame_mat = material('Satin driver frames', (.028, .031, .033), .38)
rubber = material('Butyl surrounds and feet', (.010, .012, .014), .74)
paper = material('Silver grey pressed paper', (1, 1, 1), .87, texture=paper_image, micro_strength=.55)
dome_mat = material('Silk dust caps', (.018, .022, .025), .48, micro_strength=.12)
port_mat = material('Polished bass reflex lip', (.008, .01, .012), .22)
black = material('Unlit recesses', (.002, .003, .004), .96)
steel = material('Dark zinc hardware', (.15, .17, .18), .28, .8)
silver = material('Silver branding and control marks', (.65, .68, .67), .4, .35)
red = material('Red input insulation', (.32, .018, .012), .48)
white = material('White input insulation', (.66, .65, .60), .48)
gold = material('RCA contacts', (.48, .29, .07), .25, .8)
led = material('Blue status lens', (.015, .16, .52), .28)


def mesh(name, verts, faces, mat, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-8)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(data)
    bm.free()
    obj = bpy.data.objects.new(name, data)
    asset.objects.link(obj)
    obj.parent = root
    data.materials.append(mat)
    for poly in data.polygons:
        poly.use_smooth = smooth
    return obj


def uv_project(obj, scale=.23):
    layer = obj.data.uv_layers.new() if not obj.data.uv_layers else obj.data.uv_layers.active
    for poly in obj.data.polygons:
        axis = max(range(3), key=lambda i: abs(poly.normal[i]))
        for index in poly.loop_indices:
            p = obj.data.vertices[obj.data.loops[index].vertex_index].co
            u, v = (p.z, p.y) if axis == 0 else ((p.x, p.z) if axis == 1 else (p.x, p.y))
            layer.data[index].uv = (u / scale + .5, v / scale + .5)


def bevel(obj, radius, segments=4):
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new('Machined edge radius', 'BEVEL')
    mod.width = radius
    mod.segments = segments
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    mod = obj.modifiers.new('Face weighted normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def box(name, size, center, mat, radius=.0005):
    a, b, c = [v / 2 for v in size]
    verts = [(i*a, j*b, k*c) for i, j, k in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    obj = mesh(name, verts, [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)], mat)
    obj.location = center
    uv_project(obj, .24 if mat == wood else .02)
    return bevel(obj, radius) if radius else obj


def lathe(name, profile, center, mat, segments=96, axis='Z'):
    verts = []
    for radius, depth in profile:
        for i in range(segments):
            angle = math.tau * i / segments
            a, b = radius * math.cos(angle), radius * math.sin(angle)
            verts.append((a,b,depth) if axis == 'Z' else ((depth,a,b) if axis == 'X' else (a,depth,b)))
    faces = [(j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i) for j in range(len(profile)-1) for i in range(segments)]
    obj = mesh(name, verts, faces, mat, True)
    obj.location = center
    uv_project(obj, .02)
    return obj


def cylinder(name, radius, depth, center, mat, axis='Z', segments=48):
    return lathe(name, [(0,-depth/2),(radius,-depth/2),(radius,depth/2),(0,depth/2)], center, mat, segments, axis)


def subtract(obj, cutter):
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new('Machined opening', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


font_path = os.environ.get('EDIFIER_FONT', '/System/Library/Fonts/Supplemental/Arial Narrow Bold.ttf')
font = bpy.data.fonts.load(font_path)


def lettering(name, text, width, center, mat=silver, side=False, rear=False):
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = text
    curve.font = font
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.size = 1
    curve.extrude = .002 if name == 'EDIFIER badge' else 0
    obj = bpy.data.objects.new(name, curve)
    asset.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(mat)
    bpy.context.view_layer.update()
    obj.scale *= width / obj.dimensions.x
    obj.location = center
    if side:
        obj.rotation_euler.y = math.pi / 2
    elif rear:
        obj.rotation_euler.y = math.pi
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return obj


for side in [-1, 1]:
    box('Rounded walnut cheek', (.013, .226, .167), (side * .066, .117, -.0015), wood, .006,)
for y in [.009, .224]:
    box('Graphite cabinet cap', (.12, .012, .158), (0, y, -.003), baffle_mat, .002)
box('Rear enclosure panel', (.12, .207, .007), (0, .1165, -.079), baffle_mat, .0012)
baffle = box('Front baffle', (.123, .218, .007), (0, .116, FRONT - .0035), baffle_mat, 0)
for name, radius, x, y in [('Woofer', .048, 0, .083), ('Tweeter', .011, -.024, .176), ('Bass reflex', .018, .036, .158)]:
    subtract(baffle, cylinder(name + ' opening', radius, .026, (x,y,FRONT), black, segments=96))
for x in [-.050, .050]:
    for y in [.026, .211]:
        subtract(baffle, cylinder('Grille socket opening', .0042, .025, (x,y,FRONT), black))
        lathe('Empty grille fixing socket', [(.0043,0),(.0046,.0003),(.0037,.001),(.0028,.0002),(.0028,-.005),(0,-.005)], (x,y,FRONT), port_mat, 40)
bevel(baffle, .0005, 2)

woofer = (0,.083,FRONT)
lathe('Woofer cast mounting flange', [(.047,-.001),(.054,-.001),(.055,.0004),(.055,.0016),(.0538,.003),(.049,.003),(.047,.0015)], woofer, frame_mat, 128)
lathe('Woofer thin machined rim', [(.0533,.0025),(.0538,.003),(.0533,.0035),(.0528,.003)], woofer, steel, 128)
surround = [(.039 + .011*i/24, .0018 + .0034 * math.sin(math.pi*i/24)) for i in range(25)]
lathe('Woofer rolled rubber suspension', surround, woofer, rubber, 128)
cone = []
for i in range(65):
    radius = .015 + .025 * i/64
    depth = -.007 + .009 * i/64 + .00065 * math.sin(i/64 * math.tau * 6) * math.sin(math.pi*i/64)
    cone.append((radius, depth))
lathe('Woofer concentric pressed paper cone', cone, woofer, paper, 128)
lathe('Woofer domed dust cap', [(.017*math.sin(t*math.pi/2/20), -.005 + .006*math.cos(t*math.pi/2/20)) for t in range(21)], woofer, dome_mat, 96)

tweeter = (-.024,.176,FRONT)
lathe('Tweeter mounting plate', [(.010,-.0005),(.031,-.0005),(.032,.0005),(.032,.002),(.0305,.003),(.017,.003),(.012,.0005),(.010,.0005)], tweeter, frame_mat, 96)
lathe('Tweeter recessed waveguide', [(.013,.001),(.012,.0025),(.009,.0028),(.0075,-.0005),(.0058,-.001)], tweeter, rubber, 80)
lathe('Silk dome tweeter', [(.0065*math.sin(t*math.pi/2/16), -.001 + .004*math.cos(t*math.pi/2/16)) for t in range(17)], tweeter, dome_mat, 64)
box('Tweeter horizontal protective bridge', (.047,.0012,.0014), (-.024,.176,FRONT+.005), frame_mat, .00055)

lathe('Deep flared bass reflex port', [(.018,-.001),(.021,-.001),(.022,.0005),(.0215,.0025),(.0203,.0034),(.0185,.002),(.017,-.001),(.0155,-.009),(.015,-.033)], (.036,.158,FRONT), port_mat, 96)
cylinder('Bass reflex dark termination', .015, .001, (.036,.158,FRONT-.034), black, segments=64)


def screw(x, y, z, radius=.0021):
    lathe('Recessed screw washer', [(0,-.0004),(radius*1.35,-.0004),(radius*1.35,0),(radius,.0005),(0,.0005)], (x,y,z), steel, 24)
    cylinder('Black Phillips screw', radius, .0007, (x,y,z+.0005), frame_mat, segments=24)
    for angle in [0, math.pi/2]:
        obj = box('Phillips drive slot', (radius*1.25,.00045,.00008), (x,y,z+.00089), black, .0001)
        obj.rotation_euler.z = angle + .2


for cx, cy, radius in [(0,.083,.0505),(-.024,.176,.0265)]:
    for angle in [45, 135, 225, 315]:
        a = math.radians(angle)
        screw(cx+radius*math.cos(a), cy+radius*math.sin(a), FRONT+.003)
lettering('EDIFIER badge', 'EDIFIER', .024, (0,.014,FRONT+.0002))
for x in [-.048, .048]:
    for z in [-.059, .059]:
        cylinder('Isolation foot', .009, .004, (x,.002,z), rubber, axis='Y', segments=32)


def merge_materials(parent):
    materials = {obj.data.materials[0] for obj in parent.children if obj.type == 'MESH'}
    for mat in sorted(materials, key=lambda m: m.name):
        objects = [obj for obj in parent.children if obj.type == 'MESH' and obj.data.materials[0] == mat]
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        objects[0].name = mat.name


merge_materials(root)
passive = root
active = group('Edifier_Active')
for obj in list(passive.children):
    clone = obj.copy()
    asset.objects.link(clone)
    clone.parent = active
root = active
active_wood = next(obj for obj in active.children if obj.data.materials[0] == wood)
active_wood.data = active_wood.data.copy()
subtract(active_wood, box('Side control cutout', (.030,.112,.041), (.077,.155,.006), black, .004))
bpy.context.view_layer.objects.active = active_wood
bpy.ops.mesh.customdata_custom_splitnormals_clear()
for poly in active_wood.data.polygons:
    if max(abs(value) for value in poly.normal) > .999:
        poly.use_smooth = False
panel = box('Side control recess', (.0015,.110,.039), (.063,.155,.006), black, .0007)
for z in [-.014,.026]:
    box('Side panel vertical bezel', (.002,.112,.0025), (.072,.155,z), frame_mat, .0007)
for y in [.100,.210]:
    box('Side panel horizontal bezel', (.002,.003,.041), (.072,y,.006), frame_mat, .0007)
for label, y in [('TREBLE',.183),('BASS',.153),('VOLUME',.123)]:
    lathe(label + ' knob', [(0,-.003),(.0078,-.003),(.008,-.0025),(.008,.0038),(.0076,.0045),(0,.0045)], (.067,y,.006), frame_mat, 48, 'X')
    box(label + ' index', (.0001,.003,.00055), (.0716,y+.0045,.006), silver, .0001)
    lettering(label + ' label', label, .015, (.064,y+.014,.006), side=True)
cylinder('Status lens', .0013, .0007, (.064,.105,.006), led, axis='X', segments=24)
rear = box('Amplifier rear plate', (.085,.166,.0012), (0,.112,-.083), frame_mat, .002)
lettering('Rear model mark', 'EDIFIER   R1280DBs', .063, (0,.184,-.0837), rear=True)
for row, y in enumerate([.155,.132]):
    for x, mat in [(-.023,white),(.002,red)]:
        cylinder('RCA input insulator', .0055,.0018,(x,y,-.084), mat, segments=32)
        lathe('RCA input socket', [(.0035,0),(.0035,-.001),(.002,-.001),(.002,.001)], (x,y,-.084), gold, 32)
    lettering('Line input label', 'LINE 1' if row == 0 else 'LINE 2', .016, (.025,y,-.0837), rear=True)
box('Optical input housing', (.010,.010,.0015), (-.023,.108,-.084), black)
cylinder('Coaxial input', .004,.0016,(.002,.108,-.084), gold, segments=32)
cylinder('Sub out socket', .003,.0016,(.025,.108,-.084), black, segments=32)
for x, mat in [(-.012,red),(.012,black)]:
    box('Output spring terminal', (.010,.012,.0016), (x,.081,-.084), mat)
box('Power rocker', (.012,.017,.0015), (-.016,.049,-.084), black)
lettering('Power label', 'POWER', .015, (-.016,.064,-.0837), rear=True)
box('Power cable socket', (.010,.009,.0014), (.019,.047,-.084), black)
merge_materials(active)
root = passive
box('Passive terminal plate', (.043,.038,.0012), (0,.056,-.083), frame_mat, .002)
for x, mat in [(-.01,red),(.01,black)]:
    box('Passive spring terminal', (.01,.012,.0016), (x,.056,-.084), mat)
lettering('Passive label', 'EDIFIER', .023, (0,.078,-.0837), rear=True)
merge_materials(passive)

bpy.context.view_layer.update()
report = {}
for speaker in [passive, active]:
    meshes = [obj for obj in speaker.children if obj.type == 'MESH']
    points = [obj.matrix_world @ Vector(v) for obj in meshes for v in obj.bound_box]
    bounds = {'min': [min(p[i] for p in points) for i in range(3)], 'max': [max(p[i] for p in points) for i in range(3)]}
    for obj in meshes:
        obj.data.calc_loop_triangles()
    report[speaker.name] = {'bounds': bounds, 'triangles': sum(len(obj.data.loop_triangles) for obj in meshes), 'draw_calls': len(meshes)}
    assert abs(bounds['min'][1]) < 1e-7
    assert bounds['max'][0] - bounds['min'][0] < .147
    assert bounds['max'][2] - bounds['min'][2] < .172
bpy.ops.object.select_all(action='DESELECT')
for obj in asset.objects:
    obj.select_set(True)
destination = PROJECT / 'public/glbs/edifier-r1280dbs.glb'
bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB', use_selection=True, export_yup=False, export_apply=True, export_extras=True, export_cameras=False, export_lights=False)
report['bytes'] = destination.stat().st_size
(OUT / 'asset-report.json').write_text(json.dumps(report, indent=2) + '\n')
passive.location.x = -.105
passive.rotation_euler.y = -.10
active.location.x = .105
active.rotation_euler.y = -.28


def aim(obj, target):
    z = (obj.location - Vector(target)).normalized()
    x = Vector((0,1,0)).cross(z).normalized()
    y = z.cross(x).normalized()
    obj.rotation_euler = Matrix((x,y,z)).transposed().to_euler()


bpy.ops.mesh.primitive_plane_add(size=200, location=(0,-.0003,0), rotation=(math.pi/2,0,0))
floor = bpy.context.object
floor.name = 'STUDIO floor'
floor.data.materials.append(material('STUDIO neutral', (.18,.19,.20), .8))
for loc, power, size in [((-.35,.6,.5),14,.5),((.5,.4,.15),9,.4),((.1,.45,-.4),18,.35)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light = bpy.context.object
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = size
    aim(light,(0,.11,0))
bpy.ops.object.camera_add(location=(.38,.32,.70))
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = .54
aim(camera,(0,.115,0))
scene.camera = camera
scene.world.color = (.16,.16,.16)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 20
scene.cycles.use_denoising = True
scene.render.resolution_x = 1100
scene.render.resolution_y = 807
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'edifier-r1280dbs.blend'))
if not args.no_render:
    for name, loc in [('preview',(.38,.32,.70)),('front',(0,.16,.8)),('rear',(.4,.30,-.7))]:
        camera.location = loc
        aim(camera,(0,.115,0))
        scene.render.filepath = str(OUT / (name + '.png'))
        bpy.ops.render.render(write_still=True)
print(json.dumps(report, indent=2))
