import os
import tempfile


def resolve_models_dir() -> str:
    requested = os.environ.get("MODELS_DIR", ".")
    try:
        os.makedirs(requested, exist_ok=True)
        probe = os.path.join(requested, ".write_probe")
        with open(probe, "w") as f:
            f.write("ok")
        os.remove(probe)
        return requested
    except (PermissionError, OSError):
        fallback = os.path.join(tempfile.gettempdir(), "mediapipe_models")
        os.makedirs(fallback, exist_ok=True)
        print(
            f"[models_dir] WARNING: '{requested}' không writable — "
            f"dùng fallback '{fallback}'. "
            f"Models sẽ được tải lại mỗi lần restart."
        )
        return fallback
