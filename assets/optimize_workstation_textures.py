import io
import json
import struct
from pathlib import Path

from PIL import Image

MODELS = Path(__file__).resolve().parents[1] / "public" / "glbs"
COLOR_MAPS = {
    "edifier-r1280dbs": {"walnut": 512, "paper-fibers": 512},
    "music-cabinet": {"walnut": 1024, "spines": 1024},
    "monster-mango-loco": {"label": 1024},
}


def optimize(path, limits):
    data = path.read_bytes()
    json_size = struct.unpack_from("<I", data, 12)[0]
    doc = json.loads(data[20 : 20 + json_size])
    binary = memoryview(data)[28 + json_size :]
    replacements = {}
    for image in doc["images"]:
        limit = limits.get(image["name"])
        if not limit:
            continue
        index = image["bufferView"]
        view = doc["bufferViews"][index]
        start = view.get("byteOffset", 0)
        source = Image.open(io.BytesIO(binary[start : start + view["byteLength"]]))
        if image["mimeType"] == "image/jpeg" and max(source.size) <= limit:
            continue
        if "A" in source.getbands() and source.getchannel("A").getextrema() != (255, 255):
            raise ValueError(f"{image['name']} uses transparency")
        color = source.convert("RGB")
        color.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        color.save(encoded, "JPEG", quality=90, subsampling=0, optimize=True)
        replacements[index] = encoded.getvalue()
        image["mimeType"] = "image/jpeg"
    if not replacements:
        return
    packed = bytearray()
    for index, view in enumerate(doc["bufferViews"]):
        start = view.get("byteOffset", 0)
        payload = replacements.get(index, binary[start : start + view["byteLength"]])
        packed.extend(bytes(-len(packed) % 4))
        view.update(byteOffset=len(packed), byteLength=len(payload))
        packed.extend(payload)
    doc["buffers"][0]["byteLength"] = len(packed)
    packed.extend(bytes(-len(packed) % 4))
    metadata = json.dumps(doc, separators=(",", ":")).encode()
    metadata += b" " * (-len(metadata) % 4)
    output = struct.pack("<4sIIII", b"glTF", 2, 28 + len(metadata) + len(packed), len(metadata), 0x4E4F534A)
    path.write_bytes(output + metadata + struct.pack("<I4s", len(packed), b"BIN\x00") + packed)
    print(f"{path.name}: {len(data):,} -> {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    for model, limits in COLOR_MAPS.items():
        optimize(MODELS / (model + ".glb"), limits)
