"""
model_downloader.py
-------------------
Optional: Download ML model files from Hugging Face Hub on Render startup.
Use this if you prefer not to store large .pth / .pkl files in Git LFS.

SETUP:
1. Upload your model files to a Hugging Face dataset repo (hf.co/your-username/cervixai-models)
2. Set HF_REPO_ID in Render environment variables
3. Import and call `ensure_models()` at the top of app.py

Usage in app.py:
    from model_downloader import ensure_models
    ensure_models()
"""

import os
import sys
import hashlib
from pathlib import Path

MODEL_DIR = Path(os.environ.get('MODEL_DIR', 'model'))
HF_REPO_ID = os.environ.get('HF_REPO_ID', '')   # e.g. "yourname/cervixai-models"

# File registry — add sha256 checksums for integrity verification
MODEL_FILES = {
    'xgboost_model.pkl':        {'size_kb': 136,    'sha256': None},
    'scaler.pkl':               {'size_kb': 2,      'sha256': None},
    'feature_names.pkl':        {'size_kb': 1,      'sha256': None},
    'best_fastvit_model.pth':   {'size_kb': 14600,  'sha256': None},
}


def file_exists_and_valid(path: Path, expected_sha: str | None) -> bool:
    """Returns True if file exists and (optionally) passes sha256 check."""
    if not path.exists():
        return False
    if expected_sha is None:
        return True
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    return sha == expected_sha


def download_from_huggingface():
    """Download all model files from HF Hub."""
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        print("⚠  huggingface_hub not installed. Run: pip install huggingface-hub")
        return False

    if not HF_REPO_ID:
        print("⚠  HF_REPO_ID environment variable not set. Skipping HF download.")
        return False

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    all_ok = True

    for filename, meta in MODEL_FILES.items():
        dest = MODEL_DIR / filename
        if file_exists_and_valid(dest, meta['sha256']):
            print(f"✓  {filename} already present ({meta['size_kb']} KB)")
            continue

        print(f"⬇  Downloading {filename} from {HF_REPO_ID}…")
        try:
            local_path = hf_hub_download(
                repo_id=HF_REPO_ID,
                filename=filename,
                repo_type='dataset',
                local_dir=str(MODEL_DIR),
                local_dir_use_symlinks=False,
            )
            print(f"✓  {filename} → {local_path}")
        except Exception as e:
            print(f"✗  Failed to download {filename}: {e}")
            all_ok = False

    return all_ok


def ensure_models():
    """
    Main entry point. Verifies all model files exist.
    Downloads from HF Hub if any are missing.
    Exits with error if models cannot be found after download attempt.
    """
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    missing = [f for f in MODEL_FILES if not (MODEL_DIR / f).exists()]

    if not missing:
        print(f"✓  All {len(MODEL_FILES)} model files present in {MODEL_DIR}/")
        return

    print(f"⚠  Missing model files: {missing}")
    print("   Attempting download from Hugging Face Hub…")

    success = download_from_huggingface()

    # Final check
    still_missing = [f for f in MODEL_FILES if not (MODEL_DIR / f).exists()]
    if still_missing:
        print(f"\n✗  Could not resolve model files: {still_missing}")
        print("   Options:")
        print("   1. Set HF_REPO_ID env var and upload models to Hugging Face")
        print("   2. Commit models via Git LFS (see .gitattributes)")
        print("   3. Mount a persistent disk on Render and place models there")
        sys.exit(1)

    print(f"✓  All model files ready.")


if __name__ == '__main__':
    ensure_models()
