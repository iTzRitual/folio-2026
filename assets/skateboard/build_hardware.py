import math
import bmesh
import bpy
from mathutils import Vector

WHEEL_RADIUS = .027
WHEEL_WIDTH = .032
WHEEL_CENTER_X = .085
AXLE_HEIGHT = .052
AXLE_Y = -.009


def build_hardware(deck, mount_centers, hole_spacing, surface_height):
    root = bpy.data.objects.new('Skateboard_Assembly', None)
    bpy.context.collection.objects.link(root)
    deck.parent = root
    hardware = []

    def material(name, color, roughness, metallic=0):
        rgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        mat.use_backface_culling = True
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value = (*linear, 1)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        return mat

    black = material('Truck | matte black coating', '#232529', .72)
    steel = material('Hardware | brushed steel', '#989c97', .42, .88)
    rubber = material('Pivot cups and bearing shields', '#171a1b', .75)
    orange = material('Bushings | orange urethane', '#c48a3d', .68)
    green = material('Wheels | plain lime urethane', '#80ad36', .78)

    def finish(obj, name, mat, parent, bevel=0, weighted_normals=True):
        obj.name = name
        obj.parent = parent
        obj.data.materials.append(mat)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        if bevel:
            modifier = obj.modifiers.new('Cast edge radii', 'BEVEL')
            modifier.width = bevel
            modifier.segments = 3
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        if weighted_normals:
            modifier = obj.modifiers.new('Machined face normals', 'WEIGHTED_NORMAL')
            modifier.keep_sharp = True
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        hardware.append(obj)
        return obj

    def box(name, size, position, mat, parent, bevel=.001):
        bpy.ops.mesh.primitive_cube_add(size=1, location=position)
        obj = bpy.context.object
        obj.dimensions = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        return finish(obj, name, mat, parent, bevel)

    def cylinder(name, radius, depth, position, mat, parent, axis=(0, 0, 1), segments=32, bevel=.0004):
        bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=depth, location=position)
        obj = bpy.context.object
        obj.rotation_euler = Vector(axis).to_track_quat('Z', 'Y').to_euler()
        return finish(obj, name, mat, parent, bevel)

    def casting(name, outline, depth, mat, parent, bevel):
        count = len(outline)
        vertices = outline + [(x, y, z - depth) for x, y, z in outline]
        faces = [tuple(range(count)), tuple(reversed(range(count, count * 2)))]
        faces += [(i, (i + 1) % count, (i + 1) % count + count, i + count) for i in range(count)]
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        return finish(obj, name, mat, parent, bevel)

    def lathe(name, profile, position, mat, parent, segments=64, profile_normals=False):
        vertices = []
        for x, radius in profile:
            for i in range(segments):
                angle = i * math.tau / segments
                vertices.append((x + position[0], radius * math.cos(angle) + position[1], radius * math.sin(angle) + position[2]))
        faces = []
        for row in range(len(profile)):
            following = (row + 1) % len(profile)
            for i in range(segments):
                j = (i + 1) % segments
                faces.append((row * segments + i, row * segments + j, following * segments + j, following * segments + i))
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(mesh)
        bm.free()
        obj = finish(obj, name, mat, parent, weighted_normals=not profile_normals)
        if profile_normals:
            normals = []
            for row, point in enumerate(profile):
                incoming = (Vector(point) - Vector(profile[row - 1])).normalized()
                outgoing = (Vector(profile[(row + 1) % len(profile)]) - Vector(point)).normalized()
                tangent = (incoming + outgoing).normalized()
                for i in range(segments):
                    angle = i * math.tau / segments
                    normals.append((-tangent.y, tangent.x * math.cos(angle), tangent.x * math.sin(angle)))
            mesh.normals_split_custom_set_from_vertices(normals)
        return obj

    wheel_profile = [(-.013, .011), (-WHEEL_WIDTH / 2, .013)]
    shoulder_radius = .008
    for i in range(9):
        angle = math.pi - i * math.pi / 16
        wheel_profile.append((-.008 + shoulder_radius * math.cos(angle), WHEEL_RADIUS - shoulder_radius + shoulder_radius * math.sin(angle)))
    for i in range(9):
        angle = math.pi / 2 - i * math.pi / 16
        wheel_profile.append((.008 + shoulder_radius * math.cos(angle), WHEEL_RADIUS - shoulder_radius + shoulder_radius * math.sin(angle)))
    wheel_profile.extend([(WHEEL_WIDTH / 2, .013), (.013, .011)])

    for number, center_y in enumerate(mount_centers):
        truck = bpy.data.objects.new('Truck_Tail' if number == 0 else 'Truck_Nose', None)
        bpy.context.collection.objects.link(truck)
        truck.parent = root
        inward = 1 if center_y < 0 else -1
        slope = (surface_height(0, center_y + .0001) - surface_height(0, center_y - .0001)) / .0002
        truck.location = (0, center_y, surface_height(0, center_y))
        truck.rotation_euler = (math.atan(slope) * inward, 0, 0 if inward == 1 else math.pi)
        box('Baseplate', (.061, .078, .006), (0, 0, .003), black, truck, .003)
        for x in [-hole_spacing[0] / 2, hole_spacing[0] / 2]:
            for y in [-hole_spacing[1] / 2, hole_spacing[1] / 2]:
                cylinder('Mounting screw head', .0044, .002, (x, y, .007), steel, truck, segments=24)
                box('Screw drive', (.004, .0008, .0002), (x, y, .0081), rubber, truck, .0001)
                box('Screw drive', (.0008, .004, .0002), (x, y, .0082), rubber, truck, .0001)
        casting('Pivot pedestal', [(-.012, -.031, .020), (.012, -.031, .020),
                                  (.01, -.018, .034), (-.01, -.018, .034)], .014, black, truck, .002)
        cylinder('Pivot cup', .0075, .008, (0, -.016, .030), rubber, truck, axis=(0, .6, .8))
        cylinder('Pivot stem', .005, .021, (0, -.013, .040), black, truck, axis=(0, .3, .95))
        cylinder('Steel axle', .004, .205, (0, AXLE_Y, AXLE_HEIGHT), steel, truck, axis=(1, 0, 0))
        cylinder('Hanger axle barrel', .0092, .132, (0, AXLE_Y, AXLE_HEIGHT), black, truck, axis=(1, 0, 0), segments=40, bevel=.004)
        outline = [(-.065, -.016), (.065, -.016), (.068, -.005), (.053, .002),
                   (.025, .012), (.014, .029), (-.014, .029), (-.025, .012), (-.053, .002), (-.068, -.005)]
        casting('Hanger cast web', [(x, y, .055 - max(0, y + .005) * .52) for x, y in outline], .010, black, truck, .003)
        kingpin_axis = (0, .3, .954)
        cylinder('Kingpin', .0035, .049, (0, .02, .031), steel, truck, axis=kingpin_axis)
        cylinder('Lower bushing washer', .0112, .0016, (0, .014, .010), steel, truck, axis=kingpin_axis)
        cylinder('Orange barrel bushing', .010, .012, (0, .0165, .018), orange, truck, axis=kingpin_axis, bevel=.001)
        cylinder('Orange top bushing', .0082, .007, (0, .0245, .044), orange, truck, axis=kingpin_axis, bevel=.0013)
        cylinder('Upper bushing washer', .0093, .0015, (0, .026, .049), steel, truck, axis=kingpin_axis)
        cylinder('Kingpin nut', .0066, .005, (0, .027, .052), steel, truck, axis=kingpin_axis, segments=6)
        for side in [-1, 1]:
            position = (side * WHEEL_CENTER_X, AXLE_Y, AXLE_HEIGHT)
            lathe(f'Wheel_{number}_{side}', wheel_profile, position, green, truck, segments=96, profile_normals=True)
            for face in [-1, 1]:
                bearing_x = side * WHEEL_CENTER_X + face * .0128
                lathe('Bearing steel race', [(-.002, .0041), (-.002, .011), (.002, .011), (.002, .0041)],
                      (bearing_x, AXLE_Y, AXLE_HEIGHT), steel, truck, segments=40)
                lathe('Bearing dark shield', [(-.0002, .006), (-.0002, .0095), (.0002, .0095), (.0002, .006)],
                      (bearing_x + face * .0021, AXLE_Y, AXLE_HEIGHT), rubber, truck, segments=40)
            cylinder('Axle washer', .007, .001, (side * .098, AXLE_Y, AXLE_HEIGHT), steel, truck, axis=(1, 0, 0))
            cylinder('Axle locknut', .0064, .006, (side * .102, AXLE_Y, AXLE_HEIGHT), steel, truck, axis=(1, 0, 0), segments=6)
            cylinder('Nylon nut insert', .0035, .0003, (side * .1051, AXLE_Y, AXLE_HEIGHT), rubber, truck, axis=(1, 0, 0), segments=20, bevel=0)

    bpy.context.view_layer.update()
    for obj in hardware:
        if obj.name.startswith('Wheel_'):
            low = min((obj.matrix_world @ vertex.co).z for vertex in obj.data.vertices)
            assert low > .015, 'Wheels must clear the deck'
    for truck in [child for child in root.children if child != deck]:
        for mat, suffix in [(black, 'Casting'), (steel, 'Metal'), (rubber, 'Rubber'), (orange, 'Bushings')]:
            objects = [obj for obj in truck.children if obj.data.materials[0] == mat]
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = objects[0]
            bpy.ops.object.join()
            objects[0].name = f'{truck.name}_{suffix}'
    hardware = [obj for truck in root.children if truck != deck for obj in truck.children]
    return root, hardware
