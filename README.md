# SIH26105 — Cyber Risk Quantification & Investment Optimization Platform

A demo 50-60% prototype for a project presentation.

## Included
- React + TypeScript + Vite frontend
- FastAPI backend
- SQLite persistence (zero separate database server required)
- Asset/vulnerability register
- Transparent risk scoring and expected-loss estimates
- Budget-based mitigation prioritization
- What-if budget simulation
- CSV export
- Sample seed data and API documentation

> This is a prototype using synthetic sample data and illustrative assumptions. It is not a validated cyber-risk forecasting product. Do not use its outputs as real security or financial advice.

## Requirements
- Node.js 20+ recommended
- Python 3.10+

## Run locally

### 1. Start the backend
Open a terminal in the project folder:

```bash
cd backend
python -m venv .venv
```

Activate the environment:

**Windows PowerShell**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows CMD**
```cmd
.venv\Scripts\activate.bat
```

**macOS/Linux**
```bash
source .venv/bin/activate
```

Then install and run:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend API docs: http://127.0.0.1:8000/docs

### 2. Start the frontend
Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173.

The frontend expects the API at `http://127.0.0.1:8000`. Override it by creating `frontend/.env` with:
```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Demo flow (3–4 minutes)
1. Open the dashboard and point out the sample-data notice.
2. Review overall risk score, estimated expected loss, and critical/high findings.
3. Open the Risk Register and add a sample finding or change a severity/likelihood.
4. Open Investment Optimizer, change the budget slider, and run optimization.
5. Explain the recommended mitigations and modelled loss reduction.
6. Export the report CSV.

## Model assumptions
- Likelihood is a probability from 0.0 to 1.0.
- Impact score is a normalized 1–10 scale.
- Risk score = likelihood × impact × 10, rounded to an integer (0–100).
- Expected loss = likelihood × estimated financial exposure.
- Estimated avoided loss = expected loss × assumed mitigation effectiveness.
- The optimizer uses a greedy heuristic sorted by estimated avoided loss per rupee, selecting interventions that fit the budget. This is not guaranteed to be globally optimal.
- All seed records are synthetic examples; replace them with authorized and validated data before real-world use.

## Architecture
```text
React + TypeScript (Vite)
          |
          | HTTP / JSON
          v
FastAPI REST API
          |
          v
SQLite database (assets table)
```

## Important implementation notes
- SQLite database file is created automatically at `backend/cyber_risk.db`.
- The backend seeds sample data only when the database has no assets.
- This starter is intended for local demo use. Authentication, role-based access, audit logging, production deployment, external threat feeds, and validated ML models are not implemented.
