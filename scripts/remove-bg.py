#!/usr/bin/env python3
"""
Remove backgrounds from sticker-maker and t-shirt-design-maker example images.
Uses Volcengine saliency_seg API, then re-saves as webp with transparency.
"""
import base64
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# Load env from backend/.env
backend_env = Path(__file__).resolve().parent.parent.parent / "backend" / ".env"
if backend_env.exists():
    for line in backend_env.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

from volcengine.visual.VisualService import VisualService

svc = VisualService()
svc.set_ak(os.environ["VOLC_AK"])
svc.set_sk(os.environ["VOLC_SK"])

EXAMPLES_DIR = Path(__file__).resolve().parent.parent / "public" / "examples"
UPLOAD_SCRIPT = Path.home() / ".cursor" / "skills" / "upload-image" / "upload.mjs"


def upload_file(filepath: str) -> str:
    result = subprocess.check_output(
        ["node", str(UPLOAD_SCRIPT), filepath],
        timeout=60,
    ).decode().strip()
    # Last line is the URL
    return result.split("\n")[-1].strip()


def remove_bg(image_url: str) -> bytes | None:
    form = {
        "req_key": "saliency_seg",
        "image_urls": [image_url],
        "rgb": [-1, -1, -1],
        "only_mask": 2,
        "refine_mask": 0,
    }
    resp = svc.cv_process(form)
    if resp.get("code") != 10000:
        print(f"  ERROR: {resp}", file=sys.stderr)
        return None
    b64_list = resp.get("data", {}).get("binary_data_base64")
    if not b64_list:
        print("  ERROR: no binary data", file=sys.stderr)
        return None
    return base64.b64decode(b64_list[0])


def process_scene(slug: str):
    files = sorted(EXAMPLES_DIR.glob(f"{slug}_*.webp"))
    if not files:
        print(f"No files for {slug}")
        return

    print(f"\n=== {slug}: {len(files)} files ===")
    for f in files:
        print(f"[{f.name}] uploading...")
        url = upload_file(str(f))
        print(f"  url: {url[:60]}...")

        print(f"  removing background...")
        png_bytes = remove_bg(url)
        if not png_bytes:
            print(f"  FAILED!")
            continue

        # Save transparent PNG, then convert to webp
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(png_bytes)
            tmp_path = tmp.name

        # Convert to webp with alpha channel
        out_webp = str(f)
        subprocess.run(
            ["cwebp", "-q", "80", "-alpha_q", "90", tmp_path, "-o", out_webp],
            capture_output=True, check=True,
        )
        os.unlink(tmp_path)
        print(f"  DONE: {f.name}")


if __name__ == "__main__":
    if sys.argv[1:2] == ["--url"]:
        # Single image: remove-bg.py --url <public image url> --out <file.png>
        # Used for freshly generated images that already have a public URL (no extra upload needed).
        src_url, out_path = sys.argv[2], sys.argv[sys.argv.index("--out") + 1]
        data = remove_bg(src_url)
        if not data:
            sys.exit("background removal failed")
        Path(out_path).write_bytes(data)
        print(f"saved {out_path}")
        sys.exit(0)

    scenes = sys.argv[1:] or ["sticker-maker", "t-shirt-design-maker"]
    for s in scenes:
        process_scene(s)
    print("\nAll done!")
