import argparse
import bpy
import bmesh
import json
import math
import sys
from pathlib import Path
from mathutils import Matrix, Vector

OUT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--blockout', action='store_true')
parser.add_argument('--no-render', action='store_true')
parser.add_argument('--cover-angle', type=float, default=65)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
W, D, H = .3595, .3733, .0975
TOP = .048
PLATTER = (-.015, -.009)
HINGE = (0, .051, -.179)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
asset = bpy.data.collections.new('AT-LP60X | export')
scene.collection.children.link(asset)
root = bpy.data.objects.new('Turntable_ROOT', None)
asset.objects.link(root)
root['product'] = 'Audio-Technica AT-LP60X black, non-Bluetooth'
root['closed_dimensions_m'] = [W, H, D]
root['coordinates'] = 'meters; X right, Y up, +Z front; bottom contact plane Y=0'


def material(name, color, roughness, metal=0, alpha=1):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Alpha'].default_value = alpha
    bsdf.inputs['Specular IOR Level'].default_value = .32
    mat.diffuse_color = (*color, alpha)
    if alpha < 1:
        mat.surface_render_method = 'BLENDED'
        mat.use_transparency_overlap = False
    return mat


plastic = material('AT | satin black chassis', (.012, .014, .016), .43)
dark = material('AT | dark controls and cartridge', (.006, .007, .008), .39)
felt = material('AT | black felt mat', (.008, .009, .010), .92)
metal = material('AT | machined silver', (.56, .59, .62), .27, .85)
rubber = material('AT | isolation rubber', (.007, .008, .009), .8)
white = material('AT | ivory stylus housing', (.67, .69, .67), .44)
acrylic = material('AT | clear gray acrylic', (.24, .27, .29), .10, 0, .065)
acrylic.node_tree.nodes.get('Principled BSDF').inputs['IOR'].default_value = 1.49
acrylic.use_backface_culling = True


def object_mesh(name, verts, faces, mat, parent=root):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00000001)
    bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=.000000001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    asset.objects.link(ob)
    ob.parent = parent
    mesh.materials.append(mat)
    return ob


def weighted(ob):
    for p in ob.data.polygons:
        p.use_smooth = True
    mod = ob.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


def bevel(ob, width=.001, segments=3):
    mod = ob.modifiers.new('Edge radius', 'BEVEL')
    mod.width = width
    mod.segments = segments
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return weighted(ob)


def box(name, size, center, mat=dark, radius=.001, parent=root):
    x, y, z = [n / 2 for n in size]
    verts = [(a*x, b*y, c*z) for a, b, c in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    ob = object_mesh(name, verts, [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)], mat, parent)
    ob.location = center
    return bevel(ob, radius, 4) if radius else ob


def outline(w, d, r, steps=16):
    return [(cx+r*math.cos(math.radians(a+i*90/steps)), cz+r*math.sin(math.radians(a+i*90/steps)))
            for cx,cz,a in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]
            for i in range(steps)]


def loft(name, profiles, mat, center=(0,0,0), caps=True, parent=root):
    verts = [(x,y,z) for w,d,r,y in profiles for x,z in outline(w,d,r)]
    n = 64
    faces = [(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profiles)-1) for i in range(n)]
    if caps:
        faces += [tuple(reversed(range(n))),tuple(range(len(verts)-n,len(verts)))]
    ob = object_mesh(name, verts, faces, mat, parent)
    ob.location = center
    return weighted(ob)


def lathe(name, profile, center, mat=dark, segments=128, axis='Y', parent=root):
    verts = []
    for r,h in profile:
        for i in range(segments):
            t = i * math.tau / segments
            p = (r*math.cos(t), h, r*math.sin(t))
            verts.append(p if axis == 'Y' else ((p[0],p[2],p[1]) if axis == 'Z' else (p[1],p[0],p[2])))
    faces = [(j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i) for j in range(len(profile)-1) for i in range(segments)]
    ob = object_mesh(name, verts, faces, mat, parent)
    ob.location = center
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def cylinder(name, radius, length, center, mat=dark, axis='Y', segments=64, parent=root):
    return lathe(name, [(0,-length/2),(radius-.0003,-length/2),(radius,-length/2+.0003),(radius,length/2-.0003),(radius-.0003,length/2),(0,length/2)], center, mat, segments, axis, parent)


def tube(name, points, radius, mat=metal, parent=root):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 4
    curve.resolution_u = 16
    curve.use_fill_caps = True
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for p, co in zip(spline.bezier_points, points):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    ob = bpy.data.objects.new(name, curve)
    asset.objects.link(ob)
    ob.parent = parent
    ob.data.materials.append(mat)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob.select_set(False)
    return ob


