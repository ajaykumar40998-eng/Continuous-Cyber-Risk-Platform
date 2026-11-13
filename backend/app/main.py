from __future__ import annotations

import csv
import io
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .ml_model import predict_risk
APP_DIR = Path(__file__).resolve().parent
DB_PATH = APP_DIR.parent / "cyber_risk.db"

app = FastAPI(
    title="SIH26105 Cyber Risk API",
    description="Demo API for cyber risk quantification and investment prioritization.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MLRiskPredictionIn(BaseModel):
    likelihood: int = Field(ge=1, le=5)
    impact: int = Field(ge=1, le=5)
    severity_level: int = Field(ge=1, le=5)
    asset_criticality: int = Field(ge=1, le=5)
    exposure_level: int = Field(ge=1, le=5)

class AssetIn(BaseModel):
    asset_name: str = Field(min_length=2, max_length=100)
    finding: str = Field(min_length=3, max_length=200)
    severity: Literal["Critical", "High", "Medium", "Low"]
    likelihood: float = Field(ge=0, le=1)
    impact: int = Field(ge=1, le=10)
    exposure_inr: float = Field(ge=0, le=1_000_000_000)
    mitigation_cost_inr: float = Field(ge=0, le=1_000_000_000)
    mitigation_effectiveness: float = Field(ge=0, le=1)
    status: Literal["Open", "In Progress", "Mitigated"] = "Open"

class Asset(AssetIn):
    id: int

class BudgetIn(BaseModel):
    budget_inr: float = Field(ge=0, le=1_000_000_000)

SEED_DATA = [
    ("Payment API", "Critical vulnerability", "Critical", 0.80, 9, 500000, 80000, 0.70, "Open"),
    ("Customer Database", "Weak access controls", "Critical", 0.60, 10, 800000, 120000, 0.60, "Open"),
    ("Employee Portal", "Outdated software", "High", 0.70, 5, 200000, 40000, 0.60, "In Progress"),
    ("Cloud Storage", "Potential misconfiguration", "High", 0.50, 8, 400000, 60000, 0.65, "Open"),
    ("Internal Wiki", "Missing security headers", "Medium", 0.30, 3, 60000, 15000, 0.50, "Open"),
]

@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_db():
    with db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_name TEXT NOT NULL,
                finding TEXT NOT NULL,
                severity TEXT NOT NULL,
                likelihood REAL NOT NULL,
                impact INTEGER NOT NULL,
                exposure_inr REAL NOT NULL,
                mitigation_cost_inr REAL NOT NULL,
                mitigation_effectiveness REAL NOT NULL,
                status TEXT NOT NULL
            )
        """)
        count = conn.execute("SELECT COUNT(*) AS n FROM assets").fetchone()["n"]
        if count == 0:
            conn.executemany("""
                INSERT INTO assets
                (asset_name, finding, severity, likelihood, impact, exposure_inr,
                 mitigation_cost_inr, mitigation_effectiveness, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, SEED_DATA)

@app.on_event("startup")
def startup():
    init_db()

SEVERITY_MULTIPLIERS = {
    "Critical": 1.00,
    "High": 0.90,
    "Medium": 0.80,
    "Low": 0.70,
}

def row_to_asset(row: sqlite3.Row) -> dict:
    item = dict(row)
    multiplier = SEVERITY_MULTIPLIERS[item["severity"]]
    item["risk_score"] = round(
        item["likelihood"] * item["impact"] * 10 * multiplier
    )
    item["expected_loss_inr"] = round(item["likelihood"] * item["exposure_inr"], 2)
    item["estimated_avoided_loss_inr"] = round(
        item["expected_loss_inr"] * item["mitigation_effectiveness"], 2
    )
    return item

def get_assets() -> list[dict]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM assets ORDER BY id").fetchall()
    return [row_to_asset(row) for row in rows]

@app.get("/")
def root():
    return {"service": "SIH26105 Cyber Risk API", "docs": "/docs", "status": "running"}

@app.get("/api/health")
def health():
    return {"status": "ok", "database": "sqlite", "demo_data": True}

@app.post("/api/ml/predict-risk")
def predict_ml_risk(data: MLRiskPredictionIn):
    try:
        result = predict_risk(
            likelihood=data.likelihood,
            impact=data.impact,
            severity_level=data.severity_level,
            asset_criticality=data.asset_criticality,
            exposure_level=data.exposure_level,
        )
        return result
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@app.get("/api/assets", response_model=list[dict])
def list_assets():
    return get_assets()

