import json
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent
image = Image.open(OUT / 'shape-reference.png').convert('RGB')
rows = []
for y in range(image.height):
    xs = [x for x in range(260) if max(image.getpixel((x, y))) < 150]
    if xs:
        rows.append((y, (max(xs) - min(xs) + 1) / 2))
first, last = rows[0][0], rows[-1][0]
body_widths = sorted(width for y, width in rows if 200 < y < 800)
maximum = body_widths[len(body_widths) // 2]
samples = sorted(set([first, first + 2, first + 5, last - 5, last - 2, last]
                     + list(range(first + 10, last - 5, 10))))
widths = dict(rows)
profile = []
for y in samples:
    radius = min(15, y - first, last - y)
    neighbors = [widths[r] for r in range(y - radius, y + radius + 1)]
    width = min(1, (sum(w * w for w in neighbors) / len(neighbors)) ** .5 / maximum)
    if y in [first, last]:
        width = 0
    profile.append([(y - first) / (last - first), width * width])
result = {
    'source': 'shape-reference.png, left griptape silhouette',
    'source_y_bounds_px': [first, last],
    'source_width_px': maximum * 2,
    'samples': profile,
}
(OUT / 'shape-profile.json').write_text(json.dumps(result, indent=2) + '\n')
