import json
import math
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

OUT = Path(__file__).resolve().parent
PROJECT = OUT.parents[1]
WIDTH, LENGTH, THICKNESS = .2032, .805, .008
ROWS, COLUMNS = 112, 24
EDGE_SEGMENTS = 14
EDGE_RADIUS = .00065
FACE_SCALE_X = (WIDTH - 2 * EDGE_RADIUS) / WIDTH
FACE_SCALE_Y = (LENGTH - 2 * EDGE_RADIUS) / LENGTH
PHOTO_EDGE_INSET = 8
PHOTO_WIDTH, PHOTO_HEIGHT = 1824, 1368
SHAPE_PROFILE = json.loads((OUT / 'shape-profile.json').read_text())
SHAPE_SAMPLES = np.array(SHAPE_PROFILE['samples'])
SHAPE_INTERVALS = np.diff(SHAPE_SAMPLES[:, 0])
SHAPE_SECANTS = np.diff(SHAPE_SAMPLES[:, 1]) / SHAPE_INTERVALS
SHAPE_SLOPES = np.zeros(len(SHAPE_SAMPLES))
SHAPE_SLOPES[0], SHAPE_SLOPES[-1] = SHAPE_SECANTS[0], SHAPE_SECANTS[-1]
for i in range(1, len(SHAPE_SAMPLES) - 1):
    left, right = SHAPE_SECANTS[i - 1:i + 1]
    if left * right > 0:
        a = 2 * SHAPE_INTERVALS[i] + SHAPE_INTERVALS[i - 1]
        b = SHAPE_INTERVALS[i] + 2 * SHAPE_INTERVALS[i - 1]
        SHAPE_SLOPES[i] = (a + b) / (a / left + b / right)
OUTLINE = np.array([
    [144, 680, 680], [153, 626, 751], [180, 553, 819],
    [230, 510, 855], [300, 491, 875], [400, 490, 882],
    [560, 491, 883], [900, 492, 885], [1242, 495, 886],
    [1420, 496, 883], [1500, 506, 875], [1570, 531, 850],
    [1612, 571, 811], [1640, 626, 759], [1648, 689, 689],
], dtype=float)
HOLES = [(433, 643), (543, 643), (433, 727), (543, 727),
         (1278, 647), (1388, 647), (1278, 731), (1388, 731)]

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'


def material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return mat


graphic = material('Nervous | photographed worn graphic', (1, 1, 1), .71)
grip = material('Charcoal griptape', (.025, .027, .028), .94)
ply = material('Seven-ply maple | exposed edge', (.5, .3, .13), .73)
photo = bpy.data.images.load(str(OUT / 'reference.jpg'))
photo_node = graphic.node_tree.nodes.new('ShaderNodeTexImage')
photo_node.image = photo
photo_uv = graphic.node_tree.nodes.new('ShaderNodeUVMap')
photo_uv.uv_map = 'Photo projection'
graphic.node_tree.links.new(photo_uv.outputs['UV'], photo_node.inputs['Vector'])
graphic.node_tree.links.new(photo_node.outputs['Color'], graphic.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
edge_attribute = ply.node_tree.nodes.new('ShaderNodeVertexColor')
edge_attribute.layer_name = 'Maple layers'
ply.node_tree.links.new(edge_attribute.outputs['Color'], ply.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])


def half_width(y):
    along = min(1, max(0, .5 - y / LENGTH))
    i = min(len(SHAPE_INTERVALS) - 1, max(0, np.searchsorted(SHAPE_SAMPLES[:, 0], along) - 1))
    span = SHAPE_INTERVALS[i]
    t = (along - SHAPE_SAMPLES[i, 0]) / span
    squared = ((2 * t ** 3 - 3 * t ** 2 + 1) * SHAPE_SAMPLES[i, 1]
               + (t ** 3 - 2 * t ** 2 + t) * span * SHAPE_SLOPES[i]
               + (-2 * t ** 3 + 3 * t ** 2) * SHAPE_SAMPLES[i + 1, 1]
               + (t ** 3 - t ** 2) * span * SHAPE_SLOPES[i + 1])
    return WIDTH / 2 * math.sqrt(max(0, squared))


