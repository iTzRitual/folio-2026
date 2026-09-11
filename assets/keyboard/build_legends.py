import json
import math
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from layout import keys

OUT = Path(__file__).resolve().parent
SIZE = 1024
SUPERSAMPLE = 4
FONT = Path(os.environ.get('KEYBOARD_FONT', 'C:/Windows/Fonts/arial.ttf'))
assert FONT.exists(), 'Set KEYBOARD_FONT to a sans-serif TrueType font'
atlas = Image.new('RGBA', (SIZE * SUPERSAMPLE, SIZE * SUPERSAMPLE), (220, 225, 231, 0))
draw = ImageDraw.Draw(atlas)
rectangles = {}
x = y = 0
height = 90
ink = (218, 223, 230, 255)


def line(points, width=0.9):
    draw.line([(round(px * SUPERSAMPLE), round(py * SUPERSAMPLE)) for px, py in points], fill=ink, width=max(1, round(width * SUPERSAMPLE)))


def ellipse(box, width=0.9):
    draw.ellipse(tuple(round(v * SUPERSAMPLE) for v in box), outline=ink, width=max(1, round(width * SUPERSAMPLE)))


def text(value, cx, cy, size):
    font = ImageFont.truetype(str(FONT), round(size * 1.45 * SUPERSAMPLE))
    draw.text((round(cx * SUPERSAMPLE), round(cy * SUPERSAMPLE)), value, font=font, fill=ink, anchor='mm', stroke_width=0)


def icon(name, cx, cy):
    if name in ['sun', 'sun-low', 'light']:
        radius = 3 if name == 'sun-low' else 4
        ellipse((cx-radius, cy-radius, cx+radius, cy+radius))
        for i in range(8):
            a = i * math.pi / 4
            line([(cx+(radius+2)*math.cos(a), cy+(radius+2)*math.sin(a)),
                  (cx+(radius+4)*math.cos(a), cy+(radius+4)*math.sin(a))])
    elif name in ['keys', 'keys-low']:
        line([(cx-6, cy+3), (cx+6, cy+3)])
        for i in range(5):
            a = (i + 2) * math.pi / 8
            line([(cx+5*math.cos(a), cy+1-5*math.sin(a)), (cx+8*math.cos(a), cy+1-8*math.sin(a))])
    elif name == 'grid':
        for dx in [-5, 0, 5]:
            for dy in [-4, 1, 6]:
                draw.rectangle(((cx+dx-1)*SUPERSAMPLE, (cy+dy-1)*SUPERSAMPLE, (cx+dx+1)*SUPERSAMPLE, (cy+dy+1)*SUPERSAMPLE), fill=ink)
    elif name in ['windows', 'capture']:
        for dx, dy in ([(-3, -2), (3, 2)] if name == 'windows' else [(0, 0)]):
            line([(cx-4+dx, cy-4+dy), (cx+4+dx, cy-4+dy), (cx+4+dx, cy+4+dy), (cx-4+dx, cy+4+dy), (cx-4+dx, cy-4+dy)])
    elif name in ['previous', 'play', 'next']:
        sign = -1 if name == 'previous' else 1
        for dx in ([-4, 3] if name != 'play' else [-2]):
            line([(cx+dx-3*sign, cy-4), (cx+dx+3*sign, cy), (cx+dx-3*sign, cy+4), (cx+dx-3*sign, cy-4)])
        if name == 'play':
            line([(cx+5, cy-4), (cx+5, cy+4)])
    elif name in ['volume', 'volume-low', 'mute']:
        line([(cx-6,cy-2),(cx-3,cy-2),(cx,cy-5),(cx,cy+5),(cx-3,cy+2),(cx-6,cy+2),(cx-6,cy-2)])
        if name != 'mute':
            for radius in ([4, 7] if name == 'volume' else [4]):
                line([(cx+radius*math.cos(a), cy+radius*math.sin(a)) for a in [-0.8,-0.4,0,0.4,0.8]])
    elif name == 'command':
        for dx in [-5, 5]:
            for dy in [-5, 5]:
                ellipse((cx+dx-2.5,cy+dy-2.5,cx+dx+2.5,cy+dy+2.5), 1.1)
        line([(cx-2.5,cy-5),(cx-2.5,cy+5)], 1.1)
        line([(cx+2.5,cy-5),(cx+2.5,cy+5)], 1.1)
        line([(cx-5,cy-2.5),(cx+5,cy-2.5)], 1.1)
        line([(cx-5,cy+2.5),(cx+5,cy+2.5)], 1.1)
    elif name in ['left', 'right', 'up', 'down']:
        a = {'up':0,'right':math.pi/2,'down':math.pi,'left':-math.pi/2}[name]
        line([(cx+px*math.cos(a)-py*math.sin(a), cy+px*math.sin(a)+py*math.cos(a)) for px, py in [(-4,2),(0,-2),(4,2)]], 1.1)


for item in keys():
    if item['label'] == 'space':
        continue
    width = round(90 * item['units'])
    if x + width > SIZE:
        x = 0
        y += height
    assert y + height <= SIZE
    rectangles[item['id']] = [x, y, width, height]
    cx, cy = x + width / 2, y + height / 2
    label = item['label']
    secondary = item['secondary']
    if secondary:
        text(label, cx, cy + 14, 10 if label.startswith('F') else 13)
        if label.startswith('F'):
            icon(secondary, cx, cy - 12)
        else:
            text(secondary, cx, cy - 12, 12)
    elif label in ['command', 'capture', 'light', 'left', 'right', 'up', 'down']:
        icon(label, cx, cy)
    else:
        label = {'control':'ctrl', 'page up':'pgup', 'page down':'pgdn', 'delete':'del'}.get(label, label)
        text(label, cx, cy, 13 if len(label) == 1 else 10.5)
    x += width

atlas.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(OUT / 'legends.png')
(OUT / 'legend-rects.json').write_text(json.dumps(rectangles, indent=2))
print(f'Generated {len(rectangles)} legends in one {SIZE}px atlas')
