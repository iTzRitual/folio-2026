import bpy,math
from pathlib import Path
scene=bpy.context.scene
camera=scene.camera
camera.location=(0,-.1755,.4);camera.rotation_euler=(0,0,0);camera.data.ortho_scale=.080
scene.render.resolution_x=1400;scene.render.resolution_y=400;scene.render.resolution_percentage=100
scene.cycles.samples=32
scene.render.filepath=str(Path('assets/crt-monitor/badge-detail.png').resolve())
bpy.ops.render.render(write_still=True)
