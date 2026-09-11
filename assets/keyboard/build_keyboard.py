import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Matrix, Vector

OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(OUT))
from layout import keys, PITCH, WIDTH, DEPTH, KEY_HEIGHT

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
asset = bpy.data.collections.new('Keyboard | export')
scene.collection.children.link(asset)
root = bpy.data.objects.new('Keyboard_ROOT', None)
asset.objects.link(root)
root['dimensions_m'] = [WIDTH, 0.021, DEPTH]
root['coordinates'] = 'meters; X right, Y up, +Z front; origin on bottom contact plane'
root['key_count'] = 84


def material(name, color, roughness, metal=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Specular IOR Level'].default_value = 0.3
    mat.diffuse_color = (*color, 1)
    return mat


chassis = material('Keyboard | satin charcoal frame', (0.011, 0.014, 0.018), 0.38, 0.35)
keymat = material('Keyboard | graphite keycaps', (1, 1, 1), 0.48)
color = keymat.node_tree.nodes.new('ShaderNodeVertexColor')
color.layer_name = 'KeyTone'
keymat.node_tree.links.new(color.outputs['Color'], keymat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
orange = material('Keyboard | orange escape', (0.80, 0.155, 0.023), 0.4)
legends = material('Keyboard | single legend atlas', (1, 1, 1), 0.54)
tex = legends.node_tree.nodes.new('ShaderNodeTexImage')
tex.image = bpy.data.images.load(str(OUT / 'legends.png'))
tex.image.pack()
bsdf = legends.node_tree.nodes.get('Principled BSDF')
legends.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
cutoff = legends.node_tree.nodes.new('ShaderNodeMath')
cutoff.operation = 'GREATER_THAN'
cutoff.inputs[1].default_value = .35
legends.node_tree.links.new(tex.outputs['Alpha'], cutoff.inputs[0])
legends.node_tree.links.new(cutoff.outputs[0], bsdf.inputs['Alpha'])
legends.surface_render_method = 'DITHERED'


def outline(width, depth, radius, steps=5):
    return [(cx + radius * math.cos(math.radians(start + i * 90 / (steps - 1))),
             cz + radius * math.sin(math.radians(start + i * 90 / (steps - 1))))
            for cx, cz, start in [(width/2-radius, depth/2-radius, 0), (-width/2+radius, depth/2-radius, 90),
                                  (-width/2+radius, -depth/2+radius, 180), (width/2-radius, -depth/2+radius, 270)]
            for i in range(steps)]


def mesh_data(name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(mat)
    data.update()
    for face in data.polygons:
        face.use_smooth = True
    return data


def obj(name, data, location=(0, 0, 0)):
    ob = bpy.data.objects.new(name, data)
    asset.objects.link(ob)
    ob.parent = root
    ob.location = location
    return ob


def loft(name, profiles, mat, slope=0, closed=True, steps=5):
    vertices = [(x, y-z*slope, z) for width, depth, radius, y in profiles for x, z in outline(width, depth, radius, steps)]
    n = steps * 4
    faces = [(j*n+i, (j+1)*n+i, (j+1)*n+(i+1)%n, j*n+(i+1)%n)
             for j in range(len(profiles)-1) for i in range(n)]
    if closed:
        faces += [tuple(range(n)), tuple(reversed(range(len(vertices)-n, len(vertices))))]
    return obj(name, mesh_data(name, vertices, faces, mat))


body = loft('Keyboard_Chassis', [(WIDTH-.002, DEPTH-.002, .004, .002),
                                (WIDTH, DEPTH, .0048, .003),
                                (WIDTH, DEPTH, .0048, .007),
                                (WIDTH-.0008, DEPTH-.0008, .0043, .0077)], chassis)
for vertex in body.data.vertices:
    if vertex.co.y > .006:
        vertex.co.y += .0045 - vertex.co.z * .047
loft('Keyboard_TopPlate', [(WIDTH-.002, DEPTH-.002, .004, .0117),
                          (WIDTH-.0028, DEPTH-.0028, .0036, .012)], chassis, .047)
for x in [-.119, .119]:
    for z in [-.043, .043]:
        foot = loft(f'Keyboard_Foot_{x}_{z}', [(.024, .01, .003, 0), (.024, .01, .003, .0025)], chassis)
        foot.data.transform(Matrix.Translation((x, 0, z)))

cache = {}
legend_v = []
legend_f = []
legend_uv = []
rects = json.loads((OUT / 'legend-rects.json').read_text())


def top_y(x, z, width, depth):
    return KEY_HEIGHT - .00025 * max(0, 1-(x/(width/2))**4) * max(0, 1-(z/(depth/2))**4) - z*.035


def cap(units, tone):
    width = units * PITCH - .0013
    depth = PITCH - .0013
    top_w, top_d = width-.0011, depth-.0012
    profiles = [(width-.0007, depth-.0007, .0018, 0),
                (width, depth, .002, .0006),
                (width-.0003, depth-.0003, .0018, .0038),
                (top_w, top_d, .0016, KEY_HEIGHT)]
    vertices = [(x, y-z*.035, z) for w, d, r, y in profiles for x, z in outline(w, d, r)]
    n = 20
    faces = [(j*n+i, (j+1)*n+i, (j+1)*n+(i+1)%n, j*n+(i+1)%n) for j in range(3) for i in range(n)]
    faces.append(tuple(range(n)))
    top = [(x*t, top_y(x*t,z*t,top_w,top_d), z*t) for t in [1, .55] for x,z in outline(top_w, top_d, .0016)] + [(0,top_y(0,0,top_w,top_d),0)]
    vertices[60:80] = top[:20]
    vertices.extend(top[20:])
    top_faces = [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)] + [(i+n,(i+1)%n+n,2*n) for i in range(n)]
    top_faces = [tuple(reversed(f)) for f in top_faces]
    faces.extend(tuple(i+60 for i in f) for f in top_faces)
    data = mesh_data(f'Keycap_{units}u_{tone}', vertices, faces, orange if tone == 'orange' else keymat)
    normals = [tuple(normal.vector) for normal in data.corner_normals]
    for loop in data.loops:
        if loop.vertex_index >= 60:
            x, y, z = data.vertices[loop.vertex_index].co
            dx = .001*x**3/(top_w/2)**4 * max(0,1-(z/(top_d/2))**4)
            dz = .001*z**3/(top_d/2)**4 * max(0,1-(x/(top_w/2))**4) - .035
            normals[loop.index] = tuple(Vector((-dx,1,-dz)).normalized())
    data.normals_split_custom_set(normals)
    if tone != 'orange':
        tint = (.044, .050, .061, 1) if tone == 'light' else (.020, .026, .033, 1)
        attr = data.color_attributes.new(name='KeyTone', type='FLOAT_COLOR', domain='CORNER')
        for value in attr.data:
            value.color = tint
    return data, top, top_faces, top_w, top_d


for item in keys():
    cache_key = item['units'], item['tone']
    if cache_key not in cache:
        cache[cache_key] = cap(*cache_key)
    data, top, faces, width, depth = cache[cache_key]
    ob = obj('Keyboard_ESC' if item['label'] == 'esc' else f"Keyboard_Key_{item['id']}_{item['label']}", data, (item['x'],item['y'],item['z']))
    ob['key'] = item['label']
    ob['units'] = item['units']
    if item['id'] in rects:
        rx, ry, rw, rh = rects[item['id']]
        start = len(legend_v)
        for x,y,z in top:
            legend_v.append((x+item['x'],y+item['y']+.000035,z+item['z']))
            legend_uv.append(((rx+(x/width+.5)*rw)/1024, 1-(ry+(z/depth+.5)*rh)/1024))
        legend_f.extend(tuple(start+i for i in f) for f in faces)

legend_data = mesh_data('Keyboard_Legends', legend_v, legend_f, legends)
uv = legend_data.uv_layers.new(name='LegendAtlas')
for face in legend_data.polygons:
    for loop in face.loop_indices:
        uv.data[loop].uv = legend_uv[legend_data.loops[loop].vertex_index]
obj('Keyboard_Legends', legend_data)
for ob in asset.objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'keyboard.glb'), export_format='GLB', use_selection=True,
                          export_yup=False, export_apply=False, export_extras=True,
                          export_cameras=False, export_lights=False, export_gpu_instances=True)

