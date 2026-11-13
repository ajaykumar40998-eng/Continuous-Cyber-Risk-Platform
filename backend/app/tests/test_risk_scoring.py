import unittest

from app.main import row_to_asset


def make_asset(severity, likelihood, impact):
    return {
        "asset_name": "Test Asset",
        "finding": "Automated test finding",
        "severity": severity,
        "likelihood": likelihood,
        "impact": impact,
        "exposure_inr": 500000,
        "mitigation_cost_inr": 50000,
        "mitigation_effectiveness": 0.5,
        "status": "Open",
    }


class RiskScoringTests(unittest.TestCase):

    def test_severity_scores(self):
        expected_scores = {
            "Critical": 30,
            "High": 27,
            "Medium": 24,
            "Low": 21,
        }

        for severity, expected in expected_scores.items():
            with self.subTest(severity=severity):
                result = row_to_asset(
                    make_asset(severity, 0.5, 6)
                )
                self.assertEqual(result["risk_score"], expected)

    def test_maximum_risk_score(self):
        result = row_to_asset(
            make_asset("Critical", 1.0, 10)
        )
        self.assertEqual(result["risk_score"], 100)

    def test_zero_likelihood(self):
        result = row_to_asset(
            make_asset("Critical", 0.0, 10)
        )
        self.assertEqual(result["risk_score"], 0)

    def test_expected_loss(self):
        result = row_to_asset(
            make_asset("High", 0.5, 6)
        )
        self.assertEqual(result["expected_loss_inr"], 250000)
        self.assertEqual(
            result["estimated_avoided_loss_inr"], 125000
        )


if __name__ == "__main__":
    unittest.main()