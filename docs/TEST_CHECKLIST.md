# Smoke-test checklist

- [ ] Backend root responds at `http://127.0.0.1:8000/`.
- [ ] `/api/health` returns `{"status":"ok", ...}`.
- [ ] `/api/assets` returns seeded synthetic records.
- [ ] `/api/summary` returns score, severity counts, and expected loss.
- [ ] Frontend loads and shows four KPI cards.
- [ ] Risk-by-asset bar chart renders.
- [ ] Risk register displays records.
- [ ] Add finding creates a database record and refreshes the table.
- [ ] Delete finding removes the record after confirmation.
- [ ] Budget slider recalculates investment recommendations.
- [ ] Selected mitigation costs never exceed the budget.
- [ ] CSV report downloads.
- [ ] Test at desktop and narrow/mobile viewport widths.
- [ ] Stop and restart backend; verify SQLite records persist.

## Known limitations
- Synthetic data only.
- No authentication or authorization.
- No external threat-intelligence integrations.
- No trained ML model.
- Greedy optimizer is not guaranteed globally optimal.
- Local demo CORS origins are intentionally limited to Vite localhost.