studio = bpy.data.collections.new('STUDIO | excluded from GLB')
scene.collection.children.link(studio)


def studio_move(ob):
    for collection in list(ob.users_collection):
        collection.objects.unlink(ob)
    studio.objects.link(ob)


def aim(ob, target):
    z = (ob.location-Vector(target)).normalized()
    x = Vector((0,1,0)).cross(z).normalized()
    y = z.cross(x).normalized()
    ob.rotation_euler = Matrix((x,y,z)).transposed().to_euler()


bpy.ops.object.select_all(action='DESELECT')
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, -.0001, 0), rotation=(math.pi/2, 0, 0))
floor = bpy.context.object
floor.name = 'Studio_Ground'
floor.data.materials.append(material('Studio | warm neutral', (.095,.102,.11), .72))
studio_move(floor)
for name, location, power, size in [('Key',(-.25,.48,.12),5,.4),('Rim',(.25,.25,-.25),4,.3),('Fill',(.2,.18,.35),1.5,.3)]:
    bpy.ops.object.light_add(type='AREA',location=location)
    light = bpy.context.object
    light.name = 'Studio_'+name
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = size
    aim(light,(0,0,0))
    studio_move(light)
bpy.ops.object.camera_add(location=(.22,.37,.42))
camera = bpy.context.object
camera.name = 'Studio_Camera'
camera.data.type = 'ORTHO'
camera.data.ortho_scale = .395
aim(camera,(0,.006,0))
studio_move(camera)
scene.camera = camera
scene.world.color = (.07,.07,.07)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 1500
scene.render.resolution_y = 920
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.region_3d.view_rotation = camera.rotation_euler.to_quaternion()
        area.spaces.active.region_3d.view_distance = .45
        area.spaces.active.region_3d.view_location = (0,.01,0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'keyboard.blend'))
if '--no-render' not in sys.argv:
    for name, location, scale in [('perspective',(.22,.37,.42),.395),('preview',(0,.65,.095),.355),('side',(1.25,.239,1.6),.365)]:
        camera.location = location
        aim(camera,(0,.009,0))
        camera.data.ortho_scale = scale
        scene.render.filepath = str(OUT / f'{name}.png')
        bpy.ops.render.render(write_still=True)
print('Keyboard build complete')
