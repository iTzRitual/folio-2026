import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.geometry import delaunay_2d_cdt

OUT = Path(__file__).resolve().parent
PROJECT = OUT.parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--no-render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
asset = bpy.data.collections.new('Logitech G502 Hero | cable omitted')
scene.collection.children.link(asset)
root = bpy.data.objects.new('Logitech_G502_Hero', None)
asset.objects.link(root)
root['product'] = 'Logitech G502 Hero, reference reconstruction without cable'
root['coordinates'] = 'meters, Y up, -Z nose, sole at Y=0'


def material(name, color, roughness, metal=0, emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Roughness'].default_value = roughness
    node.inputs['Metallic'].default_value = metal
    if emission:
        node.inputs['Emission Color'].default_value = (*color, 1)
        node.inputs['Emission Strength'].default_value = emission
    return mat


shell = material('Graphite satin polymer', (.012, .014, .017), .43)
buttons = material('Matte charcoal button caps', (.018, .021, .025), .48)
gloss = material('Polished black panel reveals', (.006, .008, .011), .21)
rubber = material('Textured elastomer grips', (.014, .017, .021), .77)
grain = material('Recessed grip triangles', (.008, .010, .013), .86)
steel = material('Brushed nickel scroll wheel', (.33, .35, .37), .3, .88)
cyan = material('Cyan logo and DPI light guides', (.002, .38, .68), .27, 0, 1.6)
mark = material('Subtle laser button legends', (.10, .12, .14), .65)
feet = material('PTFE glide pads', (.065, .071, .078), .37)

rng = np.random.default_rng(502)
normal = bpy.data.images.new('Polymer micrograin', width=256, height=256, alpha=False)
normal.colorspace_settings.name = 'Non-Color'
noise = rng.normal(0, .035, (256, 256, 2))
rgba = np.concatenate([.5 + noise, np.ones((256,256,1)), np.ones((256,256,1))], axis=2).astype(np.float32)
normal.pixels.foreach_set(rgba.ravel())
normal.filepath_raw = str(OUT / 'polymer-normal.png')
normal.file_format = 'PNG'
normal.save()
normal.pack()
for mat, strength in [(shell,.18), (buttons,.24), (rubber,.55)]:
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = normal
    n = mat.node_tree.nodes.new('ShaderNodeNormalMap')
    n.inputs['Strength'].default_value = strength
    mat.node_tree.links.new(tex.outputs['Color'], n.inputs['Color'])
    mat.node_tree.links.new(n.outputs['Normal'], mat.node_tree.nodes.get('Principled BSDF').inputs['Normal'])


def mesh(name, verts, faces, mat, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata([tuple(v / 1000 for v in p) for p in verts], [], faces)
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
    uv = data.uv_layers.new()
    for p in data.polygons:
        p.use_smooth = smooth
        axis = max(range(3), key=lambda i: abs(p.normal[i]))
        for index in p.loop_indices:
            v = data.vertices[data.loops[index].vertex_index].co
            a, b = (v.y,v.z) if axis == 0 else ((v.x,v.z) if axis == 1 else (v.x,v.y))
            uv.data[index].uv = (a / .012, b / .012)
    return obj


def bevel(obj, width=.25, segments=3):
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new('Rounded manufactured edges', 'BEVEL')
    mod.width = width / 1000
    mod.segments = segments
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def interpolate(z, points):
    for i in range(len(points)-1):
        if z <= points[i+1][0]:
            a, b = points[i], points[i+1]
            t = max(0, (z-a[0])/(b[0]-a[0]))
            before, after = points[max(0,i-1)], points[min(len(points)-1,i+2)]
            ma = (b[1]-before[1]) / (b[0]-before[0]) * (b[0]-a[0])
            mb = (after[1]-a[1]) / (after[0]-a[0]) * (b[0]-a[0])
            return (2*t**3-3*t*t+1)*a[1] + (t**3-2*t*t+t)*ma + (-2*t**3+3*t*t)*b[1] + (t**3-t*t)*mb
    return points[-1][1]


def width(z):
    return interpolate(z, [(-65,25),(-50,29),(-22,30),(2,30),(28,33),(44,30),(57,21),(65,1)])


def height(z):
    return interpolate(z, [(-65,13),(-48,21),(-23,29),(0,37),(20,41),(36,38),(51,28),(61,16),(65,6)])


def top(x, z):
    return 7 + (height(z)-7) * max(.001, 1-(x/width(z))**2)**.43


verts, faces = [], []
N, R = 112, 80
for j in range(N+1):
    z = -65 + 130*j/N
    for i in range(R):
        theta = math.tau*i/R
        x = width(z)*math.sin(theta)
        c = math.cos(theta)
        y = 7 + (height(z)-7)*max(0,c)**.86 if c >= 0 else 7 + 5.7*c
        verts.append((x,y,z))
for j in range(N):
    for i in range(R):
        faces.append((j*R+i,j*R+(i+1)%R,(j+1)*R+(i+1)%R,(j+1)*R+i))
faces.extend([tuple(reversed(range(R))), tuple(N*R+i for i in range(R))])
chassis = mesh('Continuous lower chassis', verts, faces, gloss)


def patch(name, outline, mat, lift=.7, surface=top, thickness=.65, density=12):
    spacing = 1.2 if density > 4 else .7
    polygon = []
    for i, point in enumerate(outline):
        start, end = Vector(point), Vector(outline[(i+1)%len(outline)])
        steps = max(1,math.ceil((end-start).length/spacing))
        polygon.extend(start+(end-start)*j/steps for j in range(steps))
    area = sum(polygon[i].x*polygon[(i+1)%len(polygon)].y-polygon[(i+1)%len(polygon)].x*polygon[i].y for i in range(len(polygon)))
    if area < 0:
        polygon.reverse()
    perimeter = list(range(len(polygon)))
    for x in np.arange(min(p[0] for p in outline)+spacing/2,max(p[0] for p in outline),spacing):
        for z in np.arange(min(p[1] for p in outline)+spacing/2,max(p[1] for p in outline),spacing):
            inside = False
            for i, (ax,az) in enumerate(outline):
                bx,bz = outline[(i+1)%len(outline)]
                if (az>z)!=(bz>z) and x<(bx-ax)*(z-az)/(bz-az)+ax:
                    inside = not inside
            if inside:
                polygon.append(Vector((x,z)))
    coordinates, _, triangles, _, _, _ = delaunay_2d_cdt(polygon,[],[perimeter],1,.00001,False)
    verts = [(p.x,surface(p.x,p.y)+lift,p.y) for p in coordinates]
    faces = [tuple(reversed(face)) for face in triangles]
    obj = mesh(name, verts, faces, mat)
    if thickness:
        bpy.context.view_layer.objects.active = obj
        mod = obj.modifiers.new('Panel thickness', 'SOLIDIFY')
        mod.thickness = thickness/1000
        mod.offset = -1
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bevel(obj,.18,2)
    return obj


patch('Left primary button', [(-24,-64),(-6,-64),(-6,-10),(-4,7),(-24,17),(-27,-14)], buttons)
patch('Right primary button', [(6,-64),(24,-60),(28,-36),(29,-7),(28,8),(7,1),(6,-17)], buttons)
patch('Left outer blade', [(-25,-61),(-29,-48),(-29,-22),(-27,-17),(-25,-23)], shell, .8)
patch('Right outer blade', [(26,-58),(29,-46),(30,-24),(31,0),(30,21),(28,12),(30,-7),(29,-38)], shell, .65)
palm = [(-24,20),(-2,10),(8,9),(28,16)] + [(width(z)*.975,z) for z in [24,32,40,48,55,60,63,64]] + [(-width(z)*.975,z) for z in [64,63,60,55,48,40,32]]
patch('Sculpted palm shell', palm, shell, .95, density=10)
patch('Left DPI shoulder', [(-27,-13),(-25,16),(-7,8),(-10,-3)], shell, 1)
patch('DPI forward key', [(-27,-45),(-23,-42),(-23,-22),(-27,-17),(-29,-24)], buttons, 1.4)
patch('DPI back key', [(-27,-15),(-23,-19),(-19,-7),(-23,-2)], buttons, 1.4)
patch('Central control spine', [(-4.8,-15),(4.8,-15),(5.2,6),(-2,9),(-4.8,6)], gloss, 1)
patch('Wheel mode button', [(-3.8,-14),(3.8,-14),(3.8,-7),(-3.8,-7)], buttons, 2, density=4)
patch('G9 profile button', [(-3.8,-4),(4,-4),(4,3),(-2.8,5)], buttons, 2, density=4)


def box(name, size, center, mat, radius=.3):
    x,y,z = [v/2 for v in size]
    obj = mesh(name, [(a*x+center[0],b*y+center[1],c*z+center[2]) for a,b,c in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]], [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)], mat, False)
    return bevel(obj,radius) if radius else obj


