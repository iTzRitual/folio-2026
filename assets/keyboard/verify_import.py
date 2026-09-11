import bpy
import json
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'keyboard.glb'))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
points = [o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
dimensions = [max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
assert abs(dimensions[0]-.308) < .00001
assert abs(dimensions[1]-.118) < .00001
assert .019 < dimensions[2] < .025
materials = {mat for o in meshes for mat in o.data.materials}
images = {node.image for mat in materials for node in mat.node_tree.nodes if node.type == 'TEX_IMAGE'}
assert len(materials) == 4 and len(images) == 1
assert all(tuple(image.size) == (1024,1024) for image in images)
assert all(image.packed_file for image in images)
assert all(o.type not in ['LIGHT','CAMERA'] for o in bpy.context.scene.objects)
legend = next(o for o in meshes if o.name == 'Keyboard_Legends')
assert len(legend.data.uv_layers) == 1
report = {'passed':True,'blender_version':bpy.app.version_string,'mesh_objects':len(meshes),'materials':len(materials),
          'packed_images':len(images),'blender_z_up_dimensions_m':dimensions,'legend_uvs':True,'cameras':0,'lights':0}
(OUT/'import-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
