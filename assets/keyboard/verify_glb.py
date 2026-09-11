import hashlib
import json
import math
import struct
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent


def inspect(path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from('<III', raw)
    assert (magic, version, length) == (0x46546C67, 2, len(raw))
    size, kind = struct.unpack_from('<II', raw, 12)
    assert kind == 0x4E4F534A
    doc = json.loads(raw[20:20+size])
    binary = raw[28+size:]
    assert not doc.get('cameras')
    assert 'KHR_lights_punctual' not in doc.get('extensionsUsed', [])
    assert all('uri' not in buffer for buffer in doc['buffers'])
    assert all('bufferView' in image and 'uri' not in image for image in doc.get('images', []))

    def values(index):
        accessor = doc['accessors'][index]
        view = doc['bufferViews'][accessor['bufferView']]
        n = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[accessor['type']]
        fmt = {5126:'f',5125:'I',5123:'H',5121:'B'}[accessor['componentType']]
        item_size = struct.calcsize('<'+fmt*n)
        start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        return [struct.unpack_from('<'+fmt*n, binary, start+i*view.get('byteStride',item_size)) for i in range(accessor['count'])]

    minimum, maximum = [math.inf]*3, [-math.inf]*3
    rendered_triangles = objects = draws = key_count = 0
    unique_triangles = sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
    for node in doc['nodes']:
        assert 'matrix' not in node
        assert node.get('rotation', [0,0,0,1]) == [0,0,0,1]
        assert node.get('scale', [1,1,1]) == [1,1,1]
        if 'mesh' not in node:
            assert node.get('translation',[0,0,0]) == [0,0,0]
            continue
        translations = [(0,0,0)]
        attrs = node.get('extensions',{}).get('EXT_mesh_gpu_instancing',{}).get('attributes')
        if attrs:
            translations = values(attrs['TRANSLATION'])
            assert all(tuple(v) == (0,0,0,1) for v in values(attrs['ROTATION']))
            assert all(tuple(v) == (1,1,1) for v in values(attrs['SCALE']))
        mesh = doc['meshes'][node['mesh']]
        if mesh['name'].startswith('Keycap_'):
            key_count += len(translations)
        objects += len(translations)
        draws += len(mesh['primitives'])
        for primitive in mesh['primitives']:
            rendered_triangles += doc['accessors'][primitive['indices']]['count']//3 * len(translations)
            position = doc['accessors'][primitive['attributes']['POSITION']]
            for translation in translations:
                for axis in range(3):
                    offset = translation[axis] + node.get('translation',[0,0,0])[axis]
                    minimum[axis] = min(minimum[axis], position['min'][axis]+offset)
                    maximum[axis] = max(maximum[axis], position['max'][axis]+offset)
    report = {
        'passed':True, 'file':path.name, 'sha256':hashlib.sha256(raw).hexdigest(),
        'dimensions_m':{'width':maximum[0]-minimum[0], 'height':maximum[1]-minimum[1], 'depth':maximum[2]-minimum[2]},
        'bounds_m':{'min':minimum,'max':maximum}, 'triangles':rendered_triangles,
        'unique_mesh_triangles':unique_triangles, 'mesh_objects_including_instances':objects,
        'gltf_nodes':len(doc['nodes']), 'unique_meshes':len(doc['meshes']), 'draw_primitives':draws,
        'materials':len(doc['materials']), 'textures':len(doc.get('textures',[])), 'images':len(doc.get('images',[])),
        'bytes':len(raw), 'key_count':key_count, 'external_resources':0, 'cameras':0,'lights':0,
        'rotation_and_scale_applied':True, 'translation_only_instances':True,
    }
    if path.name == 'keyboard.glb':
        assert key_count == 84
        assert rendered_triangles < 40000
        assert report['materials'] == 4 and report['textures'] == 1 and report['images'] == 1
        assert .30 <= maximum[0]-minimum[0] <= .31
        assert .115 <= maximum[2]-minimum[2] <= .12
        assert .019 <= maximum[1]-minimum[1] <= .025
        assert abs(minimum[1]) < 1e-7
        assert any(n['name'] == 'Keyboard_ROOT' for n in doc['nodes'])
        legend = next(m for m in doc['materials'] if 'legend atlas' in m['name'])
        assert legend['alphaMode'] == 'MASK'
        assert abs(legend['alphaCutoff']-.35) < 1e-6
        legend_node = next(n for n in doc['nodes'] if n['name'] == 'Keyboard_Legends')
        primitive = doc['meshes'][legend_node['mesh']]['primitives'][0]
        assert 'TEXCOORD_0' in primitive['attributes']
        assert all(0 <= u <= 1 and 0 <= v <= 1 for u,v in values(primitive['attributes']['TEXCOORD_0']))
        image_view = doc['bufferViews'][doc['images'][0]['bufferView']]
        image_start = image_view.get('byteOffset',0)
        image = binary[image_start:image_start+image_view['byteLength']]
        assert image[:8] == b'\x89PNG\r\n\x1a\n'
        assert struct.unpack_from('>II',image,16) == (1024,1024)
        report['legend_atlas'] = {'width':1024,'height':1024,'embedded':True,'alpha_mode':'MASK','legend_count':83}
    else:
        assert rendered_triangles < 500
        assert abs(maximum[1]) < 1e-7
    (path.parent/'asset-report.json').write_text(json.dumps(report,indent=2)+'\n')
    return report


if __name__ == '__main__':
    paths = [Path(arg) for arg in sys.argv[1:]] or [OUT/'keyboard.glb', OUT.parent/'workstation-desk'/'workstation-desk.glb']
    for path in paths:
        print(json.dumps(inspect(path),indent=2))