def lathe(name, profile, center, mat, segments=96):
    verts = [(center[0]+depth,center[1]+r*math.cos(math.tau*i/segments),center[2]+r*math.sin(math.tau*i/segments)) for depth,r in profile for i in range(segments)]
    faces = [(j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i) for j in range(len(profile)-1) for i in range(segments)]
    return mesh(name,verts,faces,mat)


for name, size, center in [('Recessed wheel cavity',(10,26,26),(0,32,-35)),('Cable-free nose split',(10,34,18),(0,22,-65))]:
    cutter = box(name,size,center,gloss,1.4)
    bpy.context.view_layer.objects.active = chassis
    mod = chassis.modifiers.new(name,'BOOLEAN')
    mod.object = cutter
    mod.operation = 'DIFFERENCE'
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
box('Wheel well darkness', (9,1,24),(0,19.5,-35),gloss,1)
lathe('Wheel axle', [(-6,1),(6,1)], (0,25,-35),steel,32)
lathe('Metal scroll wheel', [(-4,0),(-4,7.8),(-3.5,9),(-2.8,9.3),(2.8,9.3),(3.5,9),(4,7.8),(4,0)], (0,25,-35),steel)
lathe('Wheel inset left', [(-4.06,2),(-4.06,6.6)], (0,25,-35),gloss)
lathe('Wheel inset right', [(4.06,2),(4.06,6.6)], (0,25,-35),gloss)
for i in range(24):
    a = math.tau*i/24
    obj = box('Wheel transverse knurl', (6.3,.65,1.15), (0,0,0),steel,.22)
    obj.location = (0,(25+9.25*math.cos(a))/1000,(-35+9.25*math.sin(a))/1000)
    obj.rotation_euler.x = a


