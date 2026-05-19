# Hair Try-on — Virtual Hairstyle Try-On System

A monorepo containing two FastAPI microservices and a React Native + Expo frontend that lets users virtually try on hairstyles.

---

## Architecture

```
                 ┌─────────────────────────────────────┐
                 │         Frontend (Expo)              │
                 │  React Native Web + iOS + Android    │
                 └────────────┬────────────┬────────────┘
                              │            │
               REST           │            │          REST
        ┌─────────────────────┘            └──────────────────────┐
        ▼                                                          ▼
┌───────────────────────┐                          ┌──────────────────────────┐
│  backend-face-service  │  fetches asset paths     │ backend-hairstyle-service │
│  port 8002             │ ──────────────────────►  │  port 8001                │
│                        │                          │                           │
│  • Face detection      │                          │  • CRUD hairstyles        │
│  • Landmark detection  │                          │  • Image upload           │
│  • Face alignment      │                          │  • Hair mask extraction   │
│  • Hair segmentation   │                          │  • Thumbnail generation   │
│  • Hairstyle overlay   │                          │                           │
└───────────────────────┘                          └──────────────────────────┘
        │                                                          │
        └──────────────────── local storage ──────────────────────┘
                          (no database required)
```

### Try-On Pipeline

```
Upload photo
    │
    ▼
Face Detection (MediaPipe FaceMesh — 478 landmarks)
    │
    ▼
Face Alignment (affine transform, eye-aligned to 512x512)
    │
    ▼
Hair Segmentation (SelfieSegmentation + HSV color masking)
    │
    ▼
Hairstyle Overlay (alpha-blend new hair, erase old hair)
    │
    ▼
Warp composite back to original image dimensions
    │
    ▼
Return PNG result
```

---

## Repository Structure

```
Hair-Try-on/
├── backend-hairstyle-service/
│   ├── app/
│   │   ├── main.py
│   │   ├── models/hairstyle.py
│   │   ├── routes/hairstyle_routes.py
│   │   └── services/hairstyle_service.py
│   ├── storage/                      <- auto-created, git-ignored
│   ├── requirements.txt
│   └── run.py
│
├── backend-face-service/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/face_routes.py
│   │   └── services/
│   │       ├── face_detector.py      <- MediaPipe FaceMesh
│   │       ├── face_aligner.py       <- affine alignment
│   │       ├── hair_segmentor.py     <- SelfieSegmentation + HSV
│   │       ├── hairstyle_overlay.py  <- alpha blending
│   │       └── tryon_pipeline.py     <- orchestrator
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx               <- Expo Router tab layout
│   │   ├── index.tsx                 <- Try-On tab
│   │   └── admin.tsx                 <- Admin tab
│   ├── src/
│   │   ├── screens/
│   │   │   ├── TryOnScreen.tsx
│   │   │   └── AdminScreen.tsx
│   │   ├── components/
│   │   │   ├── HairstyleCard.tsx
│   │   │   ├── ImageUploader.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── services/
│   │   │   ├── config.ts
│   │   │   ├── hairstyleApi.ts
│   │   │   └── faceApi.ts
│   │   ├── hooks/useHairstyles.ts
│   │   └── types/index.ts
│   ├── assets/
│   ├── package.json
│   └── app.json
│
├── shared/
│   └── types.ts
└── README.md
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python (Anaconda env `msa`) | 3.10+ |
| Node.js | 18+ |
| npm / npx | latest |

---

## Setup & Run

### 1. backend-hairstyle-service (port 8001)

```bash
cd backend-hairstyle-service

conda activate msa
pip install -r requirements.txt

python run.py
```

Swagger UI: http://localhost:8001/docs

---

### 2. backend-face-service (port 8002)

```bash
cd backend-face-service

conda activate msa
pip install -r requirements.txt

python run.py
```

Swagger UI: http://localhost:8002/docs

> MediaPipe downloads ~30 MB of model weights on first run.

---

### 3. frontend

```bash
cd frontend
npm install

# Web browser
npx expo start --web

# Android emulator / device
npx expo start --android

# iOS (macOS only)
npx expo start --ios
```

> **Physical device:** edit `frontend/src/services/config.ts` and replace
> `localhost` with your machine's LAN IP (e.g. `192.168.1.42`).

---

## API Reference

### backend-hairstyle-service (port 8001)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hairstyles/` | List all hairstyles |
| POST | `/hairstyles/` | Create hairstyle metadata |
| GET | `/hairstyles/{id}` | Get single hairstyle |
| PATCH | `/hairstyles/{id}` | Update metadata |
| DELETE | `/hairstyles/{id}` | Delete hairstyle + files |
| POST | `/hairstyles/{id}/upload` | Upload hairstyle image |
| GET | `/hairstyles/{id}/image` | Serve original image |
| GET | `/hairstyles/{id}/thumbnail` | Serve 200x200 thumbnail |
| GET | `/hairstyles/{id}/mask` | Serve extracted hair mask |
| GET | `/health` | Health check |

### backend-face-service (port 8002)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/face/detect` | Detect face + return landmarks |
| POST | `/face/tryon` | Full pipeline → PNG result |
| GET | `/health` | Health check |

#### `/face/tryon` multipart body

| Field | Type | Description |
|-------|------|-------------|
| `face_image` | file | User's photo (JPEG/PNG) |
| `hairstyle_id` | string | ID from hairstyle service |

Returns `image/png`.

---

## Quick curl Test

```bash
# 1. Create hairstyle record
curl -X POST http://localhost:8001/hairstyles/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Long Wavy","color":"Black","style_type":"Wavy","tags":["long","wavy"]}'
# -> note the "id" field in response

# 2. Upload image for that hairstyle
curl -X POST http://localhost:8001/hairstyles/<ID>/upload \
  -F "file=@hairstyle.png"

# 3. Run try-on
curl -X POST http://localhost:8002/face/tryon \
  -F "face_image=@myface.jpg" \
  -F "hairstyle_id=<ID>" \
  --output result.png
```

---

## Environment Variables

| Service | Variable | Default | Description |
|---------|----------|---------|-------------|
| face-service | `HAIRSTYLE_SERVICE_URL` | `http://localhost:8001` | Hairstyle service base URL |

---

## Known Limitations (MVP)

- Flat JSON file storage — no database needed for development
- Hair segmentation uses HSV heuristics; complex backgrounds reduce accuracy
- Single face per image
- No authentication
