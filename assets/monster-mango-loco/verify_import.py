from pathlib import Path
import bpy
import json
from mathutils import Vector

OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT / 'monster-mango-loco.glb'))
meshes = [ob for ob in bpy.context.scene.objects if ob.type == 'MESH']
points = [ob.matrix_world @ Vector(corner) for ob in meshes for corner in ob.bound_box]
dimensions = [max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
assert all(abs(a-b) < 1e-6 for a, b in zip(dimensions, [.066,.066,.168]))
assert abs(min(p.z for p in points)) < 1e-6
materials = {mat for ob in meshes for mat in ob.data.materials}
images = {n.image for mat in materials for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE'}
assert len(images) == 1
assert all(image.packed_file for image in images)
assert all(ob.type not in ['LIGHT', 'CAMERA'] for ob in bpy.context.scene.objects)
body = next(ob for ob in meshes if ob.name == 'Printed body and tapered shoulders')
assert len(body.data.uv_layers) == 1
assert (OUT / 'monster-mango-loco.glb').read_bytes() == (OUT.parents[1] / 'public/glbs/monster-mango-loco.glb').read_bytes()
report = {'passed': True, 'dimensions_m': dimensions, 'base_on_ground': True,
          'meshes': len(meshes), 'materials': len(materials), 'embedded_images': len(images),
          'image_size': list(next(iter(images)).size), 'runtime_asset_matches': True}
(OUT / 'import-validation.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report))