def side_surface(y,z):
    fraction = max(.001,(y-7)/(height(z)-7))
    return -width(z)*math.sqrt(max(.001,1-fraction**(1/.43))) - .55


def side_patch(name, outline, mat, lift=.2, density=6):
    obj = patch(name,outline,mat,lift=lift,surface=lambda y,z: -side_surface(y,z),thickness=.4,density=density)
    for v in obj.data.vertices:
        v.co = (-v.co.y, v.co.x, v.co.z)
    return obj


side_patch('Rubber thumb grip', [(8,-27),(15,-27),(24,-10),(28,6),(29,24),(23,44),(12,50),(7,35)],rubber,.3,12)
side_patch('Forward thumb button G5', [(24,-20),(29,-15),(31,4),(26,5)],buttons,1.7)
side_patch('Back thumb button G4', [(27,8),(32,10),(32,27),(26,29)],buttons,1.6)
side_patch('Sniper paddle surround', [(14,-30),(21,-25),(15,-12),(10,-16)],gloss,2.5)
side_patch('DPI shift paddle', [(14,-28),(19,-24),(14,-14),(11,-17)],buttons,3)
for row in range(6):
    for column in range(14):
        z = -9 + column*3.4 + (row%2)*1.7
        y = 10 + row*2.5
        if z > 38-row*.6 or (z < 2 and y>20) or y > height(z)-10:
            continue
        side_patch('Molded triangular grip recess', [(y,z),(y+1.65,z+.85),(y,z+1.7)],grain,.36,1)

thumb_outline = [(-27,-30),(-32,-25),(-39,-12),(-42,8),(-39,29),(-32,44),(-24,47),(-28,20)]
patch('Swept thumb rest',thumb_outline,rubber,.2,surface=lambda x,z: 3.6+max(0,1-abs(x+28)/16)*3.4,thickness=2,density=8)
patch('Thumb rest polished edge', [(-39,-12),(-42,8),(-39,29),(-32,44),(-31,42),(-38,27),(-40,8),(-37,-12)],gloss,.3,surface=lambda x,z: 3.5,thickness=1,density=5)
for i in range(3):
    z = -3 + i*4.2
    patch('DPI status light', [(-23,z),(-17.5,z-1.9),(-17.5,z-.7),(-23,z+1.2)],cyan,1.3,thickness=.2,density=4)

logo_x, logo_z = -3, 32
arc = []
for i in range(33):
    a = math.radians(60 + 270*i/32)
    arc.append((logo_x+6.2*math.cos(a),logo_z-6.2*math.sin(a)))
for i in range(32,-1,-1):
    a = math.radians(60 + 270*i/32)
    arc.append((logo_x+3.8*math.cos(a),logo_z-3.8*math.sin(a)))
patch('Illuminated G arc',arc,cyan,1.09,thickness=.1,density=2)
patch('Illuminated G crossbar', [(logo_x,logo_z-.8),(logo_x+6.4,logo_z-.8),(logo_x+6.4,logo_z+5.3),(logo_x+4,logo_z+5.3),(logo_x+4,logo_z+1.4),(logo_x,logo_z+1.4)],cyan,1.1,thickness=.1,density=3)

font_path = '/System/Library/Fonts/Supplemental/Arial.ttf'
font = bpy.data.fonts.load(font_path) if Path(font_path).exists() else None


def label(text, x,z,size):
    curve = bpy.data.curves.new(text,'FONT')
    curve.body = text
    if font:
        curve.font = font
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.size = size/1000
    obj = bpy.data.objects.new(text,curve)
    asset.objects.link(obj)
    obj.parent = root
    curve.materials.append(mark)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    for v in obj.data.vertices:
        vx, vz = x+v.co.x*1000,z-v.co.y*1000
        v.co = (vx/1000,(top(vx,vz)+2.06)/1000,vz/1000)


label('G9',0,0,2.1)
label('G8',-26,-32,1.8)
label('G7',-24,-12,1.6)
for x in [-8,8]:
    z = -34
    patch('Wheel tilt arrow', [(x-.8,z-1),(x+.8,z),(x-.8,z+1)] if x>0 else [(x+.8,z-1),(x-.8,z),(x+.8,z+1)],mark,.95,thickness=0,density=2)
for z,w in [(-51,41),(47,35)]:
    box('PTFE glide pad',(w,1.3,9),(0,.65,z),feet,.6)
box('Thumb glide pad',(9,1.3,25),(-33,.65,7),feet,.6)
box('Optical sensor surround',(13,1,17),(0,1.1,2),gloss,2)
box('Sensor aperture',(5,.5,7),(0,.45,2),grain,.8)

parts = {obj.name: len(obj.data.polygons) for obj in root.children if obj.type == 'MESH'}
for mat in sorted({obj.data.materials[0] for obj in root.children if obj.type == 'MESH'},key=lambda m:m.name):
    objects = [obj for obj in root.children if obj.type=='MESH' and obj.data.materials[0]==mat]
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    objects[0].name = mat.name
bpy.context.view_layer.update()
meshes = [obj for obj in root.children if obj.type == 'MESH']
points = [obj.matrix_world @ Vector(v) for obj in meshes for v in obj.bound_box]
bounds = {'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
for obj in meshes:
    obj.data.calc_loop_triangles()
report = {'bounds':bounds,'triangles':sum(len(obj.data.loop_triangles) for obj in meshes),'draw_calls':len(meshes),'parts':parts}
assert abs(bounds['min'][1]) < 1e-7
bpy.ops.object.select_all(action='DESELECT')
for obj in asset.objects:
    obj.select_set(True)
destination = PROJECT / 'public/glbs/logitech-g502-hero.glb'
bpy.ops.export_scene.gltf(filepath=str(destination),export_format='GLB',use_selection=True,export_yup=False,export_apply=True,export_extras=True,export_cameras=False,export_lights=False)
report['bytes'] = destination.stat().st_size
(OUT / 'asset-report.json').write_text(json.dumps(report,indent=2)+'\n')


def aim(obj,target):
    z = (obj.location-Vector(target)).normalized()
    x = Vector((0,1,0)).cross(z).normalized()
    y = z.cross(x).normalized()
    obj.rotation_euler = Matrix((x,y,z)).transposed().to_euler()


bpy.ops.mesh.primitive_plane_add(size=200,location=(0,-.0003,0),rotation=(math.pi/2,0,0))
floor = bpy.context.object
floor.name = 'STUDIO floor'
floor.data.materials.append(material('STUDIO warm grey',(.18,.17,.155),.85))
for loc,power,size in [((-.14,.22,-.12),3,.19),((.15,.18,.03),2,.13),((-.04,.14,.17),3,.11)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    light = bpy.context.object
    light.data.energy = power * .28
    light.data.shape = 'DISK'
    light.data.size = size
    aim(light,(0,.02,0))
bpy.ops.object.camera_add(location=(-.17,.18,-.22))
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = .19
scene.camera = camera
scene.world.color = (.13,.13,.13)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
aim(camera,(0,.016,0))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'logitech-g502-hero.blend'))
if not args.no_render:
    for name,loc in [('preview',(-.17,.18,-.22)),('top',(0,.32,.0001)),('side',(-.25,.075,-.06))]:
        camera.location = loc
        aim(camera,(0,.016,0))
        scene.render.filepath = str(OUT / (name+'.png'))
        bpy.ops.render.render(write_still=True)
print(json.dumps({k:v for k,v in report.items() if k!='parts'},indent=2))
