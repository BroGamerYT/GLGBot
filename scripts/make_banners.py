"""
Erzeugt die animierten Kanal-Banner (GIF) mit deinem eigenen Servernamen als Untertitel.

Voraussetzungen (einmalig):
    pip install pillow
    npm install --no-save @fontsource/orbitron

Beispiele:
    python scripts/make_banners.py --subtitle "MEIN SERVER"            -> config/banners/*.gif
    python scripts/make_banners.py --subtitle "" --out assets/banners   -> neutrale Standard-Banner
    python scripts/make_banners.py --subtitle "MEIN SERVER" rules       -> nur das Regel-Banner

Banner in config/banners/ haben Vorrang vor assets/banners/ (config/ ist nicht im Git-Repo).
"""
import argparse, math, random, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
FONT_DIR = os.path.join(ROOT, "node_modules", "@fontsource", "orbitron", "files")

ap = argparse.ArgumentParser(description="Animierte Kanal-Banner erzeugen")
ap.add_argument("only", nargs="*", help="nur diese Banner (rules, permissions, free-games, game-news, driver-news)")
ap.add_argument("--subtitle", default=os.environ.get("COMMUNITY_NAME", ""), help="Untertitel, z. B. dein Servername (leer = ohne)")
ap.add_argument("--out", default=os.path.join(ROOT, "config", "banners"), help="Zielordner")
ap.add_argument("--font-dir", default=FONT_DIR, help="Ordner mit orbitron-latin-*-normal.woff")
ap.add_argument("--preview", action="store_true", help="zusätzlich PNG-Vorschau speichern")
args = ap.parse_args()

TITLE_FONT = os.path.join(args.font_dir, "orbitron-latin-900-normal.woff")
SUB_FONT = os.path.join(args.font_dir, "orbitron-latin-600-normal.woff")
for f in (TITLE_FONT, SUB_FONT):
    if not os.path.exists(f):
        raise SystemExit(f"Schrift nicht gefunden: {f}\n-> npm install --no-save @fontsource/orbitron")

W, H = 960, 240
FRAMES = 36
DURATION = 60  # ms pro Frame

BANNERS = {
    "rules":       ("SERVERREGELN",   (254, 196, 64)),   # Gold
    "permissions": ("BERECHTIGUNGEN", (88, 101, 242)),   # Discord-Blurple
    "free-games":  ("FREE GAMES",     (87, 242, 135)),   # Grün
    "game-news":   ("GAME NEWS",      (255, 140, 40)),   # Orange
    "driver-news": ("TREIBER NEWS",   (0, 180, 216)),    # Cyan
}
SUBTITLE = args.subtitle.strip().upper()

def fit_font(text, max_w, start=92):
    size = start
    while size > 30:
        f = ImageFont.truetype(TITLE_FONT, size)
        bbox = f.getbbox(text)
        if bbox[2] - bbox[0] <= max_w:
            return f
        size -= 2
    return ImageFont.truetype(TITLE_FONT, size)

def spaced(draw, xy, text, font, fill, spacing):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + spacing

def spaced_width(draw, text, font, spacing):
    return sum(draw.textlength(c, font=font) for c in text) + spacing * (len(text) - 1)