def profile(x, y):
    bend_start, bend_length = .215, .045
    distance = max(0, abs(y) - bend_start)
    bend = min(1, distance / bend_length)
    slope = math.tan(math.radians(13 if y < 0 else 15))
    lift = slope * (bend_length * (bend ** 3 - .5 * bend ** 4) + max(0, distance - bend_length))
    concave = .006 * (x / (WIDTH / 2)) ** 2
    return -lift - concave


def photo_coordinates(x, y):
    u = y / LENGTH + .5
    px = OUTLINE[0, 0] + u * (OUTLINE[-1, 0] - OUTLINE[0, 0])
    top = np.interp(px, OUTLINE[:, 0], OUTLINE[:, 1])
    bottom = np.interp(px, OUTLINE[:, 0], OUTLINE[:, 2])
    across = x / max(half_width(y), .000001)
    py = (top + bottom) / 2 + across * max(0, (bottom - top) / 2 - PHOTO_EDGE_INSET)
    return px / PHOTO_WIDTH, 1 - py / PHOTO_HEIGHT


vertices, faces, slots = [], [], []
ys = [-LENGTH / 2 * math.cos(math.pi * r / ROWS) for r in range(ROWS + 1)]
for side in [1, -1]:
    for y in ys:
        for c in range(COLUMNS + 1):
            x = half_width(y) * (c / COLUMNS * 2 - 1)
            vertices.append((x * FACE_SCALE_X, y * FACE_SCALE_Y, profile(x, y) + side * THICKNESS / 2))
surface_count = (ROWS + 1) * (COLUMNS + 1)
for side in range(2):
    for r in range(ROWS):
        for c in range(COLUMNS):
            a = side * surface_count + r * (COLUMNS + 1) + c
            face = (a, a + 1, a + COLUMNS + 2, a + COLUMNS + 1)
            faces.append(face if side == 0 else tuple(reversed(face)))
            slots.append(side)
boundary = list(range(COLUMNS + 1))
boundary += [r * (COLUMNS + 1) + COLUMNS for r in range(1, ROWS + 1)]
boundary += [ROWS * (COLUMNS + 1) + c for c in range(COLUMNS - 1, -1, -1)]
boundary += [r * (COLUMNS + 1) for r in range(ROWS - 1, 0, -1)]
rings = [boundary]
for layer in range(1, EDGE_SEGMENTS):
    fraction = layer / EDGE_SEGMENTS
    ring = []
    for index in boundary:
        x, y, z = vertices[index]
        bevel = math.sin(math.pi * fraction)
        ring.append(len(vertices))
        vertices.append((x * (1 + (1 / FACE_SCALE_X - 1) * bevel),
                         y * (1 + (1 / FACE_SCALE_Y - 1) * bevel), z - THICKNESS * fraction))
    rings.append(ring)
rings.append([i + surface_count for i in boundary])
for r in range(len(rings) - 1):
    for i in range(len(boundary)):
        j = (i + 1) % len(boundary)
        faces.append((rings[r][j], rings[r][i], rings[r + 1][i], rings[r + 1][j]))
        slots.append(2)
mesh = bpy.data.meshes.new('Pressed maple deck')
mesh.from_pydata(vertices, [], faces)
mesh.update()
deck = bpy.data.objects.new('Skateboard_Deck', mesh)
scene.collection.objects.link(deck)
for mat in [graphic, grip, ply]:
    mesh.materials.append(mat)
