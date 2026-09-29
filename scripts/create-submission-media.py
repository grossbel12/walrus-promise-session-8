from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "evidence" / "submission-media"
SOURCE = ROOT / "docs" / "evidence" / "real-testers" / "tester-03-success-after-fix.png"
LOGO = ROOT / "public" / "walrus-promise-logo.png"

W, H = 1800, 1200
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


def arrow(draw, start, end, color=ACID, width=5):
    draw.line((start, end), fill=color, width=width)
    ex, ey = end
    sx, sy = start
    dx, dy = ex - sx, ey - sy
    length = max((dx * dx + dy * dy) ** 0.5, 1)
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    size = 16
    left = (ex - ux * size + px * size * 0.55, ey - uy * size + py * size * 0.55)
    right = (ex - ux * size - px * size * 0.55, ey - uy * size - py * size * 0.55)
    draw.polygon((end, left, right), fill=color)


def callout(draw, box, number, title, lines, color=ACID):
    x1, y1, x2, y2 = box
    rounded(draw, box, PANEL, color, 18, 3)
    draw.ellipse((x1 + 20, y1 + 18, x1 + 68, y1 + 66), fill=color)
    draw.text((x1 + 36, y1 + 28), str(number), font=f(20, True), fill=BG)
    draw.text((x1 + 84, y1 + 17), title, font=f(22, True), fill=WHITE)
    y = y1 + 57
    for line in lines:
        draw.text((x1 + 84, y), line, font=f(17), fill=MUTED)
        y += 25


def add_step(draw, x, number, title, copy, color):
    draw.ellipse((x, 122, x + 44, 166), fill=color)
    draw.text((x + 15, 131), str(number), font=f(19, True), fill=BG)
    draw.text((x + 58, 120), title, font=f(18, True), fill=WHITE)
    draw.text((x + 58, 148), copy, font=f(14), fill=MUTED)


def first_image(source: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(canvas)
    add_brand(canvas)
    draw.text((54, 125), "How Walrus Promise remembers", font=f(48, True), fill=WHITE)
    draw.text((54, 184), "A real cross-session flow: promise, encrypted Mainnet storage, then semantic recall.", font=f(23), fill=MUTED)

    chat_crop = source.crop((20, 120, 1000, 675))
    chat = contain(chat_crop, (1080, 650))
    sx, sy = 665, 270
    rounded(draw, (sx - 5, sy - 5, sx + chat.width + 5, sy + chat.height + 5), PANEL, LINE, 18, 3)
    canvas.alpha_composite(chat.convert("RGBA"), (sx, sy))
    draw.text((sx + 22, sy + 18), "REAL PRODUCT INTERFACE", font=f(14, True), fill=ACID)

    callout(draw, (54, 270, 610, 425), 1, "USER MAKES A PROMISE", [
        "The coach extracts a durable goal", "and the concrete next action."
    ], ACID)
    callout(draw, (54, 455, 610, 635), 2, "MEMORY GOES TO MAINNET", [
        "MemWal encrypts the record with Seal.", "A Walrus blob ID becomes the receipt."
    ], BLUE)
    callout(draw, (54, 665, 610, 845), 3, "A CLEAN SESSION RECALLS IT", [
        "Chat history is cleared. The same user", "asks again and receives the right promise."
    ], ACID)
    arrow(draw, (610, 350), (900, 520), ACID)
    arrow(draw, (610, 545), (1585, 535), BLUE)
    arrow(draw, (610, 755), (1040, 705), ACID)

    rounded(draw, (54, 935, 1746, 1125), "#101617", LINE, 20, 2)
    draw.text((84, 960), "WHY THIS MATTERS", font=f(17, True), fill=ACID)
    draw.text((84, 997), "The bot does not replay a transcript. It recalls a compact, useful fact", font=f(25, True), fill=WHITE)
    draw.text((84, 1033), "from decentralized storage and turns it into a personalized follow-up.", font=f(25, True), fill=WHITE)
    draw.text((84, 1082), "QWEN3  •  MEMWAL  •  WALRUS MAINNET  •  SEAL ENCRYPTION", font=f(17, True), fill=BLUE)
    return canvas.convert("RGB")


def second_image(source: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(canvas)
    add_brand(canvas)
    draw.text((54, 126), "Mainnet proof, explained", font=f(48, True), fill=WHITE)
    draw.text((54, 184), "Every visible receipt connects the user experience to a verifiable Walrus memory record.", font=f(22), fill=MUTED)

    left_crop = source.crop((45, 135, 970, 615))
    right_crop = source.crop((980, 110, source.width, 690))
    left = contain(left_crop, (1020, 550))
    right = contain(right_crop, (620, 550))
    lx, ly = 54, 265
    rx, ry = 1120, 265
    rounded(draw, (lx - 3, ly - 3, lx + left.width + 3, ly + left.height + 3), PANEL, LINE, 16, 2)
    rounded(draw, (rx - 3, ry - 3, rx + right.width + 3, ry + right.height + 3), PANEL, LINE, 16, 2)
    canvas.alpha_composite(left.convert("RGBA"), (lx, ly))
    canvas.alpha_composite(right.convert("RGBA"), (rx, ry))

    arrow(draw, (1045, 470), (1190, 430), ACID)
    arrow(draw, (1045, 650), (1190, 655), BLUE)

    callout(draw, (54, 860, 580, 1055), 1, "NEW SESSION", [
        "The local transcript is cleared.", "Only long-term Walrus memory remains."
    ], ACID)
    callout(draw, (620, 860, 1160, 1055), 2, "SAVED RECEIPT", [
        "The blob ID proves that the encrypted", "memory was written to Walrus Mainnet."
    ], ACID)
    callout(draw, (1200, 860, 1746, 1055), 3, "RECALLED RECEIPT", [
        "Semantic search finds the correct fact.", "Distance 0.764 is shown transparently."
    ], BLUE)

    draw.text((54, 1102), "VALIDATION: 3/3 CONSENTED HUMAN FLOWS PASSED", font=f(17, True), fill=ACID)
    draw.text((930, 1102), "10/10 AUTOMATED MAINNET WRITES + RECALLS", font=f(17, True), fill=BLUE)
    return canvas.convert("RGB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")
    first_image(source).save(OUT / "01-how-walrus-promise-works.png", quality=95)
    second_image(source).save(OUT / "02-mainnet-memory-proof.png", quality=95)
    print(OUT)


if __name__ == "__main__":
    main()
