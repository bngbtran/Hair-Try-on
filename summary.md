# Hair Try-on Repo — Technical Summary

## Session: Core Technical Deep Dive

---

## 1. Ba Model Chính và Lý Thuyết

### 1.1 Hair Segmenter (~3MB) — `hair_segmenter.tflite`

**Kiến trúc:** DeepLabV3+ với backbone MobileNetV3 — pixel-wise classifier.

**Output:** `confidence_masks[1]` — confidence map, mỗi pixel từ 0→1 thể hiện xác suất là tóc.

**Tại sao 2 ngưỡng?**
- **Core (≥0.50):** vùng tóc dày, đặc — model chắc chắn
- **Strands (≥0.20):** sợi tóc mỏng ở viền — cần giữ lại để tránh rìa bị cứng

**Morphological post-processing:**
```
Core mask   → close(9×9, ×2) → lấp lỗ hổng bên trong búi tóc
            → open(9×9)       → loại speckle noise nhỏ

Strands     → close(3×3)      → nối sợi tóc bị đứt
            → connected components → chỉ giữ strands dính vào core
```

**Soft alpha = `(conf^0.65) × 255`:**
Gamma 0.65 < 1 kéo đường cong lên — pixel confidence thấp (0.3–0.5) nhận alpha cao hơn tuyến tính. Tránh rìa tóc trong suốt đột ngột, tạo fade tự nhiên.

---

### 1.2 Face Landmarker (~12MB) — `face_landmarker.task`

**Kiến trúc:** BlazeFace (detect) → MobileNetV2 + regression head (mesh).

**Phương pháp:** Coordinate regression — trực tiếp regress tọa độ (x, y, z) của 468 điểm, không dùng heatmap. Nhanh hơn, phù hợp real-time.

**Các landmark quan trọng trong repo:**

| Cần tính | Landmark |
|----------|---------|
| `face_width` (temple) | 356 ↔ 127 |
| Vị trí tai (ear restore) | 234 (trái), 454 (phải) |
| Hairline target (brow) | 70, 63, 105, 66, 107 (trái) + 336, 296, 334, 293, 300 (phải) |
| Eye angle (roll correction) | 33, 133 (left) + 362, 263 (right) |
| Yaw ratio | nose 4, left cheek 234, right cheek 454 |
| Skin color sampling | landmarks 4, 1, 168 |

**Yaw compensation:**
```
yaw_ratio = |nose_x - left_cheek_x| / (right_cheek_x - nose_x)
```
Nếu mặt quay sang phải → yaw_ratio > 1 → skew vị trí tóc sang trái để bù trừ.

---

### 1.3 Face Detector (~0.8MB) — `blaze_face_short_range.tflite`

**Kiến trúc:** BlazeFace — SSD variant với anchor box tối ưu cho khuôn mặt (aspect ratio ~1:1).

**Tại sao nhỏ (~0.8MB)?**
- Float16 quantization (giảm 2×)
- BlazeBlock: depthwise separable convolution
- Single class (face only)
- Short-range variant: tối ưu mặt gần

**Vai trò:** Sub-component bên trong Face Landmarker (auto crop face 256×256 trước khi regress landmarks). Crop chuẩn hóa input → khớp training distribution → accuracy cao hơn.

---

### Quan hệ 3 model

```
[Input Image]
      │
      ▼
Face Detector (0.8MB)  ──→  Bounding box
      │                         │
      │                         ▼
      │                  Face Landmarker (12MB)  ──→  468 landmarks (geometry, yaw, hairline)
      │
      ▼
Hair Segmenter (3MB)  ──→  Confidence map  ──→  Core + Strand mask  ──→  Soft RGBA alpha
```

Ba model chạy độc lập, không share weight. Triết lý **modular cascade** của MediaPipe — khác với end-to-end model học toàn bộ pipeline.

---

## 2. Tại Sao Chọn MediaPipe

### Lý do chính

**1. Không cần GPU ở inference time**
- Deploy trên Render free tier — không có GPU
- MediaPipe được build mobile-first, tối ưu CPU/ARM by design

**2. Ba model sẵn có, pre-trained, pre-packaged**
- Hair segmentation + face landmarks + face detection đều có sẵn dưới dạng `.tflite` / `.task`
- Download về là chạy ngay, không cần train, không cần assemble

