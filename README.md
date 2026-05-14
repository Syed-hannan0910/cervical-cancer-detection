# CervixAI — Explainable Two-Stage Cervical Cancer Detection

> **AI-powered cervical cancer risk assessment** combining XGBoost clinical risk prediction with FastViT cytological image classification. Features SHAP explainability, Grad-CAM heatmaps, and downloadable PDF reports.

[![Backend: Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Frontend: Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Local Development](#local-development)
- [Deploying to GitHub](#deploying-to-github)
- [Deploying Backend to Render](#deploying-backend-to-render)
- [Deploying Frontend to Vercel](#deploying-frontend-to-vercel)
- [Environment Variables](#environment-variables)
- [Model Files & Git LFS](#model-files--git-lfs)
- [API Reference](#api-reference)
- [Medical Disclaimer](#medical-disclaimer)

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   User's Browser                     │
│              React + Vite (Vercel CDN)               │
└────────────────────┬─────────────────────────────────┘
                     │  HTTPS + JWT Bearer Token
                     ▼
┌──────────────────────────────────────────────────────┐
│              Flask REST API (Render)                 │
│    ┌──────────────┐    ┌─────────────────────────┐   │
│    │  XGBoost     │    │  FastViT (timm)          │   │
│    │  Risk Model  │    │  Cell Classifier         │   │
│    │  + SHAP      │    │  + Grad-CAM              │   │
│    └──────────────┘    └─────────────────────────┘   │
│              SQLite (JWT-authenticated users)        │
└──────────────────────────────────────────────────────┘
```

**Two-Stage Detection Pipeline:**
1. **Stage 1 — Clinical Risk (XGBoost):** 10 key risk factors → risk probability + SHAP waterfall chart
2. **Stage 2 — Cytological Analysis (FastViT):** High-risk cases → 5-class cell classification + Grad-CAM heatmap

---

## Features

| Feature | Description |
|---|---|
| 🎯 XGBoost Risk Prediction | 35-feature model distilled to 10 top clinical inputs |
| 📊 SHAP Explainability | Waterfall chart showing per-feature contribution |
| 🔬 FastViT Cell Classification | 5-class cervical cell morphology (224×224 images) |
| 🔥 Grad-CAM Heatmaps | Visual attention overlay on cell images |
| 🔐 JWT Authentication | Secure cross-origin auth (Vercel ↔ Render) |
| 📄 PDF Report Export | Downloadable clinical report with all findings |
| 📈 Assessment History | Persistent per-user assessment records |
| 📱 Responsive UI | Mobile-first React interface |

---

## Tech Stack

### Backend (`/backend`)
- **Flask 3.1** — REST API
- **Flask-JWT-Extended** — Cross-origin authentication
- **Flask-CORS** — CORS for Vercel ↔ Render
- **XGBoost 2.0** — Clinical risk prediction
- **PyTorch + timm** — FastViT deep learning model
- **SHAP 0.44** — Explainable AI
- **pytorch-grad-cam** — Visual explanations
- **ReportLab** — PDF generation
- **Gunicorn** — Production WSGI server

### Frontend (`/frontend`)
- **React 18** — UI framework
- **Vite 5** — Build tool
- **React Router 6** — Client-side routing
- **Tailwind CSS 3** — Utility-first styling
- **Axios** — HTTP client with JWT interceptors

---

## Repository Structure

```
cervical-cancer-detection/
├── backend/                    # Flask API — deploy to Render
│   ├── app.py                  # Main application
│   ├── requirements.txt        # Python dependencies
│   ├── Procfile                # Gunicorn start command
│   ├── render.yaml             # Render deployment config
│   ├── .env.example            # Environment template
│   ├── .gitattributes          # Git LFS config for model files
│   ├── .gitignore
│   └── model/                  # ML model files (Git LFS)
│       ├── xgboost_model.pkl
│       ├── scaler.pkl
│       ├── feature_names.pkl
│       └── best_fastvit_model.pth
│
├── frontend/                   # React SPA — deploy to Vercel
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js       # Axios instance + JWT interceptors
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Global auth state
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Detection.jsx    # Risk assessment form
│   │   │   ├── Results.jsx      # Results + image upload
│   │   │   └── History.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   └── .env.example
│
└── README.md
```

---

## Local Development

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git + Git LFS

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/cervical-cancer-detection.git
cd cervical-cancer-detection
```

### 2. Set up the backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your SECRET_KEY, JWT_SECRET_KEY, FRONTEND_URL

# Place model files in backend/model/
# (See "Model Files" section below)

# Run development server
flask run --debug
# API will be at http://localhost:5000
```

### 3. Set up the frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local: VITE_API_URL=http://localhost:5000

# Run development server
npm run dev
# Frontend will be at http://localhost:5173
```

### 4. Open the app

Navigate to `http://localhost:5173` — sign up, then run a risk assessment.

---

## Deploying to GitHub

### Step 1: Install Git LFS (for large model files)

```bash
# Install Git LFS
git lfs install

# In the backend folder, LFS is already configured via .gitattributes
# It tracks *.pth and *.pkl files automatically
```

### Step 2: Create GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Create a **new repository** (e.g., `cervical-cancer-detection`)
3. Do **not** initialise with README (we have one)

### Step 3: Push the code

```bash
# From the project root
git init
git add .
git commit -m "feat: initial CervixAI deployment-ready project"

git remote add origin https://github.com/YOUR_USERNAME/cervical-cancer-detection.git
git branch -M main
git push -u origin main
```

> ⚠️ **Model files are large** (~15MB PyTorch, ~140KB XGBoost).  
> With Git LFS configured, they'll be uploaded to GitHub LFS storage automatically.  
> Free GitHub accounts include 1GB LFS storage.

---

## Deploying Backend to Render

### Step 1: Connect Render to GitHub

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub account and select the repository
3. Set **Root Directory** to `backend`

### Step 2: Configure the service

| Setting | Value |
|---|---|
| **Environment** | Python |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app:app --workers 1 --timeout 120 --bind 0.0.0.0:$PORT` |
| **Plan** | Free (or Starter for persistent disk) |

### Step 3: Set Environment Variables in Render Dashboard

Go to **Environment** tab and add:

| Variable | Value |
|---|---|
| `SECRET_KEY` | Generate a random 32-char string |
| `JWT_SECRET_KEY` | Generate a different random 32-char string |
| `FLASK_ENV` | `production` |
| `FRONTEND_URL` | Your Vercel URL (e.g., `https://cervixai.vercel.app`) |
| `UPLOAD_FOLDER` | `/tmp/uploads` |
| `DB_PATH` | `/tmp/users.db` |
| `MODEL_DIR` | `model` |

### Step 4: Note your Render URL

After deployment, note your URL: `https://cervixai-backend.onrender.com`

> **Free tier note:** Render free services spin down after 15 minutes of inactivity. First request may take ~30 seconds to wake up. Upgrade to Starter ($7/mo) for always-on.

---

## Deploying Frontend to Vercel

### Step 1: Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`

### Step 2: Configure build settings

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### Step 3: Set Environment Variables in Vercel Dashboard

Go to **Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Render backend URL (e.g., `https://cervixai-backend.onrender.com`) |

### Step 4: Update CORS in Render

After getting your Vercel URL, go back to Render and update:
- `FRONTEND_URL` → `https://your-project.vercel.app`

Then **redeploy** the Render service for CORS to take effect.

### Step 5: Deploy

Vercel auto-deploys on every `git push` to `main`. Your app will be live at:
`https://your-project.vercel.app`

---

## Environment Variables

### Backend (`backend/.env`)

```env
SECRET_KEY=your-flask-secret-key        # For Flask sessions
JWT_SECRET_KEY=your-jwt-secret          # For JWT token signing
FLASK_ENV=development                   # or 'production'
FRONTEND_URL=http://localhost:5173      # Allowed CORS origin
UPLOAD_FOLDER=uploads                   # Where to store temp files
DB_PATH=users.db                        # SQLite database path
MODEL_DIR=model                         # Directory with .pkl and .pth files
PORT=5000                               # (Render sets this automatically)
```

### Frontend (`frontend/.env.local`)

```env
VITE_API_URL=http://localhost:5000      # Backend API base URL
```

---

## Model Files & Git LFS

The following model files must be placed in `backend/model/`:

| File | Size | Description |
|---|---|---|
| `best_fastvit_model.pth` | ~14.3MB | FastViT-T8 trained weights |
| `xgboost_model.pkl` | ~136KB | XGBoost classifier |
| `scaler.pkl` | ~2KB | StandardScaler for features |
| `feature_names.pkl` | ~700B | Feature name list |

### Adding models to Git LFS

```bash
# One-time setup (already done via .gitattributes)
cd backend
git lfs track "model/*.pth"
git lfs track "model/*.pkl"

# Copy your model files into backend/model/
# Then commit normally — LFS handles the rest
git add model/
git commit -m "feat: add ML model files via LFS"
git push
```

### Alternative: Download models at startup

For Render free tier (no persistent storage), you can host models on Hugging Face Hub and download them on startup. See `model_downloader.py` (optional, add separately).

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require:
```
Authorization: Bearer <JWT_TOKEN>
```

### Authentication

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | `{username, password, email, ...}` | Register |
| `POST` | `/api/auth/login` | `{username, password}` | Login → returns JWT |
| `GET` | `/api/auth/me` | — | Current user info |

### Prediction

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/predict` | `{age, schiller, citology, ...}` | XGBoost risk + SHAP |
| `POST` | `/api/upload_image` | `FormData: image` | FastViT + Grad-CAM |
| `GET` | `/api/results/shap` | — | Retrieve SHAP plot |
| `GET` | `/api/results/gradcam` | — | Retrieve Grad-CAM |

### Reports & History

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/download_report` | `{probability, user_input, ...}` | PDF download |
| `GET` | `/api/history` | — | Past assessments |
| `GET` | `/api/health` | — | API health check |

### Example: Login

```bash
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "jane_doe", "password": "secret123"}'

# Response
{
  "access_token": "eyJ...",
  "user": { "id": 1, "username": "jane_doe", "email": "jane@example.com" }
}
```

### Example: Predict Risk

```bash
curl -X POST https://your-backend.onrender.com/api/predict \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "age": 35, "schiller": 1, "citology": 0, "dx_cin": 0,
    "genital_herpes": 0, "stds_number": 0,
    "sexual_partners": 2, "first_intercourse": 18,
    "pregnancies": 1, "smoking": 0
  }'
```

---

## Medical Disclaimer

> ⚠️ **This application is for educational and research purposes only.**
>
> CervixAI does **not** provide medical diagnosis and is **not** a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider (gynaecologist, oncologist, or primary care physician) for:
> - Interpretation of screening results
> - Medical diagnosis
> - Treatment decisions
>
> The AI models are trained on research datasets and may not reflect your specific clinical context. In case of any health concerns, please seek immediate professional medical attention.

---

## License

MIT © 2025 — See [LICENSE](LICENSE) for details.

---

## Acknowledgements

- [UCI Cervical Cancer Risk Factors Dataset](https://archive.ics.uci.edu/dataset/383/cervical+cancer+risk+factors)
- [SIPaKMeD Cervical Cell Dataset](https://www.cs.uoi.gr/~marina/sipakmed.html)
- [FastViT (Apple)](https://github.com/apple/ml-fastvit)
- [SHAP](https://github.com/shap/shap) by Scott Lundberg
- [pytorch-grad-cam](https://github.com/jacobgil/pytorch-grad-cam)
