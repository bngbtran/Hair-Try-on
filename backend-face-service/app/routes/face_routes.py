from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
import httpx
import os
import tempfile
from pathlib import Path

from app.services.tryon_pipeline import run_tryon
from app.services.face_detector import detect_face_and_landmarks

router = APIRouter(prefix="/face", tags=["face"])

HAIRSTYLE_SERVICE_URL = os.getenv("HAIRSTYLE_SERVICE_URL", "http://localhost:8001")


async def _download_hairstyle_images(hairstyle_id: str) -> tuple[str, str | None]:
    """
    Download hairstyle image (and mask if available) from hairstyle service
    into temp files. Returns (image_tmp_path, mask_tmp_path | None).
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Check hairstyle exists
        meta = await client.get(f"{HAIRSTYLE_SERVICE_URL}/hairstyles/{hairstyle_id}")
        if meta.status_code == 404:
            raise HTTPException(status_code=404, detail="Hairstyle not found")
        meta.raise_for_status()
        data = meta.json()

        if not data.get("image_path") and not data.get("image_url"):
            raise HTTPException(status_code=422, detail="Hairstyle has no image uploaded yet")

        # Download image
        img_resp = await client.get(f"{HAIRSTYLE_SERVICE_URL}/hairstyles/{hairstyle_id}/image")
        img_resp.raise_for_status()

        tmp_img = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        tmp_img.write(img_resp.content)
        tmp_img.close()
        print(f"[tryon] Downloaded hairstyle image → {tmp_img.name}")

        # Download mask if available
        tmp_mask_path = None
        if data.get("mask_path"):
            mask_resp = await client.get(f"{HAIRSTYLE_SERVICE_URL}/hairstyles/{hairstyle_id}/mask")
            if mask_resp.status_code == 200:
                tmp_mask = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                tmp_mask.write(mask_resp.content)
                tmp_mask.close()
                tmp_mask_path = tmp_mask.name
                print(f"[tryon] Downloaded hairstyle mask   → {tmp_mask.name}")

    return tmp_img.name, tmp_mask_path


@router.post("/detect")
async def detect_face(file: UploadFile = File(...)):
    import cv2
    import numpy as np

    raw = await file.read()
    arr = np.frombuffer(raw, np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise HTTPException(status_code=400, detail="Cannot decode image")

    face = detect_face_and_landmarks(bgr)
    if face is None:
        raise HTTPException(status_code=422, detail="No face detected")

    return {
        "detected": True,
        "bbox": {"x": face.bbox[0], "y": face.bbox[1], "w": face.bbox[2], "h": face.bbox[3]},
        "left_eye": face.left_eye.tolist(),
        "right_eye": face.right_eye.tolist(),
        "nose_tip": face.nose_tip.tolist(),
        "landmark_count": len(face.landmarks_px),
    }


@router.post("/tryon")
async def tryon(
    face_image: UploadFile = File(...),
    hairstyle_id: str = Form(...),
):
    face_bytes = await face_image.read()
    print(f"[tryon] face_bytes size={len(face_bytes)}, hairstyle_id={hairstyle_id}")

    try:
        image_path, mask_path = await _download_hairstyle_images(hairstyle_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Hairstyle service error: {e}")

    try:
        result_png = run_tryon(
            face_image_bytes=face_bytes,
            hairstyle_image_path=image_path,
            hairstyle_mask_path=mask_path,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing error: {type(e).__name__}: {e}")
    finally:
        # Clean up temp files
        Path(image_path).unlink(missing_ok=True)
        if mask_path:
            Path(mask_path).unlink(missing_ok=True)

    return Response(content=result_png, media_type="image/png")