mesh.uv_layers.new(name='Photo projection')
mesh.uv_layers.new(name='Deck atlas')
colors = mesh.color_attributes.new(name='Maple layers', type='FLOAT_COLOR', domain='CORNER')
uv_photo = mesh.uv_layers['Photo projection']
uv_flat = mesh.uv_layers['Deck atlas']
palette = [(.48, .25, .10, 1), (.64, .43, .22, 1), (.24, .08, .07, 1),
           (.65, .46, .26, 1), (.39, .30, .12, 1), (.64, .43, .22, 1), (.30, .10, .09, 1)]
for polygon, slot in zip(mesh.polygons, slots):
    polygon.material_index = slot
    polygon.use_smooth = True
    strip = (polygon.index - 2 * ROWS * COLUMNS) // len(boundary)
    layer = min(6, max(0, strip * 7 // EDGE_SEGMENTS))
    for index in polygon.loop_indices:
        x, y, z = mesh.vertices[mesh.loops[index].vertex_index].co
        uv_photo.data[index].uv = photo_coordinates(x, y)
        uv_flat.data[index].uv = (y / LENGTH + .5, .5 - x / WIDTH)
        colors.data[index].color = palette[layer] if slot == 2 else (1, 1, 1, 1)
bpy.context.view_layer.objects.active = deck
deck.select_set(True)
bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh)
bm.free()

atlas = bpy.data.images.new('Nervous deck albedo', width=2048, height=512, alpha=False)
for mat in [graphic, grip, ply]:
    node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = atlas
    mat.node_tree.nodes.active = node
mesh.uv_layers.active = mesh.uv_layers['Deck atlas']
mesh.uv_layers['Deck atlas'].active_render = True
scene.render.engine = 'CYCLES'
scene.cycles.samples = 1
scene.render.bake.use_pass_direct = False
scene.render.bake.use_pass_indirect = False
scene.render.bake.use_pass_color = True
scene.render.bake.margin = 16
back_faces = [p for p in mesh.polygons if p.material_index != 0]
for polygon in back_faces:
    for index in polygon.loop_indices:
        mesh.uv_layers['Deck atlas'].data[index].uv = (-2, -2)
bpy.ops.object.bake(type='DIFFUSE')
atlas.filepath_raw = str(OUT / 'deck-albedo.jpg')
atlas.file_format = 'JPEG'
atlas.save()
for mat in [graphic, grip, ply]:
    for node in list(mat.node_tree.nodes):
        if node.type in {'TEX_IMAGE', 'UVMAP'}:
            mat.node_tree.nodes.remove(node)
albedo_node = graphic.node_tree.nodes.new('ShaderNodeTexImage')
albedo_node.image = bpy.data.images.load(str(OUT / 'deck-albedo.jpg'))
graphic.node_tree.links.new(albedo_node.outputs['Color'], graphic.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
mesh.uv_layers.remove(mesh.uv_layers['Photo projection'])

cutters = []
for px, py in HOLES:
    y = ((px - OUTLINE[0, 0]) / (OUTLINE[-1, 0] - OUTLINE[0, 0]) - .5) * LENGTH
    top = np.interp(px, OUTLINE[:, 0], OUTLINE[:, 1])
    bottom = np.interp(px, OUTLINE[:, 0], OUTLINE[:, 2])
    x = (py - (top + bottom) / 2) / ((bottom - top) / 2 - PHOTO_EDGE_INSET) * half_width(y)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=.0027, depth=.12, location=(x, y, 0))
    cutter = bpy.context.object
    for mat in [graphic, grip, ply]:
        cutter.data.materials.append(mat)
    for polygon in cutter.data.polygons:
        polygon.material_index = 2
    cutters.append(cutter)
bpy.ops.object.select_all(action='DESELECT')
for cutter in cutters:
    cutter.select_set(True)
bpy.context.view_layer.objects.active = cutters[0]
bpy.ops.object.join()
cutter = bpy.context.object
bpy.context.view_layer.objects.active = deck
modifier = deck.modifiers.new('Eight truck mounting holes', 'BOOLEAN')
modifier.operation = 'DIFFERENCE'
modifier.solver = 'EXACT'
modifier.object = cutter
bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.data.objects.remove(cutter, do_unlink=True)
for layer in list(deck.data.uv_layers):
    if layer.name != 'Deck atlas':
        deck.data.uv_layers.remove(layer)
colors = deck.data.color_attributes['Maple layers']
for polygon in deck.data.polygons:
    for index in polygon.loop_indices:
        if polygon.material_index != 2:
            colors.data[index].color = (1, 1, 1, 1)
        elif sum(colors.data[index].color[:3]) < .001:
            colors.data[index].color = palette[0]

bm = bmesh.new()
bm.from_mesh(deck.data)
assert all(edge.is_manifold for edge in bm.edges), 'Deck must be watertight, including holes'
bmesh.ops.triangulate(bm, faces=list(bm.faces))
bm.to_mesh(deck.data)
bm.free()
extent_x = max(abs(vertex.co.x) for vertex in deck.data.vertices)
extent_y = max(abs(vertex.co.y) for vertex in deck.data.vertices)
for vertex in deck.data.vertices:
    vertex.co.x *= WIDTH / (2 * extent_x)
    vertex.co.y *= LENGTH / (2 * extent_y)
deck['dimensions_m'] = [WIDTH, LENGTH, THICKNESS]
deck['construction'] = 'Seven-ply maple, asymmetric kicks, transverse concave, eight open mounting holes'
deck['texture_source'] = 'Owner photograph IMG_7519.HEIC, projected and baked without generated artwork'
bpy.ops.object.select_all(action='DESELECT')
deck.select_set(True)
bpy.context.view_layer.objects.active = deck
target = PROJECT / 'public/glbs/skateboard-deck.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', export_yup=False,
                          use_selection=True, export_cameras=False, export_lights=False,
                          export_image_format='AUTO', export_texcoords=True)