def difference(ob, cutter):
    mod = ob.modifiers.new('Recess', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


loft('Chassis_Underside', [(.326,.332,.014,.012),(.343,.350,.010,.020),(.347,.356,.008,.025)], dark)
body = loft('Chassis_UpperShell', [(W-.003,.363,.005,.019),(W,.367,.0045,.023),(W,.367,.0045,.0455),(W-.001,.366,.004,.048)], plastic)
fascia = loft('Chassis_RoundedFrontFascia', [(W-.009,.017,.004,.0145),(W-.003,.022,.0045,.017),(W,.0233,.005,.022),(W,.0233,.005,.037),(W-.001,.022,.0045,.043),(W-.003,.019,.004,.047)], plastic, (0,0,.175))
for x in [-.140,.140]:
    for z in [-.140,.143]:
        lathe(f'Foot_{"Left" if x<0 else "Right"}_{"Rear" if z<0 else "Front"}', [(0,0),(.019,0),(.021,.002),(.022,.011),(.022,.014),(0,.014)], (x,0,z), rubber, 96)

cx,cz = PLATTER
lathe('Platter_LowerRim', [(0,0),(.143,0),(.148,.001),(.149,.003),(.149,.005),(0,.005)], (cx,.0485,cz), dark, 256)
lathe('Platter_Aluminum', [(0,0),(.1486,0),(.150,.0008),(.150,.0070),(.1495,.008),(.1485,.0085),(0,.0085)], (cx,.052,cz), metal, 320)
lathe('Platter_FeltMat', [(0,0),(.1485,0),(.149,.0005),(.149,.0017),(.1485,.0023),(0,.0023)], (cx,.0605,cz), felt, 256)
cylinder('Platter_CenterSpindle', .0035,.012,(cx,.069,cz),metal)

adapter_center = (-.139,.048,-.149)
if not args.blockout:
    difference(body, cylinder('Adapter_Recess_Cutter',.020,.019,(-.139,.049,-.149),dark))
lathe('Adapter_StorageWell', [(.0197,.0002),(.0197,-.010),(0,-.010)], adapter_center, dark, 96)
lathe('Adapter_45RPM', [(.004,-.003),(.017,-.003),(.018,-.002),(.018,0),(.015,.001),(.010,.001),(.010,.003),(.009,.004),(.004,.004),(.004,-.003)], (-.139,.046,-.149), dark, 128)

base_plate = lathe('Tonearm_BasePlate', [(0,0),(.025,0),(.028,.001),(.028,.003),(.025,.005),(0,.005)], (.128,.048,-.124),plastic,128)
base_plate.data.transform(Matrix.Diagonal((1,1,1.45,1)))
cylinder('Tonearm_PivotPedestal',.020,.014,(.128,.059,-.135),dark,segments=96)
box('Tonearm_PivotHousing',(.033,.021,.027),(.128,.075,-.135),dark,.003)
cylinder('Tonearm_PivotSideCap',.012,.005,(.109,.075,-.135),dark,'X',96)
box('Tonearm_PivotTop',(.024,.003,.013),(.134,.087,-.140),plastic,.0008)
arm = bpy.data.objects.new('Tonearm_Pivot', None)
asset.objects.link(arm)
arm.parent = root
arm.location = (.139,.073,-.123)
tube('Tonearm_SilverTube',[(0,0,0),(.001,0,.078),(.002,-.001,.146),(-.003,-.004,.159)],.0027,metal,arm)
box('Tonearm_Headshell',(.013,.010,.026),(-.003,-.004,.175),dark,.0012,arm)
box('Tonearm_Cartridge_AT3600L',(.011,.008,.015),(-.003,-.012,.179),dark,.0006,arm)
box('Tonearm_StylusHousing',(.011,.005,.007),(-.003,-.0155,.187),white,.0007,arm)
box('Tonearm_RestPost',(.008,.021,.010),(.142,.059,.018),dark,.0008)
box('Tonearm_RestCradle',(.014,.004,.012),(.142,.071,.018),dark,.0008)
if not args.blockout:
    tube('Tonearm_FingerLift',[(.002,-.001,.173),(.015,-.003,.174),(.019,0,.176)],.001, dark, arm)
    box('Tonearm_RestClip',(.002,.011,.004),(.148,.078,.019),dark,.0004)
    tube('Tonearm_StylusCantilever',[(-.003,-.018,.185),(-.003,-.020,.189)],.00035,metal,arm)
    cylinder('Tonearm_StylusTip',.00035,.0006,(-.003,-.0203,.189),metal,parent=arm,segments=16)

for name,x in [('Speed',-.140),('Start',.087),('Stop',.117),('Lift',.147)]:
    if not args.blockout:
        difference(fascia,cylinder('Control_Cutter',.009,.021,(x,.028,.187),dark,'Z',96))
        difference(body,cylinder('Control_Cutter',.009,.021,(x,.028,.187),dark,'Z',96))
    lathe(f'Control_{name}_Recess',[(.0095,0),(.009,-.0007),(.0073,-.003),(0,-.003)],(x,.028,.1865),dark,96,'Z')
    cylinder(f'Control_{name}_Button',.0069,.004,(x,.028,.183),plastic,'Z',96)
box('Control_RecordSize_Recess',(.025,.001,.006),(.135,.0484,.133),dark,.001)
box('Control_RecordSize_Lever',(.021,.006,.003),(.133,.0515,.133),dark,.0005)
for shell in [body,fascia]:
    for polygon in shell.data.polygons:
        polygon.use_smooth = False
    shell.data.normals_split_custom_set([(0,0,0)]*len(shell.data.loops))

cover_pivot = bpy.data.objects.new('DustCover_HingePivot',None)
asset.objects.link(cover_pivot)
cover_pivot.parent = root
cover_pivot.location = HINGE
cover_pivot.rotation_euler.x = -math.radians(args.cover_angle)
cover_pivot['open_angle_degrees'] = args.cover_angle
cover_pivot['closed_rotation_x'] = 0.0
cover_pivot['hinge_axis'] = 'local X; negative rotation opens cover'
cover = loft('DustCover_AcrylicShell',[(.355,.344,.003,0),(.355,.344,.003,.0435),(.354,.343,.003,.0465),(.350,.339,.002,.0465)],acrylic,(0,0,.172),False,cover_pivot)
inner = loft('DustCover_InnerShell',[(.351,.340,.001,0),(.351,.340,.001,.0425),(.350,.339,.001,.0445)],acrylic,(0,0,.172),False,cover_pivot)
bpy.ops.object.select_all(action='DESELECT')
cover.select_set(True)
inner.select_set(True)
bpy.context.view_layer.objects.active = cover
bpy.ops.object.join()
bm = bmesh.new()
bm.from_mesh(cover.data)
boundary = [e for e in bm.edges if e.is_boundary]
top_edges = [e for e in boundary if all(v.co.y>.04 for v in e.verts)]
bottom_edges = [e for e in boundary if all(v.co.y<.001 for v in e.verts)]
bmesh.ops.holes_fill(bm,edges=top_edges,sides=0)
bmesh.ops.bridge_loops(bm,edges=bottom_edges)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(cover.data)
bm.free()
for polygon in cover.data.polygons:
    polygon.use_smooth = False
for x,side in [(-.122,'Left'),(.122,'Right')]:
    box(f'Hinge_{side}_ChassisSocket',(.029,.012,.010),(x,.051,-.18165),dark,.001)
    cylinder(f'Hinge_{side}_Axle',.004,.030,(x,.055,-.178),metal,'X',64)
    box(f'Hinge_{side}_MovingBlock',(.027,.016,.007),(x,.009,.005),dark,.0008,cover_pivot)
    box(f'Hinge_{side}_CoverBracket',(.031,.018,.002),(x,.013,.009),acrylic,.0005,cover_pivot)
    if not args.blockout:
        for dx in [-.017,.017]:
            cylinder(f'Hinge_{side}_Pin_{dx}',.0025,.001,(x+dx,.055,-.178),metal,'X',32)
for x in [-.171,.171]:
    box(f'DustCover_Bumper_{x}',(.004,.006,.006),(x,.004,.336),rubber,.001,cover_pivot)

if not args.blockout:
    atlas = material('AT | single printed marking atlas', (1,1,1), .65)
    tex = atlas.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(OUT/'markings.png'))
    tex.image.pack()
    bsdf = atlas.node_tree.nodes.get('Principled BSDF')
    atlas.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    cutoff = atlas.node_tree.nodes.new('ShaderNodeMath')
    cutoff.operation = 'GREATER_THAN'
    cutoff.inputs[1].default_value = .4
    atlas.node_tree.links.new(tex.outputs['Alpha'],cutoff.inputs[0])
    atlas.node_tree.links.new(cutoff.outputs[0],bsdf.inputs['Alpha'])
    atlas.surface_render_method = 'DITHERED'
    rects = json.loads((OUT/'marking-rects.json').read_text())

    def decal(name, key, width, center, face='top', parent=root):
        u,v,w,h = rects[key]
        height = width*h/w
        verts = [(-width/2,0,height/2),(width/2,0,height/2),(width/2,0,-height/2),(-width/2,0,-height/2)]
        if face == 'front':
            verts = [(x,-z,y) for x,y,z in verts]
        ob = object_mesh(name,verts,[(0,1,2,3)],atlas,parent)
        ob.location = center
        uv = ob.data.uv_layers.new(name='Markings')
        coords = [(u/1024,1-(v+h)/512),((u+w)/1024,1-(v+h)/512),((u+w)/1024,1-v/512),(u/1024,1-v/512)]
        for p in ob.data.polygons:
            for loop in p.loop_indices:
                uv.data[loop].uv = coords[ob.data.loops[loop].vertex_index]
        return ob

    decal('Print_MatBrand','brand',.094,(-.059,.06285,-.045))
    decal('Print_FrontBrand','brand',.048,(0,.030,.18669),'front')
    decal('Print_Model','model',.017,(0,.0225,.18669),'front')
    for name,x,key,width in [('Speed',-.140,'speed',.010),('Start',.087,'start',.007),('Stop',.117,'stop',.006),('Lift',.147,'lift',.010)]:
        decal('Print_'+name,key,width,(x,.04813,.174))
    decal('Print_RecordSize','size',.007,(.155,.04812,.132))
    decal('Print_StylusBrand','logo',.004,(-.003,-.015,.1906),'front',arm)

