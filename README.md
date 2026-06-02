# Hair Try-on

Ứng dụng thử kiểu tóc ảo sử dụng Computer Vision và AI. Người dùng upload ảnh chân dung, chọn kiểu tóc, và nhận kết quả ghép tóc chân thực ngay lập tức.

---

## Tính năng

- **Thử tóc ảo:** Upload ảnh cá nhân, chọn kiểu tóc và xem kết quả trong vài giây
- **Quản lý kiểu tóc:** Admin có thể upload, chỉnh sửa, xóa kiểu tóc (tự động trích xuất tóc bằng AI)
- **Cross-platform:** Hoạt động trên Web, iOS và Android qua React Native/Expo
- **Pipeline AI hoàn toàn tự động:** Xóa tóc cũ, ghép tóc mới, blend tự nhiên không cần can thiệp thủ công

---

## Demo Pipeline

```
Ảnh người dùng                    Kiểu tóc (RGBA)
      ↓                                  ↓
[HairSegmenter]                   [Đã upload sẵn]
      ↓
[Xóa tóc cũ + Inpaint]
      ↓
[Phát hiện khuôn mặt]
      ↓
[Warp + Blend kiểu tóc]
      ↓
   Kết quả
```

---

## Kiến trúc

```
Hair-Try-on/
├── backend/                    # FastAPI backend (Python 3.11.9)
│   ├── app/
│   │   ├── main.py             # Entry point
│   │   ├── api/
│   │   │   ├── tryon.py        # POST /tryon — pipeline chính
│   │   │   └── admin.py        # CRUD kiểu tóc
│   │   ├── services/           # ML pipeline
│   │   │   ├── hair_segmenter.py    # MediaPipe Hair Segmenter
│   │   │   ├── hair_remover.py      # Xóa tóc + inpaint
│   │   │   ├── hair_overlay.py      # Ghép tóc + blend
│   │   │   ├── hair_extractor.py    # Trích xuất tóc từ ảnh upload
│   │   │   ├── hair_straightener.py # Nắn thẳng tóc
│   │   │   └── mediapipe_models.py  # Quản lý model download
│   │   ├── database/
│   │   │   ├── db.py           # SQLAlchemy setup
│   │   │   └── models.py       # ORM models
│   │   └── utils/
│   ├── assets/hairstyles/      # File ảnh tóc RGBA
│   └── requirements.txt
├── frontend/                   # React Native/Expo
│   ├── src/
│   │   ├── screens/
│   │   │   ├── UserScreen.tsx  # Giao diện thử tóc
│   │   │   └── AdminScreen.tsx # Quản lý kiểu tóc
│   │   └── api/client.ts       # API client
│   └── app.json
├── hair.ipynb                  # Notebook: Pipeline tách tóc (chi tiết)
├── face.ipynb                  # Notebook: Pipeline xóa + ghép tóc (chi tiết)
├── render.yaml                 # Cấu hình deploy Render.com
└── README.md
```

---

## Tech Stack

### Backend
| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Web framework | FastAPI | 0.136.3 |
| ASGI server | Uvicorn | 0.48.0 |
| ORM | SQLAlchemy | 2.0.50 |
| Database | SQLite | — |
| Xử lý ảnh | Pillow | 12.2.0 |
| Computer Vision | OpenCV (headless) | 4.13.0.92 |
| AI / ML | MediaPipe | 0.10.35 |
| Numerical | NumPy | 2.4.6 |

### Frontend
| Thành phần | Công nghệ |
|---|---|
| Framework | React Native + Expo |
| Navigation | React Navigation (Bottom Tabs) |
| Image picker | Expo ImagePicker |
| Platform | iOS, Android, Web |

### AI Models (MediaPipe / TensorFlow Lite)
| Model | File | Mục đích |
|---|---|---|
| Hair Segmenter | `hair_segmenter.tflite` (float32) | Phân đoạn vùng tóc |
| Face Landmarker | `face_landmarker.task` (float16) | 468 điểm mốc khuôn mặt |
| Face Detector | `face_detector.tflite` (float16) | Phát hiện khuôn mặt |