def make(name, title, accent):
    random.seed(name)
    font = fit_font(title, W - 160)
    sub_font = ImageFont.truetype(SUB_FONT, 20)
    dummy = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    tb = font.getbbox(title)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    tx, ty = (W - tw) // 2 - tb[0], (62 if SUBTITLE else (H - th) // 2 - 4) - tb[1]
    sub_w = spaced_width(dummy, SUBTITLE, sub_font, 6) if SUBTITLE else 0
    sx, sy = (W - sub_w) / 2, ty + tb[1] + th + 30

    # Textmaske
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).text((tx, ty), title, font=font, fill=255)
    glow_base = mask.filter(ImageFilter.GaussianBlur(14))
    glow_wide = mask.filter(ImageFilter.GaussianBlur(30))

    particles = [(random.uniform(0, W), random.uniform(0, H), random.uniform(1, 2.6), random.uniform(0.4, 1.2), random.uniform(0, 6.28)) for _ in range(38)]
    ar, ag, ab = accent
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        img = Image.new("RGB", (W, H), (17, 19, 26))
        d = ImageDraw.Draw(img)

        # Hintergrund: feines Raster, langsam wandernd
        off = int(t * 40)
        for x in range(-40 + off, W, 40):
            d.line([(x, 0), (x, H)], fill=(24, 27, 37))
        for y in range(0, H, 40):
            d.line([(0, y), (W, y)], fill=(24, 27, 37))

        # Weicher Farbschimmer, der hin und her wandert
        blob = Image.new("L", (W, H), 0)
        bx = W / 2 + math.sin(t * 2 * math.pi) * 260
        ImageDraw.Draw(blob).ellipse([bx - 260, -120, bx + 260, H + 120], fill=60)
        blob = blob.filter(ImageFilter.GaussianBlur(70))
        img = Image.composite(Image.new("RGB", (W, H), accent), img, blob)
        d = ImageDraw.Draw(img)

        # Partikel
        for (px, py, r, sp, ph) in particles:
            yy = (py - t * H * sp) % H
            a = 0.35 + 0.35 * math.sin(ph + t * 2 * math.pi)
            col = tuple(int(17 + (c - 17) * a) for c in accent)
            d.ellipse([px - r, yy - r, px + r, yy + r], fill=col)

        # Glow (pulsierend)
        pulse = 0.65 + 0.35 * math.sin(t * 2 * math.pi)
        for g, strength in ((glow_wide, 0.55), (glow_base, 0.9)):
            gm = g.point(lambda v: int(min(255, v * strength * pulse * 1.6)))
            img = Image.composite(Image.new("RGB", (W, H), accent), img, gm)

        # Schrift: weiß mit leichtem Farbverlauf unten
        text_layer = Image.new("RGB", (W, H), (255, 255, 255))
        grad = Image.new("L", (1, H))
        for y in range(H):
            grad.putpixel((0, y), int(max(0, min(255, (y - ty - th * 0.45) / (th * 0.8) * 140))))
        grad = grad.resize((W, H))
        text_layer = Image.composite(Image.new("RGB", (W, H), accent), text_layer, grad)
        img = Image.composite(text_layer, img, mask)

        # Glanz-Streifen, der über die Schrift läuft (im ersten Drittel der Schleife)
        sweep_t = (t * 1.6) % 1.6
        if sweep_t <= 1.0:
            band = Image.new("L", (W, H), 0)
            cx = -200 + sweep_t * (W + 400)
            ImageDraw.Draw(band).polygon([(cx - 40, 0), (cx + 30, 0), (cx - 30 + 60, H), (cx - 110 + 60, H)], fill=230)
            band = band.filter(ImageFilter.GaussianBlur(10))
            shine = ImageChops.multiply(band, mask)
            img = Image.composite(Image.new("RGB", (W, H), (255, 255, 255)), img, shine)

        # Untertitel mit Linien links/rechts
        d = ImageDraw.Draw(img)
        if SUBTITLE:
            spaced(d, (sx, sy), SUBTITLE, sub_font, accent, 6)
            line_y = sy + 12
            lw = 90 + 20 * math.sin(t * 2 * math.pi)
            d.line([(sx - 24 - lw, line_y), (sx - 24, line_y)], fill=accent, width=2)
            d.line([(sx + sub_w + 24, line_y), (sx + sub_w + 24 + lw, line_y)], fill=accent, width=2)

        # Akzentleiste unten
        d.rectangle([0, H - 4, W, H], fill=accent)
        frames.append(img)

    # Gemeinsame Farbpalette -> kein Flackern, kleine Datei
    sheet = Image.new("RGB", (W, H * 4))
    for k, idx in enumerate([0, FRAMES // 4, FRAMES // 2, FRAMES * 3 // 4]):
        sheet.paste(frames[idx], (0, H * k))
    pal = sheet.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    out = os.path.join(args.out, f"{name}.gif")
    os.makedirs(args.out, exist_ok=True)
    q[0].save(out, save_all=True, append_images=q[1:], duration=DURATION, loop=0, optimize=True, disposal=1)
    if args.preview:
        frames[FRAMES // 6].save(os.path.join(args.out, f"{name}_preview.png"))
    print(name, os.path.getsize(out) // 1024, "KB ->", out)

only = args.only
for n, (title, accent) in BANNERS.items():
    if not only or n in only:
        make(n, title, accent)
