import bpy
import math
import json
from pathlib import Path
from mathutils import Vector, Matrix

OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in list(bpy.data.materials):
    bpy.data.materials.remove(block)

def material(name, color, roughness, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    return m

plastic = material('Graphite | molded enclosure', (.055, .061, .067), .38)
black = material('Carbon | bezel and rubber', (.009, .012, .015), .29)
glass = material('Smoked CRT glass', (.012, .023, .028), .115, .12)
glass.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value = .5
accent = material('Satin hardware', (.31, .33, .32), .3, .55)

def finish(o, name, mat, bevel=0, segments=4):
    o.name = name
    o.data.materials.append(mat)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if bevel:
        mod = o.modifiers.new('Edge radii', 'BEVEL')
        mod.width = bevel
        mod.segments = segments
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:
        p.use_smooth = True
    mod = o.modifiers.new('Face weighted normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    mod.weight = 40
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def box(name, loc, size, mat, bevel=.002, segments=4):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.dimensions = size
    return finish(o, name, mat, bevel, segments)

def mesh(name, vertices, faces, mat):
    m = bpy.data.meshes.new(name)
    m.from_pydata(vertices, [], faces)
    m.update()
    o = bpy.data.objects.new(name, m)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat)
    for p in m.polygons:
        p.use_smooth = True
    return o

def outline(w, h, r, y=0, n=32):
    pts = []
    for cx, cy, start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for i in range(n):
            a = math.radians(start + 90*i/(n-1))
            pts.append((cx+r*math.cos(a), cy+r*math.sin(a)+y))
    return pts

def loft(name, profiles, mat, cap=False):
    v = [(x,y,z) for w,h,r,cy,z in profiles for x,y in outline(w,h,r,cy)]
    n = 128
    f = []
    for j in range(len(profiles)-1):
        for i in range(n):
            a=j*n+i; b=j*n+(i+1)%n
            f.append((a,b,b+n,a+n))
    if cap:
        f.extend([tuple(reversed(range(n))), tuple(range(len(v)-n,len(v)))])
    o = mesh(name,v,f,mat)
    bpy.context.view_layer.objects.active=o
    mod=o.modifiers.new('Surface normals','WEIGHTED_NORMAL')
    mod.weight=50
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

loft('CRT_Housing', [(.446,.434,.014,-.017,-.346),(.454,.440,.016,-.017,-.338),(.460,.442,.018,-.017,-.115),(.460,.442,.018,-.017,.031),(.459,.441,.017,-.017,.039),(.453,.435,.014,-.017,.043),(.416,.312,.008,0,.043),(.412,.308,.007,0,.039),(.412,.308,.007,0,.025)],plastic)
loft('CRT_Bezel',[ (.412,.308,.007,0,.036),(.409,.305,.007,0,.038),(.403,.299,.004,0,.034),(.376,.279,.004,0,-.013),(.365,.274,.004,0,-.022),(.361,.270,.004,0,-.026)],black)
box('CRT_RearCasing', (0,-.017,-.344),(.445,.431,.030),plastic,.011,8)
loft('CRT_CasingSeam',[(.4603,.4423,.018,-.017,-.115),(.4603,.4423,.018,-.017,-.113)],black)

def crown(x,y):
    return -.010*(x/.176)**2-.009*(y/.132)**2

nx,ny=96,72
v=[]
for j in range(ny+1):
    y=(j/ny-.5)*.264
    for i in range(nx+1):
        x=(i/nx-.5)*.352
        v.append((x,y,crown(x,y)))
f=[]
for j in range(ny):
    for i in range(nx):
        a=j*(nx+1)+i
        f.append((a,a+1,a+nx+2,a+nx+1))
screen=mesh('CRT_Screen',v,f,glass)
uv=screen.data.uv_layers.new(name='ScreenUV')
for p in screen.data.polygons:
    for li in p.loop_indices:
        co=screen.data.vertices[screen.data.loops[li].vertex_index].co
        uv.data[li].uv=(co.x/.352+.5,co.y/.264+.5)
screen['interface_plane_z_m']=.003
screen['interface_width_m']=.352
screen['interface_height_m']=.264
screen['front_axis']='+Z'

v=[]
for k in range(17):
    t=k/16
    for x,y in outline(.352+.012*t,.264+.010*t,.0002+.003*t,n=32):
        v.append((x,y,crown(x,y)-.004*t))
f=[]
for k in range(16):
    for i in range(128):
        a=k*128+i;b=k*128+(i+1)%128
        f.append((a,a+128,b+128,b))
mesh('CRT_Glass',v,f,glass)

box('CRT_ControlPanel', (0,-.202,.039),(.411,.053,.010),plastic,.003,6)
box('CRT_ControlPanel_Reveal',(0,-.202,.032),(.420,.060,.010),black,.004,6)
for col in range(3):
    for row in range(2):
        x=-.178+col*.023;y=-.191-row*.021
        box('CRT_Buttons_Socket', (x,y,.046),(.016,.015,.004),black,.002,4)
        box('CRT_Buttons', (x,y,.050),(.012,.012,.009),accent,.0016,5)

def cylinder(name,x,y,z,r,depth,mat,vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=r, depth=depth, location=(x,y,z))
    return finish(bpy.context.object,name,mat,.0008,2)

for k in range(5):
    x=-.041+k*.031
    cylinder('CRT_Knobs_Collar',x,-.202,.047,.0115,.006,black)
    cylinder('CRT_Knobs',x,-.202,.057,.009,.021,black,96)
    cylinder('CRT_Knobs_Cap',x,-.202,.068,.0077,.0017,plastic)
    box('CRT_Knobs_Index',(x,-.197,.0695),(.0009,.003,.0006),accent,.00025,3)
    for tick in range(9):
        a=math.radians(30+tick*15)
        box('CRT_ControlTicks',(x+.014*math.cos(a),-.202+.014*math.sin(a),.045),(.0007,.0012,.0006),accent,0)
for x in [-.103,-.085]:
    for y in [-.187,-.202,-.217]:
        cylinder('CRT_TrimSocket',x,y,.046,.0048,.003,black,32)
        cylinder('CRT_TrimInsert',x,y,.047,.0025,.002,plastic,32)
box('CRT_PowerSocket',(.179,-.202,.046),(.020,.022,.005),black,.002,4)
box('CRT_Buttons_Power',(.179,-.201,.051),(.015,.017,.010),accent,.0015,5)
cylinder('CRT_StatusRing',.153,-.201,.046,.0038,.002,black,48)
cylinder('CRT_StatusLight',.153,-.201,.048,.0025,.002,accent,48)
box('CRT_StatusDisplay_Bezel',(0,.177,.044),(.050,.032,.005),black,.002,5)
box('CRT_StatusDisplay',(0,.177,.046),(.043,.025,.002),accent,.001,5)

def tube(name, points, radius, mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=16
    c.bevel_depth=radius;c.bevel_resolution=6
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for b,p in zip(s.bezier_points,points):
        b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    bpy.ops.object.convert(target='MESH');o.data.materials.append(mat)
    o.select_set(False)
    for p in o.data.polygons:p.use_smooth=True
    return o

bpy.ops.object.select_all(action='DESELECT')
for x in [-.217,.217]:
    for y in [-.170,-.221]:
        cylinder('CRT_Handles_Mount',x,y,.045,.008,.006,black,48)
    tube('CRT_Handles',[(x,-.170,.046),(x,-.178,.071),(x,-.190,.076),(x,-.214,.075),(x,-.224,.062),(x,-.221,.045)],.0045,black)

for side in [-1,1]:
    box('CRT_Vents_Inset',(side*.230,-.015,-.221),(.001,.206,.154),black,.0004,2)
    for j in range(19):
        box('CRT_Vents',(side*.231,-.108+j*.0104,-.221),(.003,.0062,.157),plastic,.0012,2)
    for y in [-.140,.115]:
        for z in [-.290,-.148]:
            o=cylinder('CRT_CaseFasteners',0,0,0,.003,.0015,accent,24)
            o.rotation_euler.y=math.pi/2;o.location=(side*.232,y,z)
            bpy.context.view_layer.objects.active=o
            bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)

box('CRT_RearServicePanel',(0,-.085,-.361),(.274,.140,.007),black,.004,5)
for x in [-.106,-.074,-.042,-.010,.022,.054]:
    cylinder('CRT_RearConnectors',x,-.06,-.369,.0055,.01,accent,32)
    cylinder('CRT_RearConnectorCore',x,-.06,-.375,.0033,.002,black,24)
box('CRT_RearPowerInlet',(.095,-.115,-.367),(.028,.022,.006),plastic,.002,4)
for i in range(13):
    box('CRT_RearVents',(0,.015+i*.009,-.360),(.265,.004,.002),black,.001,3)
for x in [-.176,.176]:
    for z in [-.280,-.025]:
        box('CRT_Stand',(x,-.247,z),(.065,.018,.061),black,.005,6)

exec(compile((OUT/'refine_bvm.py').read_text(),str(OUT/'refine_bvm.py'),'exec'))

groups=sorted(set(o.name.split('.')[0] for o in bpy.context.scene.objects if o.type=='MESH'))
for prefix in groups:
    obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and (o.name==prefix or o.name.startswith(prefix+'.'))]
    if len(obs)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in obs:o.select_set(True)
        bpy.context.view_layer.objects.active=obs[0]
        bpy.ops.object.join();obs[0].name=prefix

