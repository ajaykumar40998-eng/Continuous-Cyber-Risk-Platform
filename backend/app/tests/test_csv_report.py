
def test_csv_report_download():
    response = client.get("/api/report.csv")

    assert response.status_code == 200
    assert "text/csv" in response.headers.get(
        "content-type", ""
    ).lower()
    assert len(response.text) > 0
