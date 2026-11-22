import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
GLB = ROOT.parents[1] / "public/glbs/dt-990-pro.glb"
MM = 0.001
TAU = math.tau
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.render.fps = 24


def finish(name, color, roughness, metallic=0, sheen=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    for key, value in [("Base Color", (*color, 1)), ("Roughness", roughness),
                       ("Metallic", metallic), ("Sheen Weight", sheen)]:
        shader.inputs[key].default_value = value
    return mat


housing = finish("Black satin ABS", (.025, .027, .029), .41)
velour = finish("Anthracite velour", (.057, .055, .055), .95, sheen=.26)
leather = finish("Soft black headband wrap", (.026, .024, .024), .62, sheen=.13)
steel = finish("Powder coated spring steel", (.045, .047, .049), .35, .62)
scrim = finish("Woven acoustic screen", (.22, .225, .22), .68, .36)
rubber = finish("Rubber and acoustic recess", (.012, .013, .014), .78)
ink = finish("Warm grey print", (.74, .73, .69), .52)
stand = finish("Graphite anodized aluminium", (.095, .099, .108), .38, .72)
nickel = finish("Nickel contacts", (.53, .51, .44), .26, .92)


weave = bpy.data.images.new("Grille acoustic mesh", width=32, height=32, alpha=False)
pixels = []
for row in range(32):
    for col in range(32):
        warp = math.cos(TAU*(col+row)/32)
        weft = math.cos(TAU*(col-row)/32)
        thread = max(warp, weft)
        brightness = .16 + .48 * max(0, min(1, (thread-.26)*1.65))
        pixels.extend((brightness,brightness,brightness,1))
weave.pixels[:] = pixels
weave.pack()
weave_node = scrim.node_tree.nodes.new("ShaderNodeTexImage")
weave_node.image = weave
scrim.node_tree.links.new(weave_node.outputs["Color"], scrim.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])


def collection(name):
    group = bpy.data.collections.new(name)
    scene.collection.children.link(group)
    return group


band_group = collection("Headband and adjusters")
stand_group = collection("Headphone stand")
wire_group = collection("Single sided lead")


