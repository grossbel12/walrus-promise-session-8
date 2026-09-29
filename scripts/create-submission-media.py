from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "evidence" / "submission-media"
SOURCE = ROOT / "docs" / "evidence" / "real-testers" / "tester-03-success-after-fix.png"
LOGO = ROOT / "public" / "walrus-promise-logo.png"

W, H = 1600, 1000
BG = "#090d0e"
PANEL = "#111617"
WHITE = "#f4f6f1"
MUTED = "#9ba29e"
ACID = "#c9ff4a"
BLUE = "#73a5ff"
LINE = "#293031"

FONT = "C:/Windows/Fonts/arial.ttf"
BOLD = "C:/Windows/Fonts/arialbd.ttf"


def f(size: int, bold: bool = False):
    return ImageFont.truetype(BOLD if bold else FONT, size)


def contain(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(box, Image.Resampling.LANCZOS)
    return copy


def rounded(draw: ImageDraw.ImageDraw, box, fill, outline=None, radius=18, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def add_brand(canvas: Image.Image, x=54, y=38):
    logo = contain(Image.open(LOGO).convert("RGBA"), (66, 66))
    canvas.alpha_composite(logo, (x, y))
    draw = ImageDraw.Draw(canvas)
    draw.text((x + 82, y + 10), "WALRUS PROMISE", font=f(25, True), fill=WHITE)
    draw.text((x + 82, y + 42), "ACCOUNTABILITY THAT SURVIVES THE SESSION", font=f(13, True), fill=ACID)


def add_step(draw, x, number, title, copy, color):
    draw.ellipse((x, 122, x + 44, 166), fill=color)
    draw.text((x + 15, 131), str(number), font=f(19, True), fill=BG)
    draw.text((x + 58, 120), title, font=f(18, True), fill=WHITE)
    draw.text((x + 58, 148), copy, font=f(14), fill=MUTED)


def first_image(source: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(canvas)
    add_brand(canvas)
    draw.text((54, 210), "How cross-session memory works", font=f(45, True), fill=WHITE)
    draw.text((54, 265), "One promise becomes a durable, recallable Walrus Memory record.", font=f(22), fill=MUTED)

    add_step(draw, 54, 1, "PROMISE", "One concrete action", ACID)
    add_step(draw, 535, 2, "MAINNET WRITE", "Seal encryption + blob ID", BLUE)
    add_step(draw, 1055, 3, "FRESH SESSION", "Semantic recall", ACID)

    shot = contain(source, (1490, 650))
    sx = (W - shot.width) // 2
    sy = 325
    rounded(draw, (sx - 3, sy - 3, sx + shot.width + 3, sy + shot.height + 3), PANEL, LINE, 16, 2)
    canvas.alpha_composite(shot.convert("RGBA"), (sx, sy))

    badge_y = 937
    rounded(draw, (54, badge_y, 515, 982), "#172016", "#41641d", 22, 1)
    draw.text((82, badge_y + 13), "QWEN3 + WALRUS MEMORY + SEAL", font=f(16, True), fill=ACID)
    draw.text((1190, badge_y + 13), "WALRUS MAINNET", font=f(16, True), fill=BLUE)
    return canvas.convert("RGB")


def second_image(source: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(canvas)
    add_brand(canvas)
    draw.text((54, 126), "Proof not a promise", font=f(48, True), fill=WHITE)
    draw.text((54, 184), "The UI exposes the saved blob and the recalled memory from a clean session.", font=f(22), fill=MUTED)

    left_crop = source.crop((0, 90, 990, 650))
    right_crop = source.crop((985, 90, source.width, 650))
    left = contain(left_crop, (940, 590))
    right = contain(right_crop, (530, 590))
    lx, ly = 54, 255
    rx, ry = 1015, 255
    rounded(draw, (lx - 3, ly - 3, lx + left.width + 3, ly + left.height + 3), PANEL, LINE, 16, 2)
    rounded(draw, (rx - 3, ry - 3, rx + right.width + 3, ry + right.height + 3), PANEL, LINE, 16, 2)
    canvas.alpha_composite(left.convert("RGBA"), (lx, ly))
    canvas.alpha_composite(right.convert("RGBA"), (rx, ry))

    cards = [
        (54, 842, 495, "1  NEW SESSION", "Transcript cleared", ACID),
        (525, 842, 966, "2  SAVED", "Confirmed Walrus blob ID", ACID),
        (996, 842, 1546, "3  RECALLED", "Correct memory + distance 0.764", BLUE),
    ]
    for x1, y1, x2, title, copy, color in cards:
        rounded(draw, (x1, y1, x2, 930), PANEL, color, 16, 2)
        draw.text((x1 + 22, y1 + 15), title, font=f(18, True), fill=color)
        draw.text((x1 + 22, y1 + 47), copy, font=f(15), fill=WHITE)

    draw.text((54, 961), "3/3 HUMAN FLOWS PASSED", font=f(15, True), fill=ACID)
    draw.text((665, 961), "10/10 AUTOMATED MAINNET WRITES + RECALLS", font=f(15, True), fill=BLUE)
    return canvas.convert("RGB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")
    first_image(source).save(OUT / "01-how-walrus-promise-works.png", quality=95)
    second_image(source).save(OUT / "02-mainnet-memory-proof.png", quality=95)
    print(OUT)


if __name__ == "__main__":
    main()
