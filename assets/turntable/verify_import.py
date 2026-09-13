import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'turntable.glb'))
meshes = [o for o in bpy.context.scene.objects if o.type=='MESH']
materials = {m for o in meshes for m in o.data.materials}
images = {node.image for mat in materials for node in mat.node_tree.nodes if node.type=='TEX_IMAGE'}
assert len(materials)==8 and len(images)==1
assert all(i.packed_file and tuple(i.size)==(1024,512) for i in images)
assert not any(o.type in ['LIGHT','CAMERA'] for o in bpy.context.scene.objects)
pivot = bpy.data.objects['DustCover_HingePivot']
assert abs(abs(pivot.rotation_quaternion.angle)-math.radians(65))<1e-5
def bounds():
    bpy.context.view_layer.update()
    points=[o.matrix_world@Vector(corner) for o in meshes for corner in o.bound_box]
    return {'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
opened = bounds()
pivot.rotation_quaternion.identity()
pivot.rotation_euler = (0,0,0)
closed = bounds()
dimensions = [closed['max'][i]-closed['min'][i] for i in range(3)]
assert all(abs(a-b)<.0001 for a,b in zip(dimensions,[.3595,.3733,.0975]))
assert abs(closed['min'][2])<1e-7
cover = bpy.data.objects['DustCover_AcrylicShell']
assert cover.parent==pivot
assert cover.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value<.2
report={'passed':True,'blender_version':bpy.app.version_string,'blender_import_axis':'Z up, -Y front','closed_dimensions_m':dimensions,
        'open_bounds_m':opened,'closed_bounds_m':closed,'mesh_objects':len(meshes),'materials':len(materials),'packed_images':len(images),
        'cover_pivot_preserved':True,'cover_alpha_preserved':True,'bottom_contact_preserved':True,'cameras':0,'lights':0}
(OUT/'import-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
