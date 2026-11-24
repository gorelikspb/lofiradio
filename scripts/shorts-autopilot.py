#!/usr/bin/env python3
"""Build and upload a single 9:16 Lofi Radio YouTube Short per run with A/B visual rotation."""

import argparse
import json
import pickle
import random
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
PLAYLIST_PATH = PUBLIC_DIR / "playlist.json"
VEO_DIR = Path(r"C:\dev\veo-stock\final_broll_collection")
PICS_DIR = BASE_DIR / "youtube-input" / "pics"
CATS_DIR = BASE_DIR / "youtube-input" / "cats"
GTA6_DIR = BASE_DIR / "youtube-input" / "gta6"
GTA6_LOGO = BASE_DIR / "youtube-input" / "gta6-logo.png"
CAT_ICON = BASE_DIR / "mobile" / "store-assets" / "icon-candidates" / "01-headphones-cat.png"
OUT_DIR = BASE_DIR / "youtube-output" / "shorts-auto"
TOKEN_FILE = BASE_DIR / "youtube-upload" / "token.pickle"
LOG_FILE = BASE_DIR / "youtube-upload" / "shorts-autopilot-log.json"

BUCKETS_ORDER = ["gta6", "lofi_girl", "veo_lofi", "veo_winter", "cozy_cat"]
REGULAR_BUCKETS = ["lofi_girl", "veo_lofi", "veo_winter", "cozy_cat"]
OVERLAY_FILTER = (
    "drawtext=fontfile='C\\:/Windows/Fonts/segoeuib.ttf':"
    "text='lofimusic.online  •  no ads':"
    "fontcolor=white@0.95:fontsize=38:x=(w-text_w)/2:y=150:"
    "box=1:boxcolor=black@0.48:boxborderw=18"
)
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTS = {".mp4", ".mov", ".webm"}
SHORT_DURATION = 20.0

VEO_LOFI_FILES = [
    "10_retro_cassette_lofi_1080p_loop.mp4",
    "16_vinyl_turntable_1080p_loop.mp4",
    "05_night_rain_bokeh_1080p_loop.mp4",
    "07_espresso_crema_macro_1080p_loop.mp4",
    "37_morning_notebook_shadows_1080p_loop.mp4",
]

VEO_WINTER_FILES = [
    "26_holiday_fireplace_1080p_loop.mp4",
    "14_snowfall_streetlamp_1080p_loop.mp4",
    "24_xmas_fairy_lights_1080p_loop.mp4",
    "36_winter_cocoa_marshmallow_1080p_loop.mp4",
]

LOFI_GIRL_FILES = [
    "juliush-girl-7752973_1920.jpg",
    "pikura-female-7309755_1920.png",
    "izzyserious-ai-generated-8149206_1920.png",
    "izzyserious-ai-generated-8209624_1920.jpg",
    "jensenartofficial-anime-wallpaper-7628310_1920.jpg",
    "lofizoo_art-ai-generated-8649730_1920.jpg",
]

BUCKET_TITLES = {
    "gta6": "{track} — GTA 6 Vice City Night Drive Vibes #shorts #gta6 #lofi",
    "veo_lofi": "{track} — late night lofi beats #shorts #lofi",
    "veo_winter": "{track} — cozy winter lofi #shorts #lofi #winterlofi",
    "lofi_girl": "{track} — lofi girl study & chill beats #shorts #lofigirl",
    "cozy_cat": "{track} — cozy cat lofi chill #shorts #lofi #chillbeats",
}


def load_log() -> list[dict]:
    if not LOG_FILE.exists():
        return []
    try:
        return json.loads(LOG_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_log(entries: list[dict]) -> None:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    LOG_FILE.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def get_bucket_visuals(bucket: str) -> list[Path]:
    if bucket == "veo_lofi":
        return [VEO_DIR / name for name in VEO_LOFI_FILES if (VEO_DIR / name).exists()]
    if bucket == "veo_winter":
        return [VEO_DIR / name for name in VEO_WINTER_FILES if (VEO_DIR / name).exists()]
    if bucket == "lofi_girl":
        items = [PICS_DIR / name for name in LOFI_GIRL_FILES if (PICS_DIR / name).exists()]
        extra = [
            p for p in sorted(PICS_DIR.iterdir())
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS and p.name not in LOFI_GIRL_FILES
            and " (1)" not in p.name and "man-" not in p.name.lower()
        ] if PICS_DIR.exists() else []
        return items + extra
    if bucket == "cozy_cat":
        CATS_DIR.mkdir(parents=True, exist_ok=True)
        items = [p for p in sorted(CATS_DIR.iterdir()) if p.is_file() and p.suffix.lower() in IMAGE_EXTS]
        if CAT_ICON.exists():
            items.append(CAT_ICON)
        return items
    if bucket == "gta6":
        GTA6_DIR.mkdir(parents=True, exist_ok=True)
        media_exts = IMAGE_EXTS | VIDEO_EXTS
        return [p for p in sorted(GTA6_DIR.iterdir()) if p.is_file() and p.suffix.lower() in media_exts]
    raise ValueError(f"Unknown bucket: {bucket}")


def probe_duration(path: Path) -> float:
    res = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(res.stdout.strip())


def pick_next_bucket(log: list[dict], forced: str | None) -> str:
    if forced:
        return forced
    if not log or log[-1].get("bucket") != "gta6":
        return "gta6"
    regular_count = sum(1 for e in log if e.get("bucket") != "gta6")
    return REGULAR_BUCKETS[regular_count % len(REGULAR_BUCKETS)]


def pick_least_recent(candidates: list, recent_keys: list[str], key_fn) -> object:
    recent_pos = {k: i for i, k in enumerate(recent_keys)}
    candidates_shuffled = list(candidates)
    random.shuffle(candidates_shuffled)
    candidates_shuffled.sort(key=lambda item: recent_pos.get(key_fn(item), -1))
    return candidates_shuffled[0]


def render_short(visual_path: Path, track_path: Path, output_path: Path, bucket: str = "") -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    dur = probe_duration(track_path)
    seek_sec = 20.0 if dur >= 45.0 else 0.0
    is_video = visual_path.suffix.lower() in {".mp4", ".mov", ".webm"}
    use_gta_logo = bucket == "gta6" and GTA6_LOGO.exists()

    audio_filter = f"afade=t=in:st=0:d=0.6,afade=t=out:st={SHORT_DURATION - 1.5:.1f}:d=1.5"

    if is_video:
        base_vf = f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,{OVERLAY_FILTER},setsar=1"
        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", "-1", "-i", str(visual_path),
            "-ss", f"{seek_sec:.1f}", "-t", f"{SHORT_DURATION:.1f}", "-i", str(track_path),
        ]
    else:
        frames = int(SHORT_DURATION * 24)
        base_vf = (
            "scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920,"
            f"zoompan=z='min(zoom+0.0004,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=24,"
            f"{OVERLAY_FILTER},setsar=1"
        )
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", str(visual_path),
            "-ss", f"{seek_sec:.1f}", "-t", f"{SHORT_DURATION:.1f}", "-i", str(track_path),
        ]

    if use_gta_logo:
        cmd.extend([
            "-i", str(GTA6_LOGO),
            "-filter_complex", f"[0:v]{base_vf}[base];[2:v]scale=320:-1[logo];[base][logo]overlay=(W-w)/2:235,format=yuv420p[vout]",
            "-map", "[vout]", "-map", "1:a:0",
        ])
    else:
        cmd.extend([
            "-map", "0:v:0", "-map", "1:a:0",
            "-vf", f"{base_vf},format=yuv420p",
        ])

    cmd.extend([
        "-af", audio_filter,
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "24",
        "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
        "-t", f"{SHORT_DURATION:.1f}",
        "-movflags", "+faststart",
        str(output_path),
    ])

    subprocess.run(cmd, check=True)


