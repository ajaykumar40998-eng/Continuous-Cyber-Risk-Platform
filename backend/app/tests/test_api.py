
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200


def test_summary_endpoint():
    response = client.get("/api/summary")
    assert response.status_code == 200


def test_assets_endpoint():
    response = client.get("/api/assets")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_invalid_asset_severity_is_rejected():
    response = client.post(
        "/api/assets",
        json={
            "asset_name": "Automated Test Asset",
            "finding": "Invalid severity test",
            "severity": "Urgent",
            "likelihood": 0.5,
            "impact": 6,
            "exposure_inr": 500000,
            "mitigation_cost_inr": 50000,
            "mitigation_effectiveness": 0.5,
            "status": "Open",
        },
    )
    assert response.status_code == 422

def test_csv_report_download():
    response = client.get("/api/report.csv")

    assert response.status_code == 200
    assert "text/csv" in response.headers.get(
        "content-type", ""
    ).lower()
    assert len(response.text) > 0