bpy.context.view_layer.update()
meshes = [o for o in asset.objects if o.type=='MESH']
def bounds():
    bpy.context.view_layer.update()
    points = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
    return {'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
open_bounds = bounds()
cover_pivot.rotation_euler.x = 0
closed_bounds = bounds()
cover_pivot.rotation_euler.x = -math.radians(args.cover_angle)
report = {'product':root['product'],'units':'meters','axis':'X right, Y up, +Z front','closed_bounds_m':closed_bounds,'open_bounds_m':open_bounds,'cover_angle_degrees':args.cover_angle,'mesh_objects':len(meshes),'materials':len({m for o in meshes for m in o.data.materials})}
(OUT/('blockout-measurements.json' if args.blockout else 'model-measurements.json')).write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.object.select_all(action='DESELECT')
for ob in asset.objects:
    ob.select_set(True)
stem = 'blockout' if args.blockout else 'turntable'
bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),export_format='GLB',use_selection=True,export_yup=False,export_apply=True,export_extras=True,export_cameras=False,export_lights=False)

studio = bpy.data.collections.new('STUDIO | excluded from GLB')
scene.collection.children.link(studio)
def studio_move(ob):
    for coll in list(ob.users_collection):
        coll.objects.unlink(ob)
    studio.objects.link(ob)