for img in list(bpy.data.images):
    if img == photo or img == atlas:
        bpy.data.images.remove(img)
    elif img.source == 'FILE':
        img.pack()

deck.rotation_euler.z = -math.pi / 2
scene.world.color = (.22, .22, .22)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.view_settings.view_transform = 'AgX'
for location, energy, size in [((-.3, .7, 1.2), 55, 1.1), ((.5, -.4, .8), 22, .8)]:
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    light.rotation_euler = (-light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(location=(0, 0, 1.5))
camera = bpy.context.object
scene.camera = camera
camera.data.type = 'ORTHO'
camera.data.ortho_scale = .94
scene.render.resolution_x = 1600
scene.render.resolution_y = 620
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'


def render(name, location):
    camera.location = location
    direction = -camera.location.normalized()
    right = direction.cross(Vector((0, 1, 0))).normalized()
    up = right.cross(direction)
    camera.rotation_euler = Matrix((right, up, -direction)).transposed().to_euler()
    scene.render.filepath = str(OUT / name)
    bpy.ops.render.render(write_still=True)


render('preview.png', (0, 0, 1.5))
render('profile.png', (.25, -.85, .75))
blank = material('Shape inspection | unprinted maple', (.48, .31, .16), .72)
deck.data.materials[0] = blank
deck.rotation_euler.z = 0
scene.render.resolution_x = 440
scene.render.resolution_y = 1400
camera.data.ortho_scale = .88
render('shape-check.png', (0, 0, 1.5))
deck.data.materials[0] = graphic
deck.rotation_euler.z = -math.pi / 2
scene.render.resolution_x = 1600
scene.render.resolution_y = 620
camera.data.ortho_scale = .94
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'skateboard-deck.blend'))
report = {
    'nominal_dimensions_m': [WIDTH, LENGTH, THICKNESS],
    'triangles': len(deck.data.polygons),
    'vertices': len(deck.data.vertices),
    'materials': len(deck.data.materials),
    'mounting_holes': len(HOLES),
    'watertight': True,
    'texture_px': [2048, 512],
    'glb_bytes': target.stat().st_size,
}
(OUT / 'asset-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
