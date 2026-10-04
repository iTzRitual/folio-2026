import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent
raw = (OUT.parents[1] / 'public/glbs/skateboard-deck.glb').read_bytes()
length = struct.unpack_from('<I', raw, 12)[0]
document = json.loads(raw[20:20 + length])
binary = raw[28 + length:]


def accessor(index):
    item = document['accessors'][index]
    view = document['bufferViews'][item['bufferView']]
    dtype = {5123: '<u2', 5125: '<u4', 5126: '<f4'}[item['componentType']]
    columns = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[item['type']]
    size = np.dtype(dtype).itemsize
    return np.ndarray((item['count'], columns), dtype=dtype, buffer=binary,
                      offset=view.get('byteOffset', 0) + item.get('byteOffset', 0),
                      strides=(view.get('byteStride', size * columns), size))


triangles = []
for primitive in document['meshes'][0]['primitives']:
    positions = accessor(primitive['attributes']['POSITION'])
    indices = accessor(primitive['indices']).reshape(-1, 3)
    triangles.append(positions[indices])
triangles = np.concatenate(triangles)
vertices = triangles.reshape(-1, 3)
width = float(np.ptp(vertices[:, 0]))
length = float(np.ptp(vertices[:, 1]))
assert abs(width - .2032) < 1e-6, 'Finished deck must be exactly eight inches wide'
assert abs(length - .805) < 1e-6, 'Deck length must preserve wall placement'
image = np.asarray(Image.open(OUT / 'shape-reference.png').convert('RGB'))[:, :260]
mask = image.max(axis=2) < 150
rows = np.flatnonzero(mask.any(axis=1))
reference_widths = [np.ptp(np.flatnonzero(mask[row])) + 1 for row in rows]
reference_nominal_width = float(np.median(reference_widths[len(rows) // 5:len(rows) * 4 // 5]))
pixel_scale = reference_nominal_width / width
start = triangles[:, [0, 1, 2], :2].reshape(-1, 2)
end = triangles[:, [1, 2, 0], :2].reshape(-1, 2)
errors = []
for row, reference_width in zip(rows[2:-2], reference_widths[2:-2]):
    y = length * (.5 - (row - rows[0]) / (rows[-1] - rows[0]))
    crossed = (start[:, 1] <= y) != (end[:, 1] <= y)
    a, b = start[crossed], end[crossed]
    xs = a[:, 0] + (y - a[:, 1]) * (b[:, 0] - a[:, 0]) / (b[:, 1] - a[:, 1])
    model_width = np.ptp(xs) * pixel_scale
    errors.append(abs(float(model_width) - reference_width))
rmse = float(np.sqrt(np.mean(np.square(errors))))
maximum = max(errors)
assert rmse < 1.5, f'Silhouette must match the supplied reference: RMSE {rmse:.2f}px'
assert maximum < 4, f'Silhouette deviation is too large: {maximum:.2f}px'
report = {'passed': True, 'width_m': width, 'length_m': length,
          'reference_width_px': reference_nominal_width, 'compared_rows': len(errors),
          'silhouette_width_rmse_px': rmse, 'silhouette_width_max_error_px': maximum}
(OUT / 'shape-validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