def aim(ob,target):
    z = (ob.location-Vector(target)).normalized()
    x = Vector((0,1,0)).cross(z).normalized()
    y = z.cross(x).normalized()
    ob.rotation_euler = Matrix((x,y,z)).transposed().to_euler()

bpy.ops.mesh.primitive_plane_add(size=200,location=(0,-.0003,0),rotation=(math.pi/2,0,0))
floor = bpy.context.object
floor.name = 'Studio_Ground'
floor.data.materials.append(material('STUDIO | neutral',(.19,.20,.21),.8))
studio_move(floor)
for name,loc,power,size in [('Key',(-.4,.7,.35),16,.65),('Rim',(.4,.6,-.35),18,.5),('Fill',(.4,.25,.5),5,.5)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    light = bpy.context.object
    light.name = 'Studio_'+name
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = size
    aim(light,(0,.05,0))
    studio_move(light)
bpy.ops.object.camera_add(location=(.46,.53,.70))
camera = bpy.context.object
camera.name = 'Studio_Camera'
camera.data.type = 'ORTHO'
camera.data.ortho_scale = .64
aim(camera,(0,.16,0))
studio_move(camera)
scene.camera = camera
scene.world.color = (.12,.12,.12)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24 if args.blockout else 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 1300
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 75 if args.blockout else 100
scene.view_settings.view_transform = 'AgX'
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_rotation = camera.rotation_euler.to_quaternion()
        area.spaces.active.region_3d.view_distance = .75
        area.spaces.active.region_3d.view_location = (0,.12,0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
if not args.no_render:
    for name,loc,target,scale in [('front-three-quarter',(.46,.53,.70),(0,.18,0),.72),('near-top',(0,.95,.24),(0,.09,0),.60),('side',(.8,.27,.50),(0,.17,0),.70)]:
        camera.location = loc
        aim(camera,target)
        camera.data.ortho_scale = scale
        scene.render.filepath = str(OUT/f'{"blockout-" if args.blockout else ""}{name}.png')
        bpy.ops.render.render(write_still=True)
print(json.dumps(report,indent=2))
