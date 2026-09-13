import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
image = Image.new('RGBA',(1024,512),(0,0,0,0))
draw = ImageDraw.Draw(image)
font_path = os.environ.get('TURNTABLE_FONT','C:/Windows/Fonts/arial.ttf')
bold_path = os.environ.get('TURNTABLE_BOLD_FONT','C:/Windows/Fonts/arialbd.ttf')
ink = (184,188,186,255)
rects = {}


def logo(x,y,size):
    draw.ellipse((x,y,x+size,y+size),outline=ink,width=max(1,round(size*.025)))
    draw.line([(x+size*.19,y+size*.80),(x+size*.49,y+size*.13),(x+size*.77,y+size*.80),(x+size*.19,y+size*.80)],fill=ink,width=max(1,round(size*.022)))
    draw.line([(x+size*.48,y+size*.17),(x+size*.47,y+size*.79)],fill=ink,width=max(1,round(size*.021)))
    draw.line([(x+size*.49,y+size*.40),(x+size*.65,y+size*.79)],fill=ink,width=max(1,round(size*.021)))


def label(key,text,xy,size=34,bold=False):
    font = ImageFont.truetype(bold_path if bold else font_path,size)
    bbox = draw.textbbox((0,0),text,font=font)
    x,y = xy
    draw.text((x+3,y+3-bbox[1]),text,font=font,fill=ink)
    rects[key] = [x,y,bbox[2]+6,bbox[3]-bbox[1]+6]


logo(8,10,58)
draw.text((80,9),'audio-technica',font=ImageFont.truetype(bold_path,52),fill=ink)
rects['brand'] = [4,4,442,70]
label('model','AT-LP60X',(4,90),30)
label('start','START',(4,148),32)
label('stop','STOP',(170,148),32)
label('speed','33   45',(4,205),28)
label('size','12"\n 7"',(245,205),27)
draw.line([(374,173),(386,173),(386,150),(393,157),(386,150),(379,157)],fill=ink,width=2)
draw.line([(409,150),(421,150),(421,173),(428,166),(421,173),(414,166)],fill=ink,width=2)
rects['lift'] = [370,146,63,32]
logo(480,12,96)
rects['logo'] = [478,10,100,100]
image.save(OUT/'markings.png',optimize=True)
(OUT/'marking-rects.json').write_text(json.dumps(rects,indent=2)+'\n')
