import hashlib
import json
import struct
from pathlib import Path

OUT = Path(__file__).resolve().parent
path = OUT/'turntable.glb'
raw = path.read_bytes()
magic,version,length = struct.unpack_from('<III',raw)
assert (magic,version,length)==(0x46546C67,2,len(raw))
size,kind = struct.unpack_from('<II',raw,12)
assert kind==0x4E4F534A
doc = json.loads(raw[20:20+size])
assert all('uri' not in b for b in doc['buffers'])
assert all('bufferView' in i and 'uri' not in i for i in doc.get('images',[]))
assert not doc.get('cameras')
assert 'KHR_lights_punctual' not in doc.get('extensionsUsed',[])
assert 'KHR_materials_transmission' not in doc.get('extensionsUsed',[])
names = {node['name'] for node in doc['nodes']}
required = {'Turntable_ROOT','Chassis_UpperShell','Chassis_RoundedFrontFascia','Platter_Aluminum','Platter_FeltMat','Platter_CenterSpindle',
            'Adapter_45RPM','Adapter_StorageWell','Tonearm_Pivot','Tonearm_SilverTube','Tonearm_Cartridge_AT3600L','Tonearm_StylusHousing',
            'DustCover_HingePivot','DustCover_AcrylicShell','Control_Speed_Button','Control_Start_Button','Control_Stop_Button','Control_Lift_Button','Control_RecordSize_Lever'}
assert required<=names
assert all(node.get('scale',[1,1,1])==[1,1,1] for node in doc['nodes'])
root = next(n for n in doc['nodes'] if n['name']=='Turntable_ROOT')
assert root.get('translation',[0,0,0])==[0,0,0]
assert root.get('rotation',[0,0,0,1])==[0,0,0,1]
acrylic = next(m for m in doc['materials'] if m['name']=='AT | clear gray acrylic')
assert acrylic['alphaMode']=='BLEND'
assert 0<acrylic['pbrMetallicRoughness']['baseColorFactor'][3]<.2
assert not acrylic.get('doubleSided',False)
atlas = next(m for m in doc['materials'] if 'marking atlas' in m['name'])
assert atlas['alphaMode']=='MASK'
triangles = sum(doc['accessors'][p['indices']]['count']//3 for n in doc['nodes'] if 'mesh' in n for p in doc['meshes'][n['mesh']]['primitives'])
assert triangles<50000
assert len(doc['materials'])<=8
assert len(doc.get('images',[]))==1
assert len(raw)<1500000
source = json.loads((OUT/'model-measurements.json').read_text())
minimum,maximum = source['closed_bounds_m']['min'],source['closed_bounds_m']['max']
dimensions = [maximum[i]-minimum[i] for i in range(3)]
assert all(abs(a-b)<.0001 for a,b in zip(dimensions,[.3595,.0975,.3733]))
assert abs(minimum[1])<1e-7
assert raw==(OUT.parent.parent/'public/glbs/turntable.glb').read_bytes()
report = {'passed':True,'file':str(path.name),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'rendered_triangles':triangles,
          'mesh_nodes':sum('mesh' in n for n in doc['nodes']),'materials':len(doc['materials']),'embedded_images':len(doc['images']),
          'external_resources':0,'lights':0,'cameras':0,'acrylic_alpha_mode':'BLEND','acrylic_single_sided':True,
          'closed_dimensions_m':{'width':dimensions[0],'depth':dimensions[2],'height':dimensions[1]},'bottom_contact_y_m':minimum[1],
          'production_copy_identical':True,'named_components_present':True,'unit_scales':True}
(OUT/'asset-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
