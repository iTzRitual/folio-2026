import json
import struct
from pathlib import Path

root=Path(__file__).resolve().parent
raw=(root/'crt-monitor.glb').read_bytes()
magic,version,length=struct.unpack_from('<III',raw)
assert magic==0x46546C67 and version==2 and length==len(raw)
size,kind=struct.unpack_from('<II',raw,12)
g=json.loads(raw[20:20+size])
assert len(g['materials'])==4
assert not g.get('images')
assert not g.get('cameras')
for n in g['nodes']:
    assert n.get('translation',[0,0,0])==[0,0,0],n['name']
    assert n.get('rotation',[0,0,0,1])==[0,0,0,1],n['name']
    assert n.get('scale',[1,1,1])==[1,1,1],n['name']
triangles=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
assert 35000<=triangles<=80000
screen=next(n for n in g['nodes'] if n['name']=='CRT_Screen')
p=g['meshes'][screen['mesh']]['primitives'][0]
a=g['accessors'][p['attributes']['POSITION']]
assert abs(a['max'][0]-.176)<1e-6 and abs(a['min'][0]+.176)<1e-6
assert abs(a['max'][1]-.132)<1e-6 and abs(a['min'][1]+.132)<1e-6
assert abs(a['max'][2])<1e-6
assert 'TEXCOORD_0' in p['attributes']
bin_start=20+size+8
norm=g['accessors'][p['attributes']['NORMAL']]
view=g['bufferViews'][norm['bufferView']]
offset=bin_start+view.get('byteOffset',0)+norm.get('byteOffset',0)
stride=view.get('byteStride',12)
assert all(struct.unpack_from('<fff',raw,offset+i*stride)[2]>.9 for i in range(norm['count']))
report={'passed':True,'triangles':triangles,'mesh_objects':len(g['meshes']),'materials':len(g['materials']),'bytes':len(raw),'identity_transforms':True,'screen_faces_positive_z':True,'screen_4_3':True,'textures':0,'draw_primitives':sum(len(m['primitives']) for m in g['meshes'])}
(root/'validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
