import math
from pathlib import Path

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

    black = material('Truck | satin black cast aluminum', '#23262a', .39, .32)
    steel = material('Hardware | brushed steel', '#989c97', .28, .88)
    rubber = material('Pivot cups and bearing shields', '#171a1b', .75)
    orange = material('Bushings | orange urethane', '#ed9b31', .43)
    green = material('Wheels | plain lime urethane', '#8bd600', .43)
    print_mat = material('Hanger | photographic white branding', '#ffffff', .46)
    image = bpy.data.images.load(str(Path(__file__).with_name('truck-front-reference.png')))
    texture = print_mat.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    print_mat.node_tree.links.new(texture.outputs['Color'], print_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

    def finish(obj, name, mat, parent, bevel=0):
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

    def lathe(name, profile, position, mat, parent, segments=64):
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
        obj = finish(obj, name, mat, parent)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        return obj

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
        mesh = bpy.data.meshes.new('Hanger print')
        print_vertices = []
        print_uvs = []
        for row in range(13):
            y = -.015 + row / 12 * .012
            z = AXLE_HEIGHT + math.sqrt(.0092 ** 2 - (y - AXLE_Y) ** 2) + .00018
            for side, u in [(-1, 134 / 387), (1, 258 / 387)]:
                print_vertices.append((side * .036, y, z))
                print_uvs.append((u, 1 - (106 - row / 12 * 25) / 516))
        mesh.from_pydata(print_vertices, [], [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(12)])
        uv = mesh.uv_layers.new()
        for polygon in mesh.polygons:
            for index in polygon.loop_indices:
                uv.data[index].uv = print_uvs[mesh.loops[index].vertex_index]
        label = bpy.data.objects.new('Hanger branding', mesh)
        bpy.context.collection.objects.link(label)
        finish(label, 'Hanger branding', print_mat, truck)
        for side in [-1, 1]:
            position = (side * WHEEL_CENTER_X, AXLE_Y, AXLE_HEIGHT)
            lathe(f'Wheel_{number}_{side}', [(-.013, .011), (-.016, .017), (-.0155, .021),
                                           (-.012, .0255), (-.008, WHEEL_RADIUS), (.008, WHEEL_RADIUS),
                                           (.012, .0255), (.0155, .021), (.016, .017), (.013, .011)], position, green, truck)
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
        for mat, suffix in [(black, 'Casting'), (steel, 'Metal'), (rubber, 'Rubber'), (orange, 'Bushings'), (print_mat, 'Branding')]:
            objects = [obj for obj in truck.children if obj.data.materials[0] == mat]
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = objects[0]
            bpy.ops.object.join()
            objects[0].name = f'{truck.name}_{suffix}'
    hardware = [obj for truck in root.children if truck != deck for obj in truck.children]
    return root, hardware
