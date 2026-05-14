# CervixAI — Deployment Checklist

Use this checklist every time you deploy or update the project.

---

## Pre-Deployment

### Repository Setup
- [ ] Git LFS installed locally (`git lfs install`)
- [ ] `backend/.gitattributes` committed (tracks `*.pth`, `*.pkl`)
- [ ] All four model files present in `backend/model/`
  - [ ] `xgboost_model.pkl`
  - [ ] `scaler.pkl`
  - [ ] `feature_names.pkl`
  - [ ] `best_fastvit_model.pth`
- [ ] `backend/.env` values are NOT committed (`.gitignore` covers this)
- [ ] `frontend/.env.local` is NOT committed
- [ ] GitHub repository created and `main` branch pushed

---

## Backend — Render

- [ ] New Web Service created on Render
- [ ] **Root Directory** set to `backend`
- [ ] **Environment** set to `Python`
- [ ] **Build Command:** `pip install -r requirements.txt`
- [ ] **Start Command:** `gunicorn app:app --workers 1 --timeout 120 --bind 0.0.0.0:$PORT`

### Environment Variables set on Render:
- [ ] `SECRET_KEY` — random 32-char string
- [ ] `JWT_SECRET_KEY` — different random 32-char string
- [ ] `FLASK_ENV` = `production`
- [ ] `FRONTEND_URL` = your Vercel URL (update after frontend deploy)
- [ ] `UPLOAD_FOLDER` = `/tmp/uploads`
- [ ] `DB_PATH` = `/tmp/users.db`
- [ ] `MODEL_DIR` = `model`

### Verify backend is working:
- [ ] Visit `https://your-backend.onrender.com/api/health`
- [ ] Response shows `"status": "ok"`
- [ ] `xgboost_loaded` and `fastvit_loaded` are both `true`

---

## Frontend — Vercel

- [ ] New Project imported from GitHub on Vercel
- [ ] **Root Directory** set to `frontend`
- [ ] **Framework Preset** = `Vite`
- [ ] **Build Command** = `npm run build`
- [ ] **Output Directory** = `dist`

### Environment Variables set on Vercel:
- [ ] `VITE_API_URL` = your Render backend URL (e.g. `https://cervixai-backend.onrender.com`)

### After deploy:
- [ ] Visit your Vercel URL — login page loads
- [ ] Sign up for a new account
- [ ] Run a risk assessment — results display with SHAP chart
- [ ] Test high-risk scenario → image upload section appears
- [ ] PDF report downloads correctly

---

## Post-Deployment

- [ ] **CORS update:** Go back to Render → update `FRONTEND_URL` to your actual Vercel domain
- [ ] Trigger a Render redeploy after CORS update (via Render dashboard → Manual Deploy)
- [ ] GitHub CI badge is green (check Actions tab)
- [ ] Test on mobile device (responsive layout)

---

## Common Issues

| Problem | Fix |
|---|---|
| Backend 500 on `/api/predict` | Model files missing — check `backend/model/` has all 4 files |
| CORS error in browser | Update `FRONTEND_URL` on Render to exact Vercel URL (no trailing slash) |
| JWT 401 after login | Ensure `JWT_SECRET_KEY` is set on Render |
| Render first request slow (~30s) | Expected on free tier — upgrade to Starter for always-on |
| `vite build` fails on Vercel | Check `VITE_API_URL` env var is set in Vercel dashboard |
| Image upload returns 503 | FastViT model not loaded — verify `best_fastvit_model.pth` is in `backend/model/` |
