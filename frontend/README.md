# CervixAI — Frontend

React + Vite SPA for the CervixAI cervical cancer detection system. Deployed on **Vercel**.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:5000 for local dev

# 3. Start dev server
npm run dev
```

App will be at `http://localhost:5173`.

## Pages

| Route | Description |
|---|---|
| `/login` | Sign-in form |
| `/signup` | Registration form |
| `/detection` | Risk assessment form (protected) |
| `/results` | Results + image upload (protected) |
| `/history` | Past assessments (protected) |

## Build for Production

```bash
npm run build
# Output in dist/
```

## Vercel Deployment

See the [root README](../README.md#deploying-frontend-to-vercel) for full steps.

**Environment variable required on Vercel:**

```
VITE_API_URL = https://your-backend.onrender.com
```

## Project Structure

```
src/
├── api/
│   └── client.js         # Axios instance with JWT interceptors
├── components/
│   └── Navbar.jsx
├── context/
│   └── AuthContext.jsx   # Global auth state (React context)
└── pages/
    ├── Login.jsx
    ├── Signup.jsx
    ├── Detection.jsx     # Risk assessment form
    ├── Results.jsx       # SHAP + image upload + Grad-CAM
    └── History.jsx
```
