from math import asin, cos, pi, sin, sqrt
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ASSETS = Path(__file__).resolve().parent
PUBLIC = ASSETS.parents[1] / "public" / "glbs"
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"


def collection(name):
    group = bpy.data.collections.new(name)
    scene.collection.children.link(group)
    return group


mouse = collection("Logitech G Pro Wireless")
pad = collection("SteelSeries QcK Hard")
studio = collection("Product studio")


def finish(name, color, roughness, emission=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = emission
    return mat


porcelain = finish("Chalk white satin ABS", (0.84, 0.86, 0.88), 0.38)
seam = finish("Recessed graphite", (0.017, 0.019, 0.022), 0.54)
rubber = finish("Wheel elastomer", (0.027, 0.03, 0.032), 0.8)
led = finish("LIGHTSYNC blue", (0.002, 0.085, 0.98), 0.37, 1.4)
feet = finish("Glide feet", (0.61, 0.62, 0.64), 0.35)
base = finish("Non-slip black rubber", (0.012, 0.013, 0.015), 0.86)
surface = finish("Hard polyethylene", (0.014, 0.015, 0.017), 0.7)
ink = finish("SteelSeries white print", (0.88, 0.88, 0.88), 0.66)


def mesh(name, vertices, faces, material, group=mouse, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata([tuple(v * 0.001 for v in point) for point in vertices], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    data.materials.append(material)
    for face in data.polygons:
        face.use_smooth = smooth
    return obj


def grid(name, rows, material, flip=False):
    n = len(rows[0])
    faces = []
    for j in range(len(rows) - 1):
        for i in range(n - 1):
            a = j * n + i
            face = (a, a + 1, a + n + 1, a + n)
            faces.append(face[::-1] if flip else face)
    return mesh(name, [v for row in rows for v in row], faces, material, smooth=True)


stations = [
    (-62.5, 0, 5.2),
    (-62, 5.8, 8.4),
    (-60, 12, 13.2),
    (-55, 20, 20.7),
    (-46, 27.1, 29.2),
    (-34, 31.1, 35.8),
    (-23, 31.75, 39),
    (-11, 30.8, 40),
    (3, 29.8, 39.1),
    (17, 29.5, 35.1),
    (32, 30.1, 29.6),
    (43, 30.1, 24),
    (50, 28.4, 20.7),
    (56, 22.4, 17.5),
    (60, 13.8, 15),
    (62, 6.3, 13.45),
    (62.5, 0, 13),
]


def profile(y, column):
    ys, values = zip(*[(row[0], row[column]) for row in stations])
    slopes = [(b - a) / (v - u) for a, b, u, v in zip(values, values[1:], ys, ys[1:])]
    tangents = [
        slopes[0],
        *[2 * a * b / (a + b) if a * b > 0 else 0 for a, b in zip(slopes, slopes[1:])],
        slopes[-1],
    ]
    i = min(len(slopes) - 1, max(0, int(np.searchsorted(ys, y, side="right")) - 1))
    h = ys[i + 1] - ys[i]
    t = (y - ys[i]) / h
    return (
        (2 * t + 1) * (1 - t) ** 2 * values[i]
        + t * (1 - t) ** 2 * h * tangents[i]
        + t * t * (3 - 2 * t) * values[i + 1]
        + t * t * (t - 1) * h * tangents[i + 1]
    )


def shell(y, angle):
    width, height = profile(y, 1), profile(y, 2)
    shoulder = min(height - 0.02, 5.1 + 7.85 * ((y + 62.5) / 125) ** 1.55)
    c = cos(angle)
    z = shoulder + (height - shoulder) * max(c, 0) ** 0.87
    if c < 0:
        floor = 1.15 + max(0, abs(y) - 51) ** 2 / 11.5**2 * (shoulder - 1.15)
        z = shoulder - (shoulder - floor) * (-c) ** 0.68
    return width * sin(angle), y, z


def patch(name, lengths, limits, steps, material, side):
    rows = []
    for y in lengths:
        start, end = limits(y)
        rows.append([shell(y, side * a) for a in np.linspace(start, end, steps + 1)])
    return grid(name, rows, material, side < 0)


def samples(start, end, step=2):
    return sorted(
        set(
            [
                start,
                end,
                *np.arange(start + step, end, step),
                *(y for y, _, _ in stations if start < y < end),
            ]
        )
    )


def gap_angle(y):
    half = 0.29
    dist = abs(y - 37)
    if dist < 10.6:
        half = 4.8 if dist <= 7 else 1.2 + sqrt(max(0, 3.6**2 - (dist - 7) ** 2))
    return asin(min(0.95, half / max(0.001, profile(y, 1))))


def button_edge(y):
    return (
        0.99
        + 0.26 * max(0, (y - 5) / 57) ** 1.1
        - 0.09 * max(0, 1 - ((y - 5) / 2) ** 2)
    )


for side, label in [(-1, "Left"), (1, "Right")]:
    patch(
        label + " palm shell",
        samples(-62.5, 4.6),
        lambda y: (0, 2.26),
        44,
        porcelain,
        side,
    )
    patch(
        label + " hinge seam",
        [4.6, 5.18],
        lambda y: (0, button_edge(y)),
        24,
        seam,
        side,
    )
    patch(
        label + " hinge cheek",
        [4.6, 5.18],
        lambda y: (button_edge(y), 2.26),
        24,
        porcelain,
        side,
    )
    rows = sorted(
        set(
            samples(5.18, 62.5, 1.5)
            + list(np.linspace(26.4, 30, 10))
            + list(np.linspace(44, 47.6, 10))
            + [26.39, 47.61]
        )
    )
    patch(
        label + " click plate",
        rows,
        lambda y: (gap_angle(y), button_edge(y)),
        24,
        porcelain,
        side,
    )
    patch(label + " wheel well", rows, lambda y: (0, gap_angle(y)), 6, seam, side)
    patch(
        label + " click seam",
        rows,
        lambda y: (button_edge(y), button_edge(y) + 0.023),
        1,
        seam,
        side,
    )
    patch(
        label + " flank",
        rows,
        lambda y: (button_edge(y) + 0.023, 2.26),
        24,
        porcelain,
        side,
    )
    patch(label + " sole", samples(-62.5, 62.5), lambda y: (2.26, pi), 20, seam, side)


def top(x, y, lift=0.08):
    return x, y, shell(y, asin(x / profile(y, 1)))[2] + lift


def arc_mark(name, center, inner, outer, angles, project, material, group):
    vertices = [
        project(center[0] + radius * cos(a), center[1] + radius * sin(a))
        for a in angles
        for radius in [inner, outer]
    ]
    faces = [(i, i + 1, i + 3, i + 2) for i in range(0, len(vertices) - 2, 2)]
    return mesh(name, vertices, faces, material, group)


arc_mark(
    "G light guide • arc",
    (0, -31),
    3.65,
    6.25,
    np.linspace(pi / 2, 1.5 * pi, 49),
    top,
    led,
    mouse,
)
for name, x0, x1, y0, y1 in [
    ("G light guide • crossbar", 0, 6.15, -32.3, -30),
    ("G light guide • stem", 3.8, 6.15, -35.4, -32.3),
]:
    grid(
        name,
        [[top(x, y) for x in np.linspace(x0, x1, 10)] for y in np.linspace(y0, y1, 5)],
        led,
    )


def disk(name, x, y, radius, project, material, group):
    points = [
        project(x + radius * cos(a), y + radius * sin(a))
        for a in np.linspace(0, 2 * pi, 32, endpoint=False)
    ]
    mesh(
        name,
        [project(x, y), *points],
        [(0, i + 1, (i + 1) % 32 + 1) for i in range(32)],
        material,
        group,
    )


for i in range(3):
    disk("DPI light " + str(i + 1), 0, 1.2 - 3.7 * i, 0.6, top, led, mouse)

wheel_rows = []
for x, radius in [
    (-3.05, 6.8),
    (-2.85, 8.05),
    (-2.3, 8.7),
    (0, 8.9),
    (2.3, 8.7),
    (2.85, 8.05),
    (3.05, 6.8),
]:
    row = []
    for i in range(193):
        angle = 2 * pi * i / 192
        r = radius - (0.28 if i % 4 == 0 else 0)
        row.append((x, 37 + r * cos(angle), 23.65 + r * sin(angle)))
    wheel_rows.append(row)
grid("Knurled scroll wheel", wheel_rows, rubber)
for side in [0, -1]:
    points = wheel_rows[side][:-1]
    face = tuple(range(len(points)))
    mesh("Wheel hub", points, [face[::-1] if side == 0 else face], seam)


def rounded_rect(width, depth, radius, segments=8):
    points = []
    for quadrant, (sx, sy) in enumerate([(1, 1), (-1, 1), (-1, -1), (1, -1)]):
        for a in np.linspace(quadrant * pi / 2, (quadrant + 1) * pi / 2, segments + 1):
            points.append(
                (
                    sx * (width / 2 - radius) + radius * cos(a),
                    sy * (depth / 2 - radius) + radius * sin(a),
                )
            )
    return points


for side in [-1, 1]:
    for center in [-4.6, 8.9]:
        rows = []
        for lift, length, height in [
            (0.1, 13.1, 5.1),
            (0.55, 12.8, 4.9),
            (1.05, 12.2, 4.3),
        ]:
            ring = []
            for dy, dz in rounded_rect(length, height, 1.65):
                y = center + dy
                z = 22.4 - 0.12 * y + dz
                h = profile(y, 2)
                shoulder = shell(y, pi / 2)[2]
                c = ((z - shoulder) / (h - shoulder)) ** (1 / 0.87)
                ring.append((side * (profile(y, 1) * sqrt(1 - c * c) + lift), y, z))
            rows.append(ring)
        n = len(rows[0])
        faces = [
            (j * n + i, j * n + (i + 1) % n, (j + 1) * n + (i + 1) % n, (j + 1) * n + i)
            for j in range(2)
            for i in range(n)
        ]
        faces.append(tuple(range(2 * n, 3 * n)))
        button = mesh(
            "Thumb switch",
            sum(rows, []),
            [f[::-1] if side < 0 else f for f in faces],
            porcelain,
        )
        button.data.materials.append(seam)
        for face in list(button.data.polygons)[:n]:
            face.material_index = 1


def slab(name, width, depth, radius, rings, material, group, center=(0, 0)):
    rows = [
        [
            (x + center[0], y + center[1], z)
            for x, y in rounded_rect(
                width - 2 * inset, depth - 2 * inset, radius - inset
            )
        ]
        for z, inset in rings
    ]
    n = len(rows[0])
    faces = [tuple(reversed(range(n)))]
    for j in range(len(rows) - 1):
        faces += [
            (j * n + i, j * n + (i + 1) % n, (j + 1) * n + (i + 1) % n, (j + 1) * n + i)
            for i in range(n)
        ]
    faces.append(tuple(range((len(rows) - 1) * n, len(rows) * n)))
    return mesh(name, sum(rows, []), faces, material, group)


for y, w in [(-38, 35), (39, 34)]:
    slab("PTFE glide", w, 12, 5, [(0, 0.35), (0.3, 0), (2.6, 0)], feet, mouse, (0, y))

slab("QcK rubber backing", 320, 270, 26, [(0, 0.45), (0.36, 0), (1.95, 0)], base, pad)
plate = slab(
    "QcK Hard tracking surface",
    320,
    270,
    26,
    [(1.95, 0), (2.77, 0), (3, 0.29)],
    surface,
    pad,
)
uv = plate.data.uv_layers.new(name="Tracking grain")
for loop in plate.data.loops:
    p = plate.data.vertices[loop.vertex_index].co
    uv.data[loop.index].uv = (p.x * 45, p.y * 45)
rng = np.random.default_rng(17)
height = rng.uniform(-1, 1, (128, 128))
normal = np.stack(
    [0.5 + 0.095 * (height - np.roll(height, 1, axis)) for axis in (1, 0)]
    + [np.ones_like(height), np.ones_like(height)],
    axis=-1,
)
grain = bpy.data.images.new("Molded tracking grain", 128, 128)
grain.colorspace_settings.name = "Non-Color"
grain.pixels.foreach_set(normal.astype(np.float32).ravel())
grain.pack()
nodes = surface.node_tree.nodes
texture = nodes.new("ShaderNodeTexImage")
texture.image = grain
normal_map = nodes.new("ShaderNodeNormalMap")
surface.node_tree.links.new(texture.outputs["Color"], normal_map.inputs["Color"])
surface.node_tree.links.new(
    normal_map.outputs["Normal"], nodes.get("Principled BSDF").inputs["Normal"]
)


bpy.ops.import_curve.svg(filepath=str(ASSETS / "steelseries.svg"))
curve = next(obj for obj in bpy.context.scene.objects if obj.type == "CURVE")
curve.data.resolution_u = 16
graph = bpy.context.evaluated_depsgraph_get()
logo_mesh = bpy.data.meshes.new_from_object(curve.evaluated_get(graph))
logo_mesh.transform(curve.matrix_world)
left = min(v.co.x for v in logo_mesh.vertices)
bottom = min(v.co.y for v in logo_mesh.vertices)
scale = 0.0363 / (max(v.co.x for v in logo_mesh.vertices) - left)
for vertex in logo_mesh.vertices:
    x, y, _ = vertex.co
    vertex.co = (
        -0.160 + 0.0217 + (x - left) * scale,
        -0.135 + 0.0217 + (y - bottom) * scale,
        0.003025,
    )
logo = bpy.data.objects.new("SteelSeries screen print", logo_mesh)
pad.objects.link(logo)
logo.data.materials.clear()
logo.data.materials.append(ink)
(svg_collection,) = curve.users_collection
bpy.data.objects.remove(curve, do_unlink=True)
bpy.data.collections.remove(svg_collection)


for group, filename in [(mouse, "g-pro-wireless"), (pad, "qck-hard")]:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in group.objects:
        part = obj.copy()
        part.data = obj.data.copy()
        scene.collection.objects.link(part)
        part.select_set(True)
    bpy.context.view_layer.objects.active = part
    bpy.ops.object.join()
    part.name = filename
    part.data.name = group.name
    bpy.ops.export_scene.gltf(
        filepath=str(PUBLIC / (filename + ".glb")),
        use_selection=True,
        export_texcoords=True,
        export_tangents=False,
        export_yup=True,
        export_animations=False,
    )
    bpy.data.objects.remove(part, do_unlink=True)

for obj in mouse.objects:
    obj.location = (-0.025, -0.029, 0.003)


def aim(obj, target):
    obj.rotation_euler = (
        (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()
    )


camera = bpy.data.cameras.new("Product camera")
cam = bpy.data.objects.new(camera.name, camera)
studio.objects.link(cam)
cam.location = (-0.24, -0.33, 0.23)
aim(cam, (-0.055, -0.043, 0.01))
camera.type = "ORTHO"
camera.ortho_scale = 0.29
camera.clip_start = 0.001
scene.camera = cam
for name, pos, energy, size in [
    ("Softbox", (-0.18, 0.12, 0.35), 3, 0.25),
    ("Rim", (0.18, 0.14, 0.2), 2, 0.13),
    ("Fill", (0.09, -0.25, 0.14), 1.1, 0.23),
]:
    light = bpy.data.lights.new(name, "AREA")
    light.energy = energy
    light.size = size
    obj = bpy.data.objects.new(name, light)
    studio.objects.link(obj)
    obj.location = pos
    aim(obj, (0, 0, 0.015))
slab(
    "Studio plinth",
    1500,
    1500,
    10,
    [(-3, 0), (-0.05, 0)],
    finish("Studio slate", (0.14, 0.15, 0.17), 0.82),
    studio,
)
scene.world = bpy.data.worlds.new("Studio gray")
scene.world.color = (0.24, 0.24, 0.24)
scene.render.engine = "CYCLES"
scene.cycles.samples = 28
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 960, 680
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = "//preview.png"
bpy.ops.object.select_all(action="DESELECT")
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == "VIEW_3D":
            space = area.spaces.active
            space.clip_start = 0.0001
            space.region_3d.view_distance = 0.33
            space.region_3d.view_location = (0, 0, 0.012)
            space.region_3d.view_rotation = cam.rotation_euler.to_quaternion()
            space.overlay.show_overlays = False
            space.shading.color_type = "MATERIAL"
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(
    filepath=str(ASSETS / "g-pro-wireless.blend"), compress=True
)
bpy.ops.render.render(write_still=True)
