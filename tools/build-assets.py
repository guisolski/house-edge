#!/usr/bin/env python3
"""Build neon-night atlas + pixelized AI sprites + Tiled maps for House Edge."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets"
MAPS = ROOT / "public" / "maps"
CC0 = Path("/tmp/cc0")
AI = Path("/opt/cursor/artifacts/assets")
VENDOR_AI = ROOT / "vendor" / "cc0" / "ai-source"

TILE = 16
NEON = [
    (5, 4, 12),
    (10, 10, 24),
    (22, 22, 40),
    (42, 42, 60),
    (26, 21, 40),
    (74, 48, 40),
    (196, 24, 122),
    (26, 106, 122),
    (255, 43, 214),
    (43, 255, 242),
    (184, 255, 43),
    (255, 122, 61),
    (0, 156, 59),
    (255, 223, 0),
    (0, 39, 118),
    (245, 197, 24),
    (255, 59, 92),
    (255, 224, 138),
    (244, 244, 255),
    (0, 0, 0),
]


def nearest(c: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    if c[3] < 32:
        return (0, 0, 0, 0)
    r, g, b = c[0], c[1], c[2]
    best = NEON[0]
    best_d = 1e18
    for p in NEON:
        d = (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2
        if d < best_d:
            best_d = d
            best = p
    return (*best, 255)


def quantize_rgba(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            px[x, y] = nearest(px[x, y])
    return im


def to_tile(im: Image.Image, size: int = TILE) -> Image.Image:
    im = im.convert("RGBA")
    # Drop near-white / photo backgrounds for AI art
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            if r > 240 and g > 240 and b > 240:
                px[x, y] = (0, 0, 0, 0)
            elif r > 220 and g > 220 and b > 230 and abs(r - b) < 20:
                px[x, y] = (0, 0, 0, 0)
    # Scale down with box filter for crisp pixels
    im = im.resize((size, size), Image.Resampling.BOX)
    return quantize_rgba(im)


def slice_sheet(path: Path, tile: int, spacing: int = 0, margin: int = 0) -> list[Image.Image]:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    tiles: list[Image.Image] = []
    step = tile + spacing
    y = margin
    while y + tile <= h:
        x = margin
        while x + tile <= w:
            tiles.append(im.crop((x, y, x + tile, y + tile)))
            x += step
        y += step
    return tiles


def neon_shift(im: Image.Image) -> Image.Image:
    """Push midtones toward cyan/magenta night without losing structure."""
    im = im.convert("RGBA")
    # Darken + boost contrast slightly
    rgb = ImageEnhance.Brightness(im.convert("RGB")).enhance(0.72)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.25)
    rgb = ImageEnhance.Color(rgb).enhance(1.35)
    out = Image.new("RGBA", im.size)
    src = rgb.load()
    achan = im.split()[3]
    ap = achan.load()
    dst = out.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if ap[x, y] < 16:
                dst[x, y] = (0, 0, 0, 0)
                continue
            r, g, b = src[x, y]
            # Bias blues/cyans up, keep magentas
            b = min(255, int(b * 1.15 + 8))
            r = min(255, int(r * 0.95))
            dst[x, y] = nearest((r, g, b, 255))
    return out


def build_atlas() -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    urban_tiles = sorted((CC0 / "urban" / "Tiles").glob("tile_*.png"))
    modern = slice_sheet(
        CC0 / "modern" / "Spritesheet" / "roguelikeCity_transparent.png",
        16,
        spacing=1,
        margin=0,
    )
    # Curated picks: roads, sidewalks, buildings, props from urban pack
    picks = list(range(0, 80)) + list(range(120, 200)) + list(range(300, 360))
    entries: list[tuple[str, Image.Image]] = []

    def add(name: str, im: Image.Image) -> None:
        entries.append((name, neon_shift(im.convert("RGBA"))))

    for i in picks:
        if i < len(urban_tiles):
            add(f"urban_{i:04d}", Image.open(urban_tiles[i]))
    for i, t in enumerate(modern):
        if i % 7 == 0 or i < 40:  # subsample dense sheet
            add(f"modern_{i:04d}", t)

    # Market stalls (CC0 Reflextions)
    for i, name in enumerate(["market1.png", "market2.png", "market3.png"]):
        p = CC0 / name
        if p.exists():
            add(f"market_{i}", Image.open(p).resize((32, 32), Image.Resampling.NEAREST))

    # Procedural-ish solid tiles for collision-friendly fills
    solids = {
        "void": (5, 4, 12, 255),
        "asphalt": (22, 22, 40, 255),
        "asphalt_line": (58, 58, 40, 255),
        "sidewalk": (42, 42, 60, 255),
        "alley": (26, 21, 40, 255),
        "plaza": (36, 36, 52, 255),
        "stairs": (74, 48, 40, 255),
        "grass_night": (14, 40, 28, 255),
        "interior": (32, 28, 40, 255),
        "exit": (0, 156, 59, 255),
        "blocked": (8, 8, 16, 255),
    }
    for name, col in solids.items():
        im = Image.new("RGBA", (TILE, TILE), col)
        # speckles
        px = im.load()
        for y in range(0, TILE, 4):
            for x in range(0, TILE, 5):
                if (x + y) % 3 == 0:
                    px[x, y] = nearest((col[0] + 20, col[1] + 20, col[2] + 30, 255))
        add(name, im)

    # AI pixel props
    ai_map = {
        "ai_favela": "ai-favela-stack.jpg",
        "ai_boteco": "ai-boteco.jpg",
        "ai_feira": "ai-feira-stalls.jpg",
        "ai_signs": "ai-neon-signs.jpg",
        "ai_npcs": "ai-npc-sheet.jpg",
    }
    for key, fname in ai_map.items():
        src = AI / fname
        if not src.exists():
            src = VENDOR_AI / fname
        if not src.exists():
            continue
        raw = Image.open(src).convert("RGBA")
        if key == "ai_npcs":
            # Slice 6 character cells from sheet into 24x24 sprites
            w, h = raw.size
            cell_w = w // 6
            for i in range(6):
                cell = raw.crop((i * cell_w, 0, (i + 1) * cell_w, h))
                add(f"npc_{i}", to_tile(cell, 24))
        elif key == "ai_signs":
            w, h = raw.size
            cell_w = w // 4
            for i, label in enumerate(["boteco", "laje", "odds", "casa"]):
                cell = raw.crop((i * cell_w, 0, (i + 1) * cell_w, h))
                add(f"sign_{label}", to_tile(cell, 48))
        elif key == "ai_feira":
            w, h = raw.size
            for i in range(3):
                cell = raw.crop((i * w // 3, 0, (i + 1) * w // 3, h))
                add(f"stall_{i}", to_tile(cell, 32))
        else:
            size = 48 if key == "ai_favela" else 40
            add(key, to_tile(raw, size))

    # Pack atlas
    cols = 32
    rows = math.ceil(len(entries) / cols)
    atlas = Image.new("RGBA", (cols * TILE, rows * TILE), (0, 0, 0, 0))
    meta = {"tile": TILE, "columns": cols, "tiles": {}}
    for idx, (name, im) in enumerate(entries):
        x = (idx % cols) * TILE
        y = (idx // cols) * TILE
        # Place center-cropped/padded into 16x16 cell for ground tiles;
        # larger sprites stored separately as PNG files.
        if im.size[0] != TILE or im.size[1] != TILE:
            # export oversized sprite
            sprite_path = OUT / "sprites" / f"{name}.png"
            sprite_path.parent.mkdir(parents=True, exist_ok=True)
            quantize_rgba(im).save(sprite_path)
            meta["tiles"][name] = {"kind": "sprite", "file": f"sprites/{name}.png", "w": im.size[0], "h": im.size[1]}
            # also stamp a 16x16 icon in atlas for map painting
            icon = im.resize((TILE, TILE), Image.Resampling.NEAREST)
            atlas.paste(quantize_rgba(icon), (x, y))
            meta["tiles"][name]["gid"] = idx + 1
            meta["tiles"][name]["atlas"] = [x, y]
        else:
            atlas.paste(quantize_rgba(im), (x, y))
            meta["tiles"][name] = {"kind": "tile", "gid": idx + 1, "atlas": [x, y]}

    atlas_path = OUT / "neon-atlas.png"
    atlas.save(atlas_path)
    (OUT / "neon-atlas.json").write_text(json.dumps(meta, indent=2))
    print(f"atlas {atlas_path} {atlas.size} entries={len(entries)}")
    return meta


def paint_morro(meta: dict) -> dict:
    """Hand-composed hillside favela — stairs climb north, dense houses, wires."""
    w, h = 42, 28
    gid = {k: v["gid"] for k, v in meta["tiles"].items() if "gid" in v}
    asphalt = gid.get("asphalt", 1)
    sidewalk = gid.get("sidewalk", 1)
    alley = gid.get("alley", 1)
    stairs = gid.get("stairs", 1)
    grass = gid.get("grass_night", 1)
    blocked = gid.get("blocked", 1)
    exit_g = gid.get("exit", 1)
    urban_road = gid.get("urban_0010", asphalt)
    urban_side = gid.get("urban_0020", sidewalk)

    data = [grass] * (w * h)
    coll = [0] * (w * h)  # 0 walkable, 1 blocked

    def setg(x, y, g, block=False):
        if 0 <= x < w and 0 <= y < h:
            data[y * w + x] = g
            coll[y * w + x] = 1 if block else 0

    # Main horizontal road mid-slope
    for x in range(2, 40):
        for y in (13, 14, 15):
            setg(x, y, urban_road if y == 14 else asphalt)
    # Vertical alleys / stairs climbing the hill
    for y in range(2, 26):
        setg(10, y, stairs if y < 13 else alley)
        setg(11, y, sidewalk)
        setg(22, y, stairs if y % 2 == 0 else alley)
        setg(30, y, alley)
    # Sidewalk belts
    for x in range(2, 40):
        setg(x, 12, urban_side)
        setg(x, 16, urban_side)
    # Dense house footprints (blocked + building markers via objects)
    houses = []
    for i, (hx, hy) in enumerate(
        [
            (4, 4),
            (6, 6),
            (8, 5),
            (13, 3),
            (15, 5),
            (17, 7),
            (19, 4),
            (24, 3),
            (26, 6),
            (28, 4),
            (32, 5),
            (34, 7),
            (5, 18),
            (7, 20),
            (14, 18),
            (16, 20),
            (24, 19),
            (27, 21),
            (33, 18),
            (35, 20),
            (18, 10),
            (25, 11),
            (31, 10),
        ]
    ):
        for dx in range(3):
            for dy in range(2):
                setg(hx + dx, hy + dy, blocked, block=True)
        houses.append({"x": hx, "y": hy, "w": 3, "h": 2, "style": i % 4, "kind": "morro"})
    # Plaza / boteco pocket
    for x in range(12, 18):
        for y in range(13, 16):
            setg(x, y, gid.get("plaza", sidewalk))
    # Exit pad east
    setg(38, 14, exit_g)
    setg(38, 15, exit_g)
    # Border walls
    for x in range(w):
        setg(x, 0, blocked, True)
        setg(x, h - 1, blocked, True)
    for y in range(h):
        setg(0, y, blocked, True)
        setg(w - 1, y, blocked, True)

    objects = [
        {"name": "sign_boteco", "x": 13, "y": 12, "gid_name": "sign_boteco"},
        {"name": "sign_laje", "x": 8, "y": 16, "gid_name": "sign_laje"},
        {"name": "boteco", "x": 14, "y": 11, "gid_name": "ai_boteco"},
        {"name": "favela_a", "x": 5, "y": 3, "gid_name": "ai_favela"},
        {"name": "favela_b", "x": 24, "y": 2, "gid_name": "ai_favela"},
        {"name": "wire_a", "x": 11, "y": 8, "gid_name": "urban_0150"},
        {"name": "wire_b", "x": 22, "y": 9, "gid_name": "urban_0150"},
        {"name": "moto", "x": 20, "y": 15, "gid_name": "urban_0200"},
        {"name": "landmark", "x": 16, "y": 8, "gid_name": "ai_favela"},
    ]
    return make_tmj("morro-neon", w, h, data, coll, houses, objects, meta)


def paint_feira(meta: dict) -> dict:
    w, h = 44, 26
    gid = {k: v["gid"] for k, v in meta["tiles"].items() if "gid" in v}
    plaza = gid.get("plaza", 1)
    asphalt = gid.get("asphalt", 1)
    sidewalk = gid.get("sidewalk", 1)
    blocked = gid.get("blocked", 1)
    exit_g = gid.get("exit", 1)
    data = [plaza] * (w * h)
    coll = [0] * (w * h)

    def setg(x, y, g, block=False):
        if 0 <= x < w and 0 <= y < h:
            data[y * w + x] = g
            coll[y * w + x] = 1 if block else 0

    for x in range(w):
        setg(x, 0, blocked, True)
        setg(x, h - 1, blocked, True)
    for y in range(h):
        setg(0, y, blocked, True)
        setg(w - 1, y, blocked, True)
    for x in range(2, 42):
        for y in (12, 13, 14):
            setg(x, y, asphalt)
        setg(x, 11, sidewalk)
        setg(x, 15, sidewalk)
    setg(1, 14, exit_g)
    setg(2, 14, exit_g)
    setg(40, 14, exit_g)
    setg(41, 14, exit_g)
    houses = []
    for i, (hx, hy) in enumerate([(6, 4), (12, 5), (18, 4), (24, 5), (30, 4), (8, 17), (16, 18), (24, 17), (32, 18)]):
        for dx in range(3):
            for dy in range(2):
                setg(hx + dx, hy + dy, blocked, True)
        houses.append({"x": hx, "y": hy, "w": 3, "h": 2, "style": i % 3, "kind": "feira"})
    objects = [
        {"name": "stall_0", "x": 10, "y": 12, "gid_name": "stall_0"},
        {"name": "stall_1", "x": 16, "y": 12, "gid_name": "stall_1"},
        {"name": "stall_2", "x": 22, "y": 12, "gid_name": "stall_2"},
        {"name": "market", "x": 28, "y": 13, "gid_name": "market_0"},
        {"name": "sign_odds", "x": 20, "y": 10, "gid_name": "sign_odds"},
        {"name": "landmark", "x": 20, "y": 6, "gid_name": "stall_1"},
    ]
    return make_tmj("feira-central", w, h, data, coll, houses, objects, meta)


def paint_avenida(meta: dict) -> dict:
    w, h = 46, 24
    gid = {k: v["gid"] for k, v in meta["tiles"].items() if "gid" in v}
    asphalt = gid.get("asphalt", 1)
    sidewalk = gid.get("sidewalk", 1)
    alley = gid.get("alley", 1)
    blocked = gid.get("blocked", 1)
    exit_g = gid.get("exit", 1)
    urban = gid.get("urban_0005", asphalt)
    data = [alley] * (w * h)
    coll = [0] * (w * h)

    def setg(x, y, g, block=False):
        if 0 <= x < w and 0 <= y < h:
            data[y * w + x] = g
            coll[y * w + x] = 1 if block else 0

    for x in range(w):
        setg(x, 0, blocked, True)
        setg(x, h - 1, blocked, True)
    for y in range(h):
        setg(0, y, blocked, True)
        setg(w - 1, y, blocked, True)
    for x in range(2, 44):
        for y in (10, 11, 12, 13):
            setg(x, y, urban if y in (11, 12) else asphalt)
        setg(x, 9, sidewalk)
        setg(x, 14, sidewalk)
    setg(1, 12, exit_g)
    setg(2, 12, exit_g)
    setg(42, 12, exit_g)
    setg(43, 12, exit_g)
    houses = []
    for i, (hx, hy) in enumerate([(5, 3), (12, 3), (20, 2), (28, 3), (35, 2), (8, 16), (18, 17), (30, 16)]):
        for dx in range(4):
            for dy in range(3):
                setg(hx + dx, hy + dy, blocked, True)
        houses.append({"x": hx, "y": hy, "w": 4, "h": 3, "style": i % 4, "kind": "avenida"})
    objects = [
        {"name": "sign_odds", "x": 18, "y": 9, "gid_name": "sign_odds"},
        {"name": "sign_casa", "x": 34, "y": 9, "gid_name": "sign_casa"},
        {"name": "landmark", "x": 22, "y": 5, "gid_name": "ai_boteco"},
    ]
    return make_tmj("avenida-odds", w, h, data, coll, houses, objects, meta)


def paint_torre(meta: dict) -> dict:
    w, h = 36, 24
    gid = {k: v["gid"] for k, v in meta["tiles"].items() if "gid" in v}
    interior = gid.get("interior", 1)
    plaza = gid.get("plaza", 1)
    asphalt = gid.get("asphalt", 1)
    blocked = gid.get("blocked", 1)
    exit_g = gid.get("exit", 1)
    data = [interior] * (w * h)
    coll = [0] * (w * h)

    def setg(x, y, g, block=False):
        if 0 <= x < w and 0 <= y < h:
            data[y * w + x] = g
            coll[y * w + x] = 1 if block else 0

    for x in range(w):
        setg(x, 0, blocked, True)
        setg(x, h - 1, blocked, True)
    for y in range(h):
        setg(0, y, blocked, True)
        setg(w - 1, y, blocked, True)
    for x in range(4, 32):
        for y in (11, 12, 13, 14):
            setg(x, y, asphalt if y in (12, 13) else plaza)
    setg(1, 13, exit_g)
    setg(1, 14, exit_g)
    houses = []
    for i, (hx, hy) in enumerate([(8, 4), (16, 3), (24, 4), (10, 16), (20, 17)]):
        for dx in range(4):
            for dy in range(3):
                setg(hx + dx, hy + dy, blocked, True)
        houses.append({"x": hx, "y": hy, "w": 4, "h": 3, "style": i % 3, "kind": "torre"})
    objects = [
        {"name": "sign_casa", "x": 16, "y": 10, "gid_name": "sign_casa"},
        {"name": "vip", "x": 22, "y": 12, "gid_name": "sign_odds"},
        {"name": "landmark", "x": 18, "y": 6, "gid_name": "ai_boteco"},
    ]
    return make_tmj("torre-casa", w, h, data, coll, houses, objects, meta)


def make_tmj(name, w, h, data, coll, houses, objects, meta):
    MAPS.mkdir(parents=True, exist_ok=True)
    # collision layer uses gid 1=walk, 2=block encoded as tile ids in a tiny set
    # We store collision as 0/1 in properties via a parallel CSV in the JSON custom field
    tmj = {
        "compressionlevel": -1,
        "height": h,
        "width": w,
        "tilewidth": TILE,
        "tileheight": TILE,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tiledversion": "1.10.0",
        "type": "map",
        "version": "1.10",
        "infinite": False,
        "nextlayerid": 3,
        "nextobjectid": len(objects) + 2,
        "tilesets": [
            {
                "firstgid": 1,
                "columns": meta["columns"],
                "image": "../assets/neon-atlas.png",
                "imagewidth": meta["columns"] * TILE,
                "imageheight": math.ceil(len(meta["tiles"]) / meta["columns"]) * TILE,
                "tilewidth": TILE,
                "tileheight": TILE,
                "tilecount": len(meta["tiles"]),
                "name": "neon-atlas",
            }
        ],
        "layers": [
            {
                "id": 1,
                "name": "ground",
                "type": "tilelayer",
                "width": w,
                "height": h,
                "data": data,
                "visible": True,
                "opacity": 1,
                "x": 0,
                "y": 0,
            },
            {
                "id": 2,
                "name": "objects",
                "type": "objectgroup",
                "objects": [
                    {
                        "id": i + 1,
                        "name": o["name"],
                        "x": o["x"] * TILE,
                        "y": o["y"] * TILE,
                        "width": TILE,
                        "height": TILE,
                        "gid_name": o["gid_name"],
                    }
                    for i, o in enumerate(objects)
                ],
                "visible": True,
                "opacity": 1,
            },
        ],
        "properties": [
            {"name": "districtId", "type": "string", "value": name},
            {"name": "collision", "type": "string", "value": ",".join(str(c) for c in coll)},
            {"name": "houses", "type": "string", "value": json.dumps(houses)},
        ],
    }
    path = MAPS / f"{name}.tmj"
    path.write_text(json.dumps(tmj))
    print(f"wrote {path}")
    return tmj


def main() -> None:
    meta = build_atlas()
    paint_morro(meta)
    paint_feira(meta)
    paint_avenida(meta)
    paint_torre(meta)
    # index for runtime
    index = {
        "atlas": "assets/neon-atlas.png",
        "meta": "assets/neon-atlas.json",
        "maps": {
            "morro-neon": "maps/morro-neon.tmj",
            "feira-central": "maps/feira-central.tmj",
            "avenida-odds": "maps/avenida-odds.tmj",
            "torre-casa": "maps/torre-casa.tmj",
        },
    }
    (OUT / "index.json").write_text(json.dumps(index, indent=2))
    print("done")


if __name__ == "__main__":
    main()