> Model tự động tải về lần đầu chạy, lưu tại thư mục `MODELS_DIR`.

---

## Cài đặt & Chạy

### Yêu cầu
- Python 3.11+
- Node.js 18+
- Conda hoặc venv

### Backend

```bash
cd backend

# Tạo môi trường (conda)
conda create -n hair-tryon python=3.11 -y
conda activate hair-tryon

# Cài thư viện
pip install -r requirements.txt

# Chạy server
uvicorn app.main:app --reload --port 8000
```

Server chạy tại `http://localhost:8000`. Swagger UI tại `http://localhost:8000/docs`.

> **Lần đầu chạy:** Backend tự động tải 3 model MediaPipe (~50MB). Cần kết nối internet.

### Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Tạo file cấu hình
echo "EXPO_PUBLIC_API_URL=http://localhost:8000" > .env

# Chạy Expo
npx expo start
```

Quét QR code bằng app Expo Go, hoặc nhấn `w` để mở trên trình duyệt.

---

## API Reference

### Try-on

#### `POST /tryon`

Ghép kiểu tóc lên ảnh người dùng.

**Request** — `multipart/form-data`:

| Field | Type | Mô tả |
|---|---|---|
| `person_image` | File (PNG/JPG) | Ảnh chân dung người dùng |
| `hairstyle_id` | Integer | ID kiểu tóc trong database |

**Response** — `image/png`: Ảnh kết quả PNG

**Ràng buộc:**
- Ảnh được resize về tối đa 800px nếu vượt quá
- Khuôn mặt phải nhìn rõ ràng (face detection threshold 0.5)

---

### Admin — Quản lý kiểu tóc

#### `POST /admin/upload-hairstyle`

Upload và trích xuất kiểu tóc mới.

**Request** — `multipart/form-data`:

| Field | Type | Mô tả |
|---|---|---|
| `name` | String | Tên kiểu tóc |
| `image` | File (PNG/JPG) | Ảnh chụp kiểu tóc |

**Response:**
```json
{
  "id": 1,
  "name": "Tóc ngắn layer",
  "image_path": "assets/hairstyles/toc_ngan_layer.png",
  "created_at": "2024-01-15T10:30:00"
}
```

Pipeline tự động: `ảnh gốc → HairSegmenter → RGBA → straighten → lưu file → DB`

---

#### `GET /admin/hairstyles`

Lấy danh sách tất cả kiểu tóc.

#### `GET /admin/hairstyles/{id}`

Lấy chi tiết một kiểu tóc.

#### `PUT /admin/hairstyles/{id}`

Cập nhật tên hoặc ảnh kiểu tóc.

#### `DELETE /admin/hairstyles/{id}`

Xóa kiểu tóc.

---

## Pipeline AI Chi Tiết

### Phase 1 — Tách tóc từ ảnh kiểu tóc (Admin Upload)

**File:** `hair_segmenter.py`, `hair_straightener.py`, `hair_extractor.py`

```
Ảnh tóc gốc
    ↓
[1] MediaPipe Hair Segmenter → Confidence Map (float32 H×W, range 0–1)
    ↓
[2] Core Mask: conf > 0.50
    + MORPH_CLOSE (9×9 ellipse, ×2) → lấp lỗ hổng
    + MORPH_OPEN  (9×9 ellipse)     → loại nhiễu nhỏ
    ↓
[3] Strands Mask: conf > 0.20
    + Connected Components: chỉ giữ blob kết nối với Core
    → bắt sợi tóc mảnh, loại nhiễu nền
    ↓
[4] Binary Mask = Core | Strands
    ↓
[5] Soft Alpha: alpha = conf^0.65 × 255 (trong binary > 0)
    + Floor: conf > 0.8 → alpha = 255 (vùng tóc chắc chắn)
    ↓
[6] RGBA Image = RGB + Alpha
    ↓