asset=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in asset:
    bpy.context.view_layer.objects.active=o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    o.select_set(False)
    o.data.calc_loop_triangles()
stats={'triangles':sum(len(o.data.loop_triangles) for o in asset),'objects':len(asset),'materials':4,'screen':{'width':.352,'height':.264,'planeZ':.003,'glassCrownZ':0,'axis':'+Z'},'object_triangles':{o.name:len(o.data.loop_triangles) for o in asset}}
(OUT/'asset-report.json').write_text(json.dumps(stats,indent=2))
for o in asset:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'crt-monitor.glb'),export_format='GLB',use_selection=True,export_yup=False,export_apply=True,export_extras=True,export_cameras=False,export_lights=False)
bpy.ops.object.select_all(action='DESELECT')

scene=bpy.context.scene
bpy.context.preferences.filepaths.save_version=0
scene.unit_settings.system='METRIC'
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.world.color=(.18,.18,.18)
scene.render.resolution_x=1600;scene.render.resolution_y=1600;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
studio=bpy.data.collections.new('STUDIO | excluded from GLB');scene.collection.children.link(studio)
def studio_move(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    studio.objects.link(o)
def aim(o,target):
    z=(o.location-Vector(target)).normalized()
    x=Vector((0,1,0)).cross(z).normalized()
    y=z.cross(x).normalized()
    o.rotation_euler=Matrix((x,y,z)).transposed().to_euler()
for name,loc,power,size in [('Key',(-.65,.95,.8),70,.65),('Rim',(.65,.6,-.55),95,.55),('Fill',(.8,.2,.9),30,.5)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,-.1));studio_move(o)
bpy.ops.object.camera_add(location=(.73,.42,1.12))
cam=bpy.context.object;cam.name='Camera_ThreeQuarter';aim(cam,(0,-.02,-.13));cam.data.type='ORTHO';cam.data.ortho_scale=.78;scene.camera=cam;studio_move(cam)
scene.render.film_transparent=True
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
        area.spaces.active.region_3d.view_distance=.9
        area.spaces.active.region_3d.view_location=(0,0,-.12)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'crt-monitor.blend'))
scene.render.filepath=str(OUT/'preview.png');bpy.ops.render.render(write_still=True)
cam.location=(0,-.005,1.4);aim(cam,(0,-.02,0));cam.data.ortho_scale=.58
scene.render.filepath=str(OUT/'front.png');bpy.ops.render.render(write_still=True)
print(json.dumps(stats))
