#!/usr/bin/env python3
"""Generate punchy 1280x720 YouTube thumbnails for Lofi Radio mixes and set them via YouTube API."""

import pickle
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

BASE_DIR = Path(__file__).resolve().parent.parent
VEO_DIR = Path(r"C:\dev\veo-stock\final_broll_collection")
OUT_DIR = BASE_DIR / "youtube-output"
TOKEN_FILE = BASE_DIR / "youtube-upload" / "token.pickle"

FONT_HEAD = r"C:\Windows\Fonts\impact.ttf"
FONT_SUB = r"C:\Windows\Fonts\arialbd.ttf"

THUMBS = [
    {
        "video_id": "fZbtUFuN4pQ",
        "loop": VEO_DIR / "10_retro_cassette_lofi_1080p_loop.mp4",
        "output": OUT_DIR / "thumb-cassette.jpg",
        "line1": "1 HOUR",
        "line2": "LOFI BEATS",
        "accent": "STUDY • RELAX • NO ADS",
        "accent_color": (255, 110, 199),
    },
    {
        "video_id": "DZpEUZRDHl0",
        "loop": VEO_DIR / "26_holiday_fireplace_1080p_loop.mp4",
        "output": OUT_DIR / "thumb-fireplace.jpg",
        "line1": "WINTER",
        "line2": "LOFI MIX",
        "accent": "COZY FIREPLACE • 1 HOUR",
        "accent_color": (255, 198, 75),
    },
]


def extract_frame(loop_path: Path, frame_path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-ss", "2", "-i", str(loop_path),
            "-vframes", "1",
            "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720",
            str(frame_path),
        ],
        capture_output=True,
        check=True,
    )


def render_thumbnail(spec: dict) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        raw_frame = Path(tmp) / "frame.png"
        extract_frame(spec["loop"], raw_frame)
        base = Image.open(raw_frame).convert("RGBA")

    # Left/bottom dark gradient scrim + translucent badge fill via alpha_composite
    scrim = Image.new("RGBA", base.size, (0, 0, 0, 0))
    scrim_draw = ImageDraw.Draw(scrim)
    for x in range(900):
        alpha = int(195 * (1.0 - x / 900) ** 1.4)
        scrim_draw.line([(x, 0), (x, 720)], fill=(10, 10, 22, alpha))
    bx0, by0, bx1, by1 = 64, 56, 64 + 196, 102
    scrim_draw.rounded_rectangle([bx0, by0, bx1, by1], radius=22, fill=(15, 15, 30, 150), outline=(255, 255, 255, 180), width=2)
    base = Image.alpha_composite(base, scrim)

    # Drop shadow layer for headline
    shadow_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)

    f_head = ImageFont.truetype(FONT_HEAD, 148)
    f_sub = ImageFont.truetype(FONT_SUB, 44)
    f_badge = ImageFont.truetype(FONT_SUB, 26)

    x_left = 64
    y1 = 155
    y2 = 305
    y_acc = 480

    for txt, y in ((spec["line1"], y1), (spec["line2"], y2)):
        s_draw.text((x_left + 8, y + 10), txt, font=f_head, fill=(0, 0, 0, 210))
    s_draw.text((x_left + 5, y_acc + 6), spec["accent"], font=f_sub, fill=(0, 0, 0, 210))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(10))
    base = Image.alpha_composite(base, shadow_layer)

    draw = ImageDraw.Draw(base)

    # Top-left pill badge text
    draw.text((bx0 + 22, by0 + 9), "LOFI RADIO", font=f_badge, fill=(255, 255, 255, 255))

    # Headline with crisp dark stroke
    draw.text((x_left, y1), spec["line1"], font=f_head, fill=(255, 255, 255, 255), stroke_width=10, stroke_fill=(12, 12, 24, 255))
    draw.text((x_left, y2), spec["line2"], font=f_head, fill=spec["accent_color"] + (255,), stroke_width=10, stroke_fill=(12, 12, 24, 255))

    # Accent underline bar
    draw.rounded_rectangle([x_left, y_acc - 16, x_left + 440, y_acc - 9], radius=4, fill=spec["accent_color"] + (255,))

    # Sub-headline
    draw.text((x_left, y_acc), spec["accent"], font=f_sub, fill=(255, 255, 255, 255), stroke_width=6, stroke_fill=(12, 12, 24, 255))

    out_path = spec["output"]
    base.convert("RGB").save(out_path, format="JPEG", quality=92, optimize=True)
    return out_path


def get_youtube_service():
    creds = pickle.loads(TOKEN_FILE.read_bytes())
    if not creds.valid and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_FILE.write_bytes(pickle.dumps(creds))
    return build("youtube", "v3", credentials=creds)


def main() -> int:
    generated = []
    for spec in THUMBS:
        path = render_thumbnail(spec)
        size_kb = path.stat().st_size / 1024
        print(f"Generated: {path} ({size_kb:.0f} KB)")
        generated.append((spec["video_id"], path))

    yt = get_youtube_service()
    for vid, path in generated:
        try:
            yt.thumbnails().set(
                videoId=vid,
                media_body=MediaFileUpload(str(path), mimetype="image/jpeg"),
            ).execute()
            print(f"Thumbnail set OK for {vid}")
        except HttpError as exc:
            print(f"Thumbnail upload failed for {vid} (HTTP {exc.resp.status}): {exc}")
            return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