[7] Hair Straightening:
    + Fit polynomial bậc 1 qua chân tóc (bottom 25%)
    + Nếu góc > 45° → fallback PCA eigenvector
    + Guard: góc > 35° bỏ qua, góc < 1.5° bỏ qua
    + PIL.rotate (BICUBIC)
    ↓
Lưu PNG + ghi vào database
```

---

### Phase 2 — Xóa tóc người dùng

**File:** `hair_remover.py`

```
Ảnh người dùng
    ↓
[1] HairSegmenter → hair_mask (Binary H×W)
    ↓
[2] Erase Mask:
    mask_dilate = dilate(hair_mask, 13×13, ×3)
    dark = HSV(V<80) ∩ dilate(hair_mask, 13×13, ×4)
    erase_mask = mask_dilate | dark
    ↓
[3] Sample skin_ref: giá trị trung bình vùng da xung quanh erase_mask
    (outer ring = dilate_30 - dilate_5, lọc pixel sáng > 80)
    ↓
[4] Pre-fill vùng xóa bằng skin_ref → TELEA Inpaint (kernel 21px)
    ↓
[5] Distance-Weighted Color Correction:
    dist_norm = (distanceTransform / max)^0.6
    color_delta = (skin_ref - inpainted_mean) × 0.45
    offset = dist_norm × color_delta
    ↓
[6] Gaussian Smoothing (11×11):
    result = inpainted × (1 - sw) + smooth × sw
    sw = dist_norm × 0.35
    ↓
[7] Pass-2 Cleanup: phát hiện dark pixel sót (V<90) → inpaint lần 2 (kernel 15px)
    ↓
[8] Ear Restore: lấy landmark 234 (tai trái) + 454 (tai phải)
    → vẽ ellipse tai → feather blend (Gaussian 7px) với ảnh gốc
    ↓
[9] Feather Blend biên: Gaussian blur(erase_mask, 11×11)
    result = inpainted × blur_mask + original × (1 - blur_mask)
    ↓
Output: no_hair_pil (RGBA), hair_mask (ndarray)
```

---

### Phase 3 — Ghép tóc mới

**File:** `hair_overlay.py`

```
no_hair_pil + hair_pil + hair_mask
    ↓
[1] Face Geometry (FaceLandmarker 468 points):
    - face_width, cheek_width, temple_left/right
    - brow_y, nose_tip_y, hairline_pt
    - angle_deg (eye vector), yaw_ratio (nose offset)
    - skin_color (median tại điểm 4, 1, 168)
    ↓
[2] Mask Geometry:
    - Tìm root_y: hàng cao nhất có >5% pixel tóc (trong cheek width)
    - mask_cx, mask_width, mask_top, mask_height
    ↓
[3] Face-Anchored Placement:
    - scale = max(scale_w, scale_h), clip [0.3, 2.5]
    - target = (mask_cx, root_y) hoặc hairline_pt
    - yaw_offset: skew = clip((yaw_ratio-1)×0.12, -0.06, 0.06)
    - cx_hair = xs_min + bbox_w × (0.5 + skew)
    ↓
[4] Hairline Alpha Mask:
    - Polynomial fit bậc 2 qua 13 landmarks chân tóc
    - alpha = 1 phía trên hairline, giảm dần 12px phía dưới
    - Tắt fade tại thái dương (giữ sắc nét)
    ↓
[5] Affine Transform:
    M = similarity_matrix(src=anchor_hair, dst=target, scale, angle)
    wa     = warpAffine(rgb,   M, INTER_CUBIC)
    walpha = warpAffine(alpha, M, INTER_LINEAR)
    walpha = walpha^0.95 × hairline_alpha
    ↓
[6] Composite (Porter-Duff source-over):
    result = no_hair × (1-alpha) + hair × alpha
    ↓
[7] Blend Hairline:
    - morphological gradient → edge tóc
    - chỉ blend vùng trán (giữa thái dương, trên mày)
    - Gaussian smooth edge (11×11)
    - shadow nhẹ: × (1 - 0.04 × shad)
    ↓
