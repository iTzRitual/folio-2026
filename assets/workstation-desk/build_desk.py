import bpy
from pathlib import Path

OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
bpy.context.scene.unit_settings.system = 'METRIC'
root = bpy.data.objects.new('Desk_ROOT', None)
bpy.context.collection.objects.link(root)
root['coordinates'] = 'meters; X right, Y up, +Z front; origin at center of top contact plane'
root['dimensions_m'] = [.95, .028, .90]
bpy.ops.mesh.primitive_cube_add(size=1, location=(0,-.014,0))
desk = bpy.context.object
desk.name = 'Desk_Tabletop'
desk.data.name = 'Desk_Tabletop'
desk.dimensions = (.95,.028,.90)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bevel = desk.modifiers.new('Softened edges', 'BEVEL')
bevel.width = .004
bevel.segments = 3
bpy.ops.object.modifier_apply(modifier=bevel.name)
for polygon in desk.data.polygons:
    polygon.use_smooth = True
normals = desk.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
normals.keep_sharp = True
bpy.ops.object.modifier_apply(modifier=normals.name)
mat = bpy.data.materials.new('Desk | satin carbon laminate')
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (.0065,.008,.010,1)
bsdf.inputs['Roughness'].default_value = .60
bsdf.inputs['Metallic'].default_value = .05
mat.diffuse_color = (.0065,.008,.010,1)
desk.data.materials.append(mat)
desk.parent = root
root.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'workstation-desk.glb'), export_format='GLB',
                          use_selection=True, export_yup=False, export_apply=True,
                          export_extras=True, export_cameras=False, export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'workstation-desk.blend'))