**3. Bundle size cực nhỏ**
```
hair_segmenter.tflite          ~3MB   (Float32)
face_landmarker.task           ~12MB  (Float16)
blaze_face_short_range.tflite  ~0.8MB (Float16)
Tổng:                          ~16MB
```
So sánh: SAM ViT-B ~375MB, SegFormer ~64MB.

**4. Không cần quản lý CUDA / framework conflict**
- TFLite runtime tự đóng gói bên trong MediaPipe
- Chỉ cần `pip install mediapipe`

**5. Hair Segmenter là specialist model — không có thứ gì tốt hơn ở scale này**

| Giải pháp | Vấn đề |
|-----------|--------|
| SAM | Cần prompt/click, không tự động, >300MB |
| MODNet / BackgroundMattingV2 | Segment người, không tách riêng tóc |
| U-Net tự train | Cần dataset + training infra |
| **MediaPipe Hair Segmenter** | **Specialist model, 3MB, CPU-only** |

### Đánh đổi phải chấp nhận

- Hair Segmenter kém với tóc xoăn, tóc bay, tóc đen trên nền tối
- Face Landmarker kém chính xác với mặt nghiêng >45°
- Không có MediaPipe model cho inpainting → phải dùng OpenCV TELEA (thuật toán 2004)

**Kết luận:** Với constraint CPU-only + free tier + time-to-ship ngắn, MediaPipe giải quyết phần khó nhất (AI models) để code tập trung vào phần còn lại (geometric warping, blending, color correction).

---

## 3. Pipeline Tổng Quan

### Phase 1 — Admin: Upload Hairstyle
```
Admin upload image
  → HairSegmenter.get_hair_rgba()       # confidence map → RGBA mask
  → straighten_hair()                    # polynomial fit + PCA → deskew
  → Supabase Storage upload (PNG RGBA)
  → Supabase DB insert
```

### Phase 2 — User: Remove Old Hair
```
User upload person image
  → HairSegmenter.get_hair_mask()        # binary mask
  → Dilate + HSV dark detection          # expand erase region
  → Sample skin_ref (outer ring median)
  → OpenCV TELEA inpaint (kernel 21px)
  → Distance-weighted color correction   # dist_norm^0.6 × delta × 0.45
  → Gaussian smooth blend
  → Pass-2 cleanup (residual dark pixels)
  → Ear restoration (landmarks 234, 454 + ellipse draw)
  → Final feather blend
```

### Phase 3 — Overlay: Warp + Composite
```
Extract face geometry (468 landmarks)
  → Compute face_width, eye_angle, brow_y, yaw_ratio, skin_color
  → Find hair root_y (first row >5% hair pixels above brows)
  → Scale + translate + skew (similarity transform)
  → Build hairline alpha (polynomial degree-2 through 13 landmarks, 12px feather)
  → warpAffine (INTER_CUBIC for RGB, INTER_LINEAR for alpha)
  → Porter-Duff source-over composite
  → Edge blend + subtle shadow (×0.96)
```

---

## 4. Key Parameters

| Component | Parameter | Value |
|-----------|-----------|-------|
| Hair Segmenter | Core threshold | 0.50 |
| Hair Segmenter | Strand threshold | 0.20 |
| Hair Segmenter | Soft alpha gamma | 0.65 |
| Hair Remover | Dilate kernel | 13×13, ×3 iter |
| Hair Remover | Dark HSV threshold | V < 80 |
| Hair Remover | Inpaint kernel P1/P2 | 21px / 15px |
| Hair Remover | Distance gamma | 0.6 |
| Hair Remover | Color delta weight | 0.45 |
| Hair Overlay | Scale clip | [0.3, 2.5] |
| Hair Overlay | Hairline feather | 12px |
| Hair Overlay | Yaw skew max | ±0.06 |
| Hair Straightener | Angle guard high | 45° → fallback PCA |
| Hair Straightener | Angle guard extreme | 35° → skip |
| Hair Straightener | Angle guard low | 1.5° → skip |

---

## 5. Tech Stack

```
FastAPI + Uvicorn        # Backend API
MediaPipe 0.10.35        # AI models
OpenCV headless 4.13     # Image processing (inpaint, morph, warp)
Pillow 12.2              # Image I/O
NumPy 2.4                # Array ops
Supabase                 # PostgreSQL DB + S3 Storage
Render.com               # CPU-only deployment
Vercel                   # Frontend hosting
```
