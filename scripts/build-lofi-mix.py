#!/usr/bin/env python3
"""Build a seamless ~1-hour Lofi Radio MP4 mix from playlist.json and a video loop."""

import argparse
import json
import random
import subprocess
import sys
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PLAYLIST_PATH = BASE_DIR / "public" / "playlist.json"
PUBLIC_DIR = BASE_DIR / "public"


def probe_duration(path: Path) -> float:
    """Return media duration in seconds using ffprobe."""
    result = subprocess.run(
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
    return float(result.stdout.strip())


def format_timestamp(seconds: float) -> str:
    """Format seconds as MM:SS or HH:MM:SS for YouTube chapters."""
    total = int(seconds)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def escape_concat_path(path: Path) -> str:
    """Escape file path for ffmpeg concat demuxer."""
    posix = path.resolve().as_posix()
    return posix.replace("'", "'\\''")


def select_tracks(
    tracks: list[dict],
    target_seconds: float,
    prefer_xmas: bool,
    rng: random.Random,
) -> list[tuple[dict, Path, float]]:
    """Select and order tracks up to target_seconds, returning (track, path, duration)."""
    resolved: list[tuple[dict, Path]] = []
    for track in tracks:
        mp3_path = PUBLIC_DIR / track["file"]
        if not mp3_path.exists():
            raise FileNotFoundError(f"Track file not found: {mp3_path}")
        resolved.append((track, mp3_path))

    if prefer_xmas:
        xmas = [item for item in resolved if item[0].get("category") == "xmas"]
        regular = [item for item in resolved if item[0].get("category") != "xmas"]
        rng.shuffle(xmas)
        rng.shuffle(regular)
        ordered = xmas + regular
    else:
        ordered = list(resolved)
        rng.shuffle(ordered)

    selected: list[tuple[dict, Path, float]] = []
    total_sec = 0.0
    idx = 0

    while total_sec < target_seconds and ordered:
        track, mp3_path = ordered[idx % len(ordered)]
        dur = probe_duration(mp3_path)
        selected.append((track, mp3_path, dur))
        total_sec += dur
        idx += 1
        if idx >= len(ordered) and total_sec < target_seconds:
            rng.shuffle(ordered)

    return selected


def build_mix(
    loop_path: Path,
    output_path: Path,
    tracklist_path: Path | None,
    target_minutes: float,
    prefer_xmas: bool,
    seed: int | None,
) -> None:
    if not loop_path.exists():
        raise FileNotFoundError(f"Loop video not found: {loop_path}")
    if not PLAYLIST_PATH.exists():
        raise FileNotFoundError(f"Playlist not found: {PLAYLIST_PATH}")

    data = json.loads(PLAYLIST_PATH.read_text(encoding="utf-8"))
    tracks = data.get("tracks", [])
    if not tracks:
        raise ValueError("No tracks found in playlist.json")

    rng = random.Random(seed)
    target_seconds = target_minutes * 60.0
    selected = select_tracks(tracks, target_seconds, prefer_xmas, rng)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Build YouTube chapter timestamps
    lines: list[str] = []
    elapsed = 0.0
    for track, _, dur in selected:
        title = track.get("title", "Untitled")
        lines.append(f"{format_timestamp(elapsed)} {title}")
        elapsed += dur

    if tracklist_path is not None:
        tracklist_path.parent.mkdir(parents=True, exist_ok=True)
        tracklist_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"Tracklist saved: {tracklist_path} ({len(selected)} tracks, {elapsed/60:.1f} min)")

    with tempfile.TemporaryDirectory() as tmpdir:
        concat_file = Path(tmpdir) / "concat.txt"
        concat_lines = [
            f"file '{escape_concat_path(mp3_path)}'"
            for _, mp3_path, _ in selected
        ]
        concat_file.write_text("\n".join(concat_lines) + "\n", encoding="utf-8")

        cmd = [
            "ffmpeg",
            "-y",
            "-stream_loop",
            "-1",
            "-i",
            str(loop_path),
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "44100",
            "-ac",
            "2",
            "-shortest",
            "-movflags",
            "+faststart",
            str(output_path),
        ]
        print(f"Running ffmpeg -> {output_path.name} ...")
        subprocess.run(cmd, check=True)

    print(f"Created mix: {output_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Lofi Radio YouTube mix MP4.")
    parser.add_argument("--loop", type=Path, required=True, help="Seamless loop MP4 path")
    parser.add_argument("--output", type=Path, required=True, help="Output MP4 path")
    parser.add_argument("--tracklist", type=Path, default=None, help="Output tracklist TXT path")
    parser.add_argument("--target-minutes", type=float, default=60.0, help="Target mix duration in minutes")
    parser.add_argument("--prefer-xmas", action="store_true", help="Put xmas tracks first")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for track ordering")
    args = parser.parse_args()

    build_mix(
        loop_path=args.loop,
        output_path=args.output,
        tracklist_path=args.tracklist,
        target_minutes=args.target_minutes,
        prefer_xmas=args.prefer_xmas,
        seed=args.seed,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
