from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[1] / 'public/textures/music-cabinet'
wood = Image.open(ROOT / 'reference.png').convert('RGB')
veneer = wood.transform((1024, 1024), Image.Transform.QUAD, (160, 132, 158, 965, 506, 1005, 506, 153), Image.Resampling.BICUBIC)
veneer = veneer.filter(ImageFilter.UnsharpMask(radius=1.2, percent=125, threshold=2))
tile = Image.new('RGB', (2048, 2048))
tile.paste(veneer, (0, 0))
tile.paste(veneer.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (1024, 0))
tile.paste(veneer.transpose(Image.Transpose.FLIP_TOP_BOTTOM), (0, 1024))
tile.paste(veneer.transpose(Image.Transpose.ROTATE_180), (1024, 1024))
rng = np.random.default_rng(17)
fibers = Image.fromarray(rng.integers(0, 256, (128, 2048), dtype=np.uint8)).resize((2048, 2048), Image.Resampling.BICUBIC)
detail = (np.asarray(fibers, dtype=np.float32) - 127.5) / 32
pixels = np.asarray(tile, dtype=np.float32) + detail[:, :, None]
Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8)).save(OUT / 'walnut.jpg', quality=95, subsampling=0)

spines = Image.open(ROOT / 'spines-reference.png').convert('RGB')
w, h = spines.size
spines.crop((int(w * .19), int(h * .108), int(w * .795), int(h * .934))).resize((1024, 2048), Image.Resampling.LANCZOS).save(OUT / 'spines.jpg', quality=92)
Image.open(ROOT / 'cover-reference.png').convert('RGB').save(OUT / 'invaders-must-die.jpg', quality=95)