Output: final RGBA image
```

---

## Notebooks

Hai notebook tại root giải thích chi tiết từng bước pipeline:

| File | Nội dung |
|---|---|
| `hair.ipynb` | Pipeline tách tóc (Hair Segmentation) — Admin upload flow |
| `face.ipynb` | Pipeline xóa tóc cũ + ghép tóc mới — User try-on flow |

Mỗi bước có:
- Giải thích thuật toán và công nghệ
- Code thực thi đúng như trong dự án
- Visualization kết quả từng bước

### Cách chạy notebook

```bash
# Kích hoạt môi trường
conda activate hair-tryon

# Cài jupyter nếu chưa có
pip install jupyter matplotlib

# Mở notebook
jupyter notebook hair.ipynb
jupyter notebook face.ipynb
```

---

## Database Schema

```python
Hairstyle:
  id         : Integer  (primary key)
  name       : String   (required)
  image_path : String   (path tới file RGBA PNG)
  preview_path: String  (optional)
  created_at : String   (ISO timestamp)
```

**Database:** SQLite (mặc định `hairstyle.db`)  
**Production:** `/data/hairstyle.db` trên persistent disk (Render.com)

---

## Deploy lên Render.com

Dự án đã có cấu hình `render.yaml`:

```yaml
services:
  - type: web
    runtime: python
    rootDir: backend
    buildCommand: bash build.sh
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    region: singapore
    disk:
      sizeGB: 2
      mountPath: /data
```

**Biến môi trường cần thiết trên Render:**

| Biến | Giá trị | Mô tả |
|---|---|---|
| `DATABASE_URL` | `sqlite:////data/hairstyle.db` | Database trên persistent disk |
| `ASSETS_DIR` | `/data/assets` | Thư mục lưu ảnh tóc |
| `MODELS_DIR` | `/data/models` | Thư mục lưu model AI |
| `MEDIAPIPE_DISABLE_GPU` | `1` | Dùng CPU (Render không có GPU) |
| `LIBGL_ALWAYS_SOFTWARE` | `1` | Software OpenGL cho OpenCV |

**Frontend:** Thêm `EXPO_PUBLIC_API_URL=https://your-backend.onrender.com` vào Expo config.

---

## Cấu trúc Database

Kiểu tóc được lưu dưới dạng file RGBA PNG tại `assets/hairstyles/`. Tên file được sanitize (lowercase, loại ký tự đặc biệt, thay space bằng underscore). Khi trùng tên, tự động thêm số đếm (`_1`, `_2`, ...).

---

## Giới hạn & Lưu ý

- **Ảnh đầu vào:** Khuôn mặt nhìn thẳng hoặc hơi nghiêng, ánh sáng tốt, không bị che khuất nhiều
- **Ảnh tối đa:** Tự động resize về 800px chiều dài nhất trước khi xử lý
- **Tóc rất tối / đen:** Có thể bị phát hiện sót một phần ở Pass-1 inpaint, được xử lý ở Pass-2
- **Tóc dài:** Pipeline hoạt động tốt nhất với tóc ngắn đến trung bình
- **CPU only:** Tất cả inference chạy trên CPU (MediaPipe TFLite tối ưu cho CPU)
- **Thời gian xử lý:** ~2–5 giây cho ảnh 800px trên CPU thông thường

---

## Luồng dữ liệu đầy đủ

```
┌─────────────────────────────────────────────────────┐
│                    ADMIN FLOW                       │
│  Upload ảnh tóc → HairSegmenter → RGBA              │
│  → Straighten → Lưu file → Ghi DB                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    USER FLOW                        │
│  Chọn ảnh → POST /tryon (person + hairstyle_id)     │
│                                                     │
│  Backend:                                           │
│  1. Load hairstyle từ DB → đọc RGBA file           │
│  2. remove_old_hair(person):                        │
│     HairSeg → Erase → Inpaint → Correct → no_hair  │
│  3. overlay_hair(person, no_hair, mask, hair):      │
│     Landmarks → Scale → Warp → Composite → final   │
│  4. Trả PNG về client                               │
│                                                     │
│  Frontend: hiển thị before/after, cho phép download │
└─────────────────────────────────────────────────────┘
```