@app.post("/api/assets", response_model=dict, status_code=201)
def create_asset(payload: AssetIn):
    with db() as conn:
        cur = conn.execute("""
            INSERT INTO assets
            (asset_name, finding, severity, likelihood, impact, exposure_inr,
             mitigation_cost_inr, mitigation_effectiveness, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            payload.asset_name, payload.finding, payload.severity, payload.likelihood,
            payload.impact, payload.exposure_inr, payload.mitigation_cost_inr,
            payload.mitigation_effectiveness, payload.status
        ))
        new_id = cur.lastrowid
        row = conn.execute("SELECT * FROM assets WHERE id = ?", (new_id,)).fetchone()
    return row_to_asset(row)

@app.patch("/api/assets/{asset_id}", response_model=dict)
def update_asset(asset_id: int, payload: AssetIn):
    with db() as conn:
        exists = conn.execute("SELECT id FROM assets WHERE id = ?", (asset_id,)).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Asset/finding not found")
        conn.execute("""
            UPDATE assets SET asset_name=?, finding=?, severity=?, likelihood=?, impact=?,
            exposure_inr=?, mitigation_cost_inr=?, mitigation_effectiveness=?, status=?
            WHERE id=?
        """, (
            payload.asset_name, payload.finding, payload.severity, payload.likelihood,
            payload.impact, payload.exposure_inr, payload.mitigation_cost_inr,
            payload.mitigation_effectiveness, payload.status, asset_id
        ))
        row = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
    return row_to_asset(row)

@app.delete("/api/assets/{asset_id}")
def delete_asset(asset_id: int):
    with db() as conn:
        cur = conn.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Asset/finding not found")
    return {"deleted": True, "id": asset_id}

@app.get("/api/summary")
def summary():
    assets = get_assets()
    total = len(assets)
    total_expected_loss = round(sum(a["expected_loss_inr"] for a in assets), 2)
    average_score = round(sum(a["risk_score"] for a in assets) / total) if total else 0
    return {
        "asset_count": total,
        "critical_count": sum(a["severity"] == "Critical" and a["status"] != "Mitigated" for a in assets),
        "open_count": sum(a["status"] == "Open" for a in assets),
        "average_risk_score": average_score,
        "estimated_expected_loss_inr": total_expected_loss,
        "severity_counts": {
            sev: sum(a["severity"] == sev for a in assets)
            for sev in ["Critical", "High", "Medium", "Low"]
        },
        "sample_data": True,
    }

def optimize(assets: list[dict], budget: float) -> dict:
    candidates = []
    for a in assets:
        if a["status"] == "Mitigated" or a["mitigation_cost_inr"] <= 0:
            continue
        benefit = a["expected_loss_inr"] * a["mitigation_effectiveness"]
        cost = a["mitigation_cost_inr"]
        candidates.append({**a, "benefit_inr": round(benefit, 2), "benefit_per_rupee": benefit / cost})
    candidates.sort(key=lambda a: a["benefit_per_rupee"], reverse=True)
    remaining = float(budget)
    chosen = []
    for item in candidates:
        cost = item["mitigation_cost_inr"]
        if cost <= remaining:
            chosen.append(item)
            remaining -= cost
    invested = sum(a["mitigation_cost_inr"] for a in chosen)
    benefit = sum(a["benefit_inr"] for a in chosen)
    return {
        "budget_inr": round(budget, 2),
        "invested_inr": round(invested, 2),
        "remaining_budget_inr": round(budget - invested, 2),
        "estimated_avoided_loss_inr": round(benefit, 2),
        "selected_count": len(chosen),
        "recommendations": [
            {
                "id": a["id"],
                "asset_name": a["asset_name"],
                "finding": a["finding"],
                "severity": a["severity"],
                "cost_inr": a["mitigation_cost_inr"],
                "expected_loss_inr": a["expected_loss_inr"],
                "estimated_avoided_loss_inr": a["benefit_inr"],
                "benefit_per_rupee": round(a["benefit_per_rupee"], 4),
                "reason": "High modelled avoided-loss value per rupee within the budget."
            } for a in chosen
        ],
        "method": "Greedy heuristic by estimated avoided loss per rupee; not guaranteed globally optimal.",
        "sample_data": True,
    }

@app.post("/api/optimize")
def run_optimizer(payload: BudgetIn):
    return optimize(get_assets(), payload.budget_inr)

@app.get("/api/report.csv")
def report_csv():
    assets = get_assets()
    output = io.StringIO()
    fields = [
        "id", "asset_name", "finding", "severity", "likelihood", "impact",
        "risk_score", "exposure_inr", "expected_loss_inr", "mitigation_cost_inr",
        "mitigation_effectiveness", "status"
    ]
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for asset in assets:
        writer.writerow({field: asset.get(field, "") for field in fields})
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="cyber-risk-report.csv"'}
    )
