#!/usr/bin/env python3
"""Download curated royalty-free Winter/Christmas MP3 tracks from Mixkit CDN."""

import json
import re
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
XMAS_DIR = BASE_DIR / "public" / "assets" / "music" / "xmas"
PLAYLIST_PATH = BASE_DIR / "public" / "playlist.json"
CDN_PATH = BASE_DIR / "scripts" / "mixkit-cdn.json"
XMAS_HTML_PATHS = [
    BASE_DIR / "public" / "ru" / "xmas" / "index.html",
    BASE_DIR / "public" / "en" / "xmas" / "index.html",
]

TRACKS = [
    ("148", "Forest Mist Whispers", "forest-mist-whispers"),
    ("588", "Feedback Dreams", "feedback-dreams"),
    ("139", "Spirit in the Woods", "spirit-in-the-woods"),
    ("138", "Forest Treasure", "forest-treasure"),
    ("616", "What it Takes", "what-it-takes"),
    ("147", "Spirit in the Woods 2", "spirit-in-the-woods-2"),
    ("577", "Cristales", "cristales"),
    ("503", "Christmas Jazz", "christmas-jazz"),
    ("985", "Christmas Lullaby", "christmas-lullaby"),
    ("912", "My Christmas Prayer", "my-christmas-prayer"),
    ("510", "Holiday Seasonal 3", "holiday-seasonal-3"),
    ("691", "Holidays 2", "holidays-2"),
]

NETWORK_RESET_CODES = {7, 28, 35, 56}


def verify_mp3(path: Path) -> float:
    size_bytes = path.stat().st_size
    if size_bytes <= 0 or size_bytes >= 25 * 1024 * 1024:
        raise RuntimeError(f"{path.name} invalid size ({size_bytes} bytes)")

    res = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=codec_name:format=duration",
            "-of",
            "default=noprint_wrappers=1",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    if "codec_name=mp3" not in res.stdout:
        raise RuntimeError(f"{path.name} is not a valid mp3: {res.stdout}")

    for line in res.stdout.splitlines():
        if line.startswith("duration="):
            return float(line.split("=", 1)[1])
    raise RuntimeError(f"{path.name} missing duration in ffprobe output")


def main() -> int:
    XMAS_DIR.mkdir(parents=True, exist_ok=True)
    playlist = json.loads(PLAYLIST_PATH.read_text(encoding="utf-8"))
    cdn_map = json.loads(CDN_PATH.read_text(encoding="utf-8")) if CDN_PATH.exists() else {}

    existing_files = {t["file"] for t in playlist["tracks"]}
    next_id = max(t["id"] for t in playlist["tracks"]) + 1
    added = 0
    first_download = True

    for mid, title, slug in TRACKS:
        rel_file = f"assets/music/xmas/{slug}.mp3"
        dst = XMAS_DIR / f"{slug}.mp3"
        url = f"https://assets.mixkit.co/music/{mid}/{mid}.mp3"

        if not dst.exists():
            proc = subprocess.run(
                ["curl.exe", "-fsSL", "--retry", "2", "-o", str(dst), url],
                capture_output=True,
                text=True,
            )
            if proc.returncode != 0:
                if dst.exists():
                    dst.unlink()
                if first_download and proc.returncode in NETWORK_RESET_CODES:
                    print(
                        f"CDN_BLOCKED: curl exited with {proc.returncode} fetching {url}. "
                        "Enable VPN and re-run this script."
                    )
                    return 0
                raise RuntimeError(f"curl failed ({proc.returncode}) for {url}: {proc.stderr.strip()}")
        first_download = False

        dur = verify_mp3(dst)
        size_mb = dst.stat().st_size / (1024 * 1024)
        print(f"OK {dst.name}: {size_mb:.2f} MB, {dur:.1f}s")

        if rel_file not in existing_files:
            playlist["tracks"].append(
                {
                    "artist": "Lofi Radio",
                    "title": title,
                    "category": "xmas",
                    "id": next_id,
                    "file": rel_file,
                }
            )
            existing_files.add(rel_file)
            next_id += 1
            added += 1

        cdn_map[f"{slug}.mp3"] = url

    xmas_count = sum(1 for t in playlist["tracks"] if t.get("category") == "xmas")
    if added > 0:
        PLAYLIST_PATH.write_text(
            json.dumps(playlist, indent=4, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        CDN_PATH.write_text(
            json.dumps(cdn_map, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        for html_path in XMAS_HTML_PATHS:
            content = html_path.read_text(encoding="utf-8")
            updated = re.sub(
                r'("numTracks"\s*:\s*)\d+',
                rf"\g<1>{xmas_count}",
                content,
                count=1,
            )
            html_path.write_text(updated, encoding="utf-8")

    print(f"Done: added {added} tracks. Total: {len(playlist['tracks'])}, xmas: {xmas_count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