def mesh(name, verts, faces, material, group, smooth=False, bevel=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata([tuple(v * MM for v in point) for point in verts], [], faces)
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(data)
    bm.free()
    for face in data.polygons:
        face.use_smooth = smooth
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new("Rolled edges", "BEVEL")
        mod.width = bevel * MM
        mod.segments = 2
        mod.harden_normals = True
        obj.modifiers.new("Face normals", "WEIGHTED_NORMAL")
    return obj


def loft(name, rings, mat, group, closed=False, smooth=True):
    n = len(rings[0])
    faces = []
    for j in range(len(rings) if closed else len(rings) - 1):
        k = (j + 1) % len(rings)
        for i in range(n):
            h = (i + 1) % n
            faces.append((j*n+i, j*n+h, k*n+h, k*n+i))
    if not closed:
        faces += [tuple(reversed(range(n))), tuple(range((len(rings)-1)*n, len(rings)*n))]
    return mesh(name, [p for ring in rings for p in ring], faces, mat, group, smooth)


def tube(name, points, radius, material, group, sides=8):
    rings = []
    normal = None
    pts = list(map(Vector, points))
    for i, p in enumerate(pts):
        tangent = (pts[min(i+1,len(pts)-1)] - pts[max(i-1,0)]).normalized()
        if normal is None:
            normal = tangent.orthogonal().normalized()
        normal = (normal - tangent * tangent.dot(normal)).normalized()
        cross = tangent.cross(normal)
        rings.append([p + radius*(normal*math.cos(TAU*j/sides)+cross*math.sin(TAU*j/sides)) for j in range(sides)])
    return loft(name, rings, material, group)


def bezier(a,b,c,d,steps=16):
    a,b,c,d = map(Vector,(a,b,c,d))
    return [(1-t)**3*a + 3*t*(1-t)**2*b + 3*(1-t)*t*t*c + t**3*d for t in [i/steps for i in range(steps+1)]]


def rounded_rect(w,h,r):
    points = []
    for x,y,start in [(1,1,0),(-1,1,90),(-1,-1,180),(1,-1,270)]:
        for i in range(5):
            a=math.radians(start+90*i/4)
            points.append((x*(w/2-r)+r*math.cos(a), y*(h/2-r)+r*math.sin(a)))
    return points


def plate(name, outline, at, lo, hi, mat, group, bevel=0):
    n = len(outline)
    vertices = [at(u,v,d) for d in (lo,hi) for u,v in outline]
    faces = [tuple(range(n)), tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name, vertices, faces, mat, group, bevel=bevel)


def side_text(name, text, loc, side, size, group, material=ink):
    font = bpy.data.curves.new(name, "FONT")
    font.body = text
    font.size = size * MM
    font.align_x = "CENTER"
    font.align_y = "CENTER"
    font.space_character = 1.08
    font.resolution_u = 3
    obj = bpy.data.objects.new(name, font)
    group.objects.link(obj)
    obj.matrix_world = Matrix(((0,0,side,loc[0]*MM),(side,0,0,loc[1]*MM),
                               (0,1,0,loc[2]*MM),(0,0,0,1)))
    font.materials.append(material)


def arch(name, rx, rz, base, width, thickness, material, group):
    rings = []
    section = rounded_rect(width, thickness, min(2.6,thickness*.42))
    for i in range(49):
        a = math.pi*i/48
        cu, su = math.cos(a), math.sin(a)
        normal = Vector((rz*cu, 0, rx*su)).normalized()
        center = Vector((rx*cu,0,base+rz*su))
        rings.append([center + Vector((0,w,0)) + normal*h for w,h in section])
    return loft(name, rings, material, group)


arch("Spring band",80,67,178,22,2.6,steel,band_group)
arch("Replaceable padded headband",80,67,178,31,7.6,leather,band_group)
for y in [-13,13]:
    tube("Edge welt",[(82*math.cos(a),y,178+70*math.sin(a)) for a in [math.pi*i/42 for i in range(43)]],.65,housing,band_group,6)

for side, letter in [(-1,"L"), (1,"R")]:
    group=collection(letter + " open back earcup")
    def at(u,v,d):
        return (side*(78+d), side*u, 92+v)

    def radial(name, profile, mat, closed=False, detail=64):
        return loft(name, [[at(r*math.cos(a), r*1.035*math.sin(a), d)
                            for a in [TAU*i/detail for i in range(detail)]]
                           for d,r in profile], mat, group, closed)

    radial("Driver enclosure", [(-9,39),(-7,46),(-3,49),(4,48.5),(9,45),(12,41)], housing)
    radial("Cup perimeter bead",[(8,44),(8,46.8),(10.8,46.4),(12.4,44)],steel,True)
    radial("Velour cushion", [(-6,42),(-8,47),(-13,49),(-19,48),(-24,44),(-26,39),
                             (-26,33),(-24,29),(-20,27.5),(-14,28),(-9,30.5)],velour,True)
    radial("Inner foam disc",[(-12,29),(-14,27)],rubber)
    backing = radial("Open acoustic backing",[(10.6,42.7),(11.4,42.4)],scrim)
    uv = backing.data.uv_layers.new(name="Woven grille")
    for loop in backing.data.loops:
        pt = backing.data.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (pt.y/.0028, pt.z/.0028)

    for i in range(-9,10):
        v=i*4.3
        if abs(v)<6.3: continue
        w=2*math.sqrt(42.5**2-(v/1.035)**2)
        outline=[(u,y+v) for u,y in rounded_rect(w,1.95,.85)]
        plate("Grille louvre",outline,at,11.5,13.1,housing,group,.19)
    for u in [-15.5,15.5]:
        h=2*math.sqrt(42.2**2-u**2)
        plate("Grille cross support",[(x+u,y) for x,y in rounded_rect(1.8,h,0.7)],at,11.45,12.1,housing,group)
    plate("Model badge",rounded_rect(87,11.4,1.2),at,11.8,14.2,housing,group,.5)
    side_text("Model print","DT 990 PRO",at(-4,0,14.24),side,6.2,group)
    side_text("Impedance","80 OHM",at(25,-.5,14.25),side,2.4,group)

    arc=[math.pi*i/48 for i in range(49)]
    outer=[(49.8*math.cos(a),(51+11*math.sin(a)**5)*math.sin(a)) for a in arc]
    inner=[(44.5*math.cos(a),46.5*math.sin(a)) for a in reversed(arc)]
    plate("Pressed steel fork",outer+inner,at,5.5,8.3,steel,group,.7)
    for u in [-47.5,47.5]:
        plate("Swivel boss",[(x+u,y) for x,y in rounded_rect(7.5,13,2.8)],at,5,10.6,housing,group,.5)
        cap=[at(u+2*math.cos(t),2*math.sin(t),11) for t in [TAU*i/16 for i in range(16)]]
        loft("Pivot pin",[[(x-side*.8,y,z) for x,y,z in cap],cap],steel,group)
    plate("Extension blade",[(x,y+68) for x,y in rounded_rect(12,28,2)],at,3.3,6.4,steel,group,.7)
    plate("Slider block",[(x,y+83) for x,y in rounded_rect(32,17,3.5)],at,-3.2,8.2,housing,group,1.1)
    side_text("Slider makers mark","beyerdynamic",at(0,83,8.25),side,3.5,group)
    side_text("Channel",letter,at(0,72,6.45),side,4,group)
    tube("External yoke wire",bezier(at(8,80,1),at(44,68,-3),at(46,45,-5),at(29,35,-6)),1.1,rubber,group)
    for v in [92,110]:
        cap=[at(9+2.7*math.cos(t),v+2.7*math.sin(t),3.9 if v==92 else 1.4) for t in [TAU*i/16 for i in range(16)]]
        loft("Headband snap",[[(x-side,y,z) for x,y,z in cap],cap],housing,group)

base_outline=rounded_rect(91,77,13)
plate("Weighted base",base_outline,lambda x,y,z:(x,y,z),0,4.8,stand,stand_group,1.3)
plate("Upright",rounded_rect(11,8,2),lambda x,y,z:(x,y+4,z),4,234,stand,stand_group,.8)
saddle = [(x, 235.5+6*(1-(x/26)**2)) for x in range(-26,27,2)]
saddle += [(x,z-4.3) for x,z in reversed(saddle)]
plate("Curved headband rest",saddle,lambda x,z,y:(x,y,z),-18,18,rubber,stand_group,1.2)

path=bezier((-80,0,45),(-86,1,28),(-98,11,1.6),(-107,30,1.6))
path+=bezier(path[-1],(-112,49,1.6),(-88,64,1.6),(-70,59,1.6))[1:]
path+=bezier(path[-1],(-45,50,1.6),(-43,41,2.8),(-20,43,2.8))[1:]
tube("Single sided cable",path,1.35,rubber,wire_group)
tube("Strain relief",bezier((-79,0,47),(-80,0,44),(-82,0,41),(-83,1,36),6),2.2,housing,wire_group)
end=path[-1]
d=(end-path[-2]).normalized()
tube("Plug barrel",[end,end+d*15],2.8,housing,wire_group,12)
tube("Stereo mini jack",[end+d*15,end+d*28],1.7,nickel,wire_group,12)
for dist in [20,24]:
    tube("Contact insulator",[end+d*dist,end+d*(dist+.9)],1.76,rubber,wire_group,12)

product = list(scene.objects)
studio = collection("Studio – excluded from GLB")
scene.world = bpy.data.worlds.new("Neutral studio")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.34,.38,.42,1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = .45
floor = finish("Studio clay",(.21,.24,.25),.91)
mesh("Studio floor",[(-1200,-1200,-.2),(1200,-1200,-.2),(1200,1200,-.2),(-1200,1200,-.2)],[(0,1,2,3)],floor,studio)
def aim(obj,point):
    obj.rotation_euler = (Vector(point)-obj.location).to_track_quat("-Z","Y").to_euler()
def softbox(name,location,energy,size):
    light=bpy.data.lights.new(name,"AREA")
    light.energy=energy
    light.shape="DISK"
    light.size=size
    obj=bpy.data.objects.new(name,light)
    studio.objects.link(obj)
    obj.location=location
    aim(obj,(0,0,.12))
softbox("Large left softbox",(-.3,-.4,.47),7,.4)
softbox("Edge light",(.15,.22,.45),8,.24)
softbox("Front fill",(.32,-.16,.26),2.6,.25)
camera=bpy.data.objects.new("Product camera",bpy.data.cameras.new("Product camera"))
studio.objects.link(camera)
camera.location=(.37,-.34,.24)
aim(camera,(0,0,.12))
camera.data.type="ORTHO"
camera.data.ortho_scale=.34
scene.camera=camera
scene.render.engine="CYCLES"
scene.cycles.samples=20
scene.cycles.use_denoising=True
scene.render.resolution_x,scene.render.resolution_y=760,800
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="WEBP"
scene.render.image_settings.quality=90
scene.render.filepath="//preview.webp"
for item in studio.objects:
    item.hide_set(True)

for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=="VIEW_3D":
            view=area.spaces.active.region_3d
            view.view_distance=.42
            view.view_location=(0,0,.125)
            view.view_rotation=Vector((-.9,.76,-.34)).to_track_quat("-Z","Y")

bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"dt-990-pro.blend"),compress=True)
if "--render" in sys.argv:
    bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action="DESELECT")
for item in product:
    item.select_set(True)
bpy.context.view_layer.objects.active=product[0]
bpy.ops.object.convert(target="MESH")
bpy.ops.object.join()
bpy.context.object.name="DT 990 PRO Black on stand"
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format="GLB",use_selection=True,
                          export_draco_mesh_compression_enable=True,
                          export_draco_position_quantization=16,export_draco_normal_quantization=10)
