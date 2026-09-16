import bpy
import math
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
TEX = PROJECT / 'public/textures/music-cabinet'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0

def material(name, image=None, color=(.12, .11, .09, 1), roughness=.65):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    if image:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(TEX / image))
        mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return mat

wood = material('Reference walnut veneer', 'walnut.jpg', roughness=.72)
paper = material('Sleeve folded paper edges', color=(.24, .225, .20, 1), roughness=.86)
spines = material('Photographic collection spines', 'spines.jpg', roughness=.48)
cover = material('The Prodigy - Invaders Must Die', 'invaders-must-die.jpg', roughness=.66)

def box(name, size, position, mat=wood, bevel=.0012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    uv = obj.data.uv_layers.active
    for poly in obj.data.polygons:
        axis = max(range(3), key=lambda i: abs(poly.normal[i]))
        for idx in poly.loop_indices:
            co = obj.data.vertices[obj.data.loops[idx].vertex_index].co
            if axis == 1:
                u, v = co.x / size[0] + .5, co.z / size[2] + .5
            elif axis == 0:
                u, v = co.z / size[2] + .5, co.y / size[1] + .5
            else:
                u, v = co.x / size[0] + .5, co.y / size[1] + .5
            if mat == wood:
                if axis == 1:
                    u, v = co.x / .42 + .5, co.z / .84 + .5
                elif axis == 0:
                    u, v = co.z / .42 + .5, co.y / .84 + .5
                else:
                    u, v = co.x / .42 + .5, co.y / .84 + .5
            uv.data[idx].uv = (u, v)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Soft cabinet edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def face(name, x0, x1, y0, y1, z, mat, u0=0, u1=1):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(x0,y0,z),(x1,y0,z),(x1,y1,z),(x0,y1,z)], [], [(0,1,2,3)])
    mesh.uv_layers.new()
    for loop, uv in zip(mesh.uv_layers.active.data, [(u0,0),(u1,0),(u1,1),(u0,1)]):
        loop.uv = uv
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    return obj

W, H, D, P, BASE = .882, .945, .53, .024, .063
body = H - BASE
box('Top', (W,P,D), (0,-P/2,0))
box('Bottom', (W,P,D), (0,-body+P/2,0))
for side in [-1,1]:
    box('Side', (P,body-2*P,D), (side*(W-P)/2,-body/2,0))
box('Center divider', (P,body-2*P,D-.012), (0,-body/2,-.006))
box('Inset back', (W-2*P,body-2*P,.012), (0,-body/2,-D/2+.006))
shelf_center_y = -body/2 + .05
record_front_z = .238
box('Right middle shelf', ((W-3*P)/2,P,D-.016), ((W-P)/4,shelf_center_y,-.008))
box('Left door', ((W-3*P)/2-.005,body-2*P-.006,.022), (-(W-P)/4,-body/2,D/2-.012), bevel=.0018)
box('Recessed walnut plinth', (W-.09,BASE,D-.09), (0,-H+BASE/2,0))
shelf_y = shelf_center_y+P/2
for i in range(24):
    x = .025+i*.0107
    height = .313 - (i%5)*.001
    z = record_front_z + (i%3)*.0015
    box('Sleeve %02d' % i, (.0101,height,.313), (x+.00505,shelf_y+height/2,z-.1565), paper, .0004)
    face('Spine %02d' % i, x,x+.0101,shelf_y,shelf_y+height,z+.0001,spines,i/24,(i+1)/24)
size = .315
featured = box('IMD sleeve', (size,size,.005), (0,0,0), paper, .0006)
art = face('IMD printed cover',-size/2,size/2,-size/2,size/2,.0026,cover)
art.parent = featured
featured.rotation_euler = (0, math.pi / 2, 0)
featured.location = (.285,shelf_y+size/2,record_front_z-size/2)

bpy.context.view_layer.update()
for obj in list(bpy.context.scene.objects):
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = world

for mat in [wood,paper,spines,cover]:
    objects = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.data.materials[0] == mat]
    for obj in objects:
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    objects[0].name = mat.name

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(PROJECT / 'public/glbs/music-cabinet.glb'), export_format='GLB', export_yup=False, use_selection=True, export_cameras=False, export_lights=False)
for img in bpy.data.images:
    if img.source == 'FILE':
        img.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'music-cabinet.blend'))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.world.color = (.3,.3,.3)
bpy.ops.object.camera_add(location=(1.5,.65,2.4))
camera = bpy.context.object
direction = (Vector((0,-.42,0))-camera.location).normalized()
right = direction.cross(Vector((0,1,0))).normalized()
up = right.cross(direction)
camera.rotation_euler = Matrix((right, up, -direction)).transposed().to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 1.45
scene.camera = camera
for position, power, size in [((1,2,3),180,3),((-2,.1,1),100,2)]:
    bpy.ops.object.light_add(type='AREA', location=position)
    light = bpy.context.object
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = size
    light.rotation_euler = (Vector((0,-.4,0))-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x = 1000
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.filepath = str(ROOT / 'preview.png')
bpy.ops.render.render(write_still=True)