def get_youtube_service():
    if not TOKEN_FILE.exists():
        raise FileNotFoundError(f"Token file not found: {TOKEN_FILE}")
    creds = pickle.loads(TOKEN_FILE.read_bytes())
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            TOKEN_FILE.write_bytes(pickle.dumps(creds))
        else:
            raise RuntimeError("YouTube OAuth token is invalid and cannot be refreshed non-interactively.")
    return build("youtube", "v3", credentials=creds)


def upload_short(youtube, video_path: Path, title: str, bucket: str) -> str:
    description = (
        "🎧 Ad-free lofi radio in 1 click: https://lofimusic.online\n"
        "☕ 1-hour mixes on this channel — subscribe for daily chill beats.\n\n"
        "#shorts #lofi #lofibeats #chill #lofiradio"
    )
    body = {
        "snippet": {
            "title": title[:95],
            "description": description,
            "tags": ["shorts", "lofi", "lofi hip hop", "lofi radio", "chill beats", bucket],
            "categoryId": "10",
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False,
        },
    }
    media = MediaFileUpload(str(video_path), chunksize=-1, resumable=True, mimetype="video/mp4")
    req = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
    resp = None
    while resp is None:
        _, resp = req.next_chunk()
    return resp["id"]


def main() -> int:
    parser = argparse.ArgumentParser(description="Build and upload 1 Lofi Radio Short.")
    parser.add_argument("--build-only", action="store_true", help="Only render MP4 without uploading")
    parser.add_argument("--bucket", choices=list(dict.fromkeys(BUCKETS_ORDER)), default=None, help="Force specific A/B visual bucket")
    args = parser.parse_args()

    log = load_log()
    bucket = pick_next_bucket(log, args.bucket)
    visuals = get_bucket_visuals(bucket)
    if not visuals:
        raise RuntimeError(f"No visuals available for bucket: {bucket}")

    playlist = json.loads(PLAYLIST_PATH.read_text(encoding="utf-8")).get("tracks", [])
    if bucket == "veo_winter":
        xmas_tracks = [t for t in playlist if t.get("category") == "xmas"]
        track_pool = xmas_tracks if xmas_tracks else playlist
    else:
        track_pool = playlist

    recent_visuals = [e.get("visual", "") for e in log]
    recent_tracks = [e.get("track", "") for e in log]

    visual_path = pick_least_recent(visuals, recent_visuals, lambda p: p.name)
    track = pick_least_recent(track_pool, recent_tracks, lambda t: t["file"])
    track_path = PUBLIC_DIR / track["file"]
    if not track_path.exists():
        raise FileNotFoundError(f"Track file not found: {track_path}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    out_mp4 = OUT_DIR / f"short-{bucket}-{stamp}.mp4"
    print(f"Bucket: {bucket} | Visual: {visual_path.name} | Track: {track['title']}")
    render_short(visual_path, track_path, out_mp4, bucket=bucket)
    print(f"Rendered: {out_mp4}")

    if args.build_only:
        return 0

    title = BUCKET_TITLES[bucket].format(track=track["title"])
    yt = get_youtube_service()
    video_id = upload_short(yt, out_mp4, title, bucket)
    url = f"https://www.youtube.com/shorts/{video_id}"
    print(f"Uploaded: {url}")

    log.append({
        "video_id": video_id,
        "url": url,
        "bucket": bucket,
        "visual": visual_path.name,
        "track": track["file"],
        "track_title": track["title"],
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    })
    save_log(log)
    return 0


if __name__ == "__main__":
    sys.exit(main())
