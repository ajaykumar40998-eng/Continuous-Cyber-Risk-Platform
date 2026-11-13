
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_optimizer_returns_expected_fields():
    response = client.post(
        "/api/optimize",
        json={"budget_inr": 150000},
    )

    assert response.status_code == 200

    data = response.json()

    expected_fields = {
        "budget_inr",
        "invested_inr",
        "remaining_budget_inr",
        "estimated_avoided_loss_inr",
        "selected_count",
        "recommendations",
        "method",
        "sample_data",
    }

    assert expected_fields.issubset(data.keys())


def test_optimizer_does_not_exceed_budget():
    budget = 150000

    response = client.post(
        "/api/optimize",
        json={"budget_inr": budget},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["invested_inr"] <= budget
    assert data["remaining_budget_inr"] >= 0
    assert data["invested_inr"] + data["remaining_budget_inr"] == budget


def test_optimizer_recommendations_match_selected_count():
    response = client.post(
        "/api/optimize",
        json={"budget_inr": 150000},
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data["recommendations"]) == data["selected_count"]
    assert all(
        item["cost_inr"] > 0
        for item in data["recommendations"]
    )
