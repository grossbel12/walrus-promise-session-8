from __future__ import annotations

import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".video-tools"))

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
import imageio_ffmpeg


WIDTH, HEIGHT, FPS = 1920, 1080, 30
BG = "#090d0e"
ACID = "#c9ff4a"
WHITE = "#f4f6f1"
MUTED = "#9ba29e"
BLUE = "#73a5ff"
ORANGE = "#ff9c85"

FONT = Path("C:/Windows/Fonts/arial.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT), size=size)


def fit_cover(image: Image.Image, width: int, height: int, zoom: float = 1.0) -> Image.Image:
    ratio = max(width / image.width, height / image.height) * zoom
    resized = image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)
    left = max(0, (resized.width - width) // 2)
    top = max(0, (resized.height - height) // 2)
    return resized.crop((left, top, left + width, top + height))


def screenshot_frame(path: Path, title: str, subtitle: str, progress: float, accent: str) -> Image.Image:
    source = Image.open(path).convert("RGB")
    zoom = 1.0 + progress * 0.025
    shot = fit_cover(source, WIDTH, HEIGHT, zoom)
    shot = ImageEnhance.Brightness(shot).enhance(0.72)
    frame = shot.filter(ImageFilter.GaussianBlur(radius=0.3))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((0, 0, WIDTH, 176), fill=(7, 10, 11, 232))
    draw.rectangle((0, HEIGHT - 132, WIDTH, HEIGHT), fill=(7, 10, 11, 238))
    draw.rectangle((72, 145, 292, 151), fill=accent)
    draw.text((72, 42), title, font=font(58, True), fill=WHITE)
    draw.text((72, HEIGHT - 91), subtitle, font=font(30), fill=MUTED)
    draw.text((WIDTH - 360, HEIGHT - 91), "WALRUS MAINNET", font=font(24, True), fill=accent)
    return Image.alpha_composite(frame.convert("RGBA"), overlay).convert("RGB")


def title_frame(progress: float) -> Image.Image:
    frame = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(frame)
    pulse = round(90 + 35 * math.sin(progress * math.pi))
    draw.ellipse((1420, -340, 2080, 320), outline=(201, 255, 74, pulse), width=3)
    draw.text((120, 120), "WALRUS PROMISE", font=font(28, True), fill=ACID)
    draw.text((120, 305), "A chatbot that", font=font(106, True), fill=WHITE)
    draw.text((120, 420), "remembers the promise.", font=font(106, True), fill=ACID)
    draw.text((125, 600), "Qwen3 intelligence. Encrypted memory. Walrus Mainnet proof.", font=font(36), fill=MUTED)
    draw.rounded_rectangle((120, 760, 792, 848), radius=44, outline=ACID, width=2)
    draw.text((165, 784), "REAL USERS · FRESH SESSIONS · BLOB RECEIPTS", font=font(25, True), fill=WHITE)
    return frame


def final_frame(progress: float) -> Image.Image:
    frame = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(frame)
    draw.text((120, 100), "PROOF, NOT A PROMISE.", font=font(30, True), fill=ACID)
    stats = [("3/3", "REAL TESTERS"), ("10/10", "SYNTHETIC MAINNET CHECKS"), ("13+", "VERIFIED BLOBS")]
    for index, (value, label) in enumerate(stats):
        x = 120 + index * 580
        draw.text((x, 245), value, font=font(112, True), fill=WHITE)
        draw.text((x + 4, 375), label, font=font(23, True), fill=MUTED)
    draw.line((120, 510, 1800, 510), fill="#2b3130", width=2)
    draw.text((120, 600), "Try it live", font=font(26, True), fill=ACID)
    draw.text((120, 650), "walrus-promise.walrus-promise-lab.workers.dev", font=font(44, True), fill=WHITE)
    draw.text((120, 765), "Open source", font=font(26, True), fill=BLUE)
    draw.text((120, 815), "github.com/grossbel12/walrus-promise-session-8", font=font(38, True), fill=WHITE)
    draw.text((120, 965), "QWEN3  ·  WALRUS MEMORY  ·  SEAL  ·  SUI", font=font(24, True), fill=MUTED)
    return frame


def blend_with_fade(frame: Image.Image, local_time: float, duration: float) -> Image.Image:
    fade = 0.45
    alpha = min(1.0, local_time / fade, (duration - local_time) / fade)
    if alpha >= 1.0:
        return frame
    background = Image.new("RGB", frame.size, BG)
    return Image.blend(background, frame, max(0.0, alpha))


def main() -> None:
    evidence = ROOT / "docs" / "evidence" / "real-testers"
    output_dir = ROOT / "artifacts" / "video"
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / "walrus-promise-demo.mp4"

    scenes = [
        (4.0, lambda p: title_frame(p)),
        (6.5, lambda p: screenshot_frame(evidence / "tester-01-success.png", "A promise survives a fresh session.", "SAVED ON WALRUS  ·  RECALLED AFTER NEW SESSION  ·  DISTANCE 0.703", p, ACID)),
        (6.5, lambda p: screenshot_frame(evidence / "tester-02-success.png", "The coach remembers what matters.", "ANONYMOUS REAL-USER TEST  ·  MAINNET BLOB RECEIPT  ·  DISTANCE 0.729", p, BLUE)),
        (5.0, lambda p: screenshot_frame(evidence / "tester-03-initial-failure.png", "A real tester found a failure.", "TRANSIENT AI ERROR + DELAYED RELAYER WRITE", p, ORANGE)),
        (7.0, lambda p: screenshot_frame(evidence / "tester-03-success-after-fix.png", "We fixed it. The promise came back.", "RETRY ADDED  ·  HONEST PENDING STATE  ·  FRESH-SESSION RECALL 0.764", p, ACID)),
        (7.0, lambda p: final_frame(p)),
    ]

    writer = imageio_ffmpeg.write_frames(
        str(output),
        (WIDTH, HEIGHT),
        fps=FPS,
        codec="libx264",
        pix_fmt_out="yuv420p",
        output_params=["-crf", "20", "-preset", "medium", "-movflags", "+faststart"],
    )
    writer.send(None)
    try:
        for duration, render in scenes:
            count = round(duration * FPS)
            for index in range(count):
                local_time = index / FPS
                progress = index / max(1, count - 1)
                frame = blend_with_fade(render(progress), local_time, duration)
                writer.send(frame.tobytes())
    finally:
        writer.close()

    print(output)


if __name__ == "__main__":
    main()
