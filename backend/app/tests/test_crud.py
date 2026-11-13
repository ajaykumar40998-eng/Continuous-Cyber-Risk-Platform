
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_read_update_delete_asset():
    payload = {
        "asset_name": "Automated CRUD Test",
        "finding": "Test-only security finding",
        "severity": "High",
        "likelihood": 0.5,
        "impact": 6,
        "exposure_inr": 500000,
        "mitigation_cost_inr": 50000,
        "mitigation_effectiveness": 0.5,
        "status": "Open",
    }

    # CREATE
    create_response = client.post("/api/assets", json=payload)
    assert create_response.status_code == 201

    created = create_response.json()
    asset_id = created["id"]
    assert created["asset_name"] == payload["asset_name"]

    # READ
    read_response = client.get("/api/assets")
    assert read_response.status_code == 200
    assert any(item["id"] == asset_id for item in read_response.json())

    # UPDATE
    updated_payload = {**payload, "status": "Mitigated"}
    update_response = client.patch(
        f"/api/assets/{asset_id}",
        json=updated_payload,
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "Mitigated"

    # DELETE
    delete_response = client.delete(f"/api/assets/{asset_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["deleted"] is True

    # VERIFY DELETED
    final_response = client.get("/api/assets")
    assert final_response.status_code == 200
    assert all(
        item["id"] != asset_id for item in final_response.json()
    )


def test_update_missing_asset_returns_404():
    response = client.patch(
        "/api/assets/999999999",
        json={
            "asset_name": "Missing Asset",
            "finding": "Not found test",
            "severity": "High",
            "likelihood": 0.5,
            "impact": 6,
            "exposure_inr": 500000,
            "mitigation_cost_inr": 50000,
            "mitigation_effectiveness": 0.5,
            "status": "Open",
        },
    )

    assert response.status_code == 404


def test_delete_missing_asset_returns_404():
    response = client.delete("/api/assets/999999999")
    assert response.status_code == 404
