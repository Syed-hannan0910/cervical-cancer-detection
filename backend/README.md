# CervixAI — Backend

Flask REST API powering the CervixAI cervical cancer detection system. Deployed on **Render**.

## Quick Start

```bash
# 1. Create and activate virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Place model files in model/
#    (see root README — Model Files & Git LFS section)

# 5. Run development server
flask run --debug
```

API will be available at `http://localhost:5000`.

## Key Endpoints

| Route | Auth | Description |
|---|---|---|
| `POST /api/auth/signup` | ✗ | Register new user |
| `POST /api/auth/login` | ✗ | Login → JWT token |
| `GET  /api/auth/me` | ✓ | Current user |
| `POST /api/predict` | ✓ | XGBoost risk + SHAP |
| `POST /api/upload_image` | ✓ | FastViT + Grad-CAM |
| `POST /api/download_report` | ✓ | PDF report |
| `GET  /api/history` | ✓ | Past assessments |
| `GET  /api/health` | ✗ | Health check |

## Running Tests

```bash
pip install pytest
pytest tests/ -v
```

## Render Deployment

See the [root README](../README.md#deploying-backend-to-render) for full deployment steps.

**Environment variables required on Render:**

```
SECRET_KEY          = <random 32-char string>
JWT_SECRET_KEY      = <different random 32-char string>
FLASK_ENV           = production
FRONTEND_URL        = https://your-app.vercel.app
UPLOAD_FOLDER       = /tmp/uploads
DB_PATH             = /tmp/users.db
MODEL_DIR           = model
```
