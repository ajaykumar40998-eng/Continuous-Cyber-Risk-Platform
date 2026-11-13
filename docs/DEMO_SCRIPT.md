# SIH26105 Demo Script (3–4 minutes)

## Opening (20 seconds)
"Our project is a cyber-risk quantification and security-investment prioritization prototype. It converts sample risk assumptions into comparable scores and uses a constrained-budget heuristic to help demonstrate how mitigation decisions can be prioritized."

## Overview (45 seconds)
- Point to the sample-data banner.
- Explain the risk score: likelihood × impact × 10.
- Explain expected loss: likelihood × estimated exposure.
- Show the severity distribution and risk-by-asset chart.

## Risk register (45 seconds)
- Open Risk register.
- Add a clearly synthetic test record.
- Explain severity, likelihood, impact, estimated exposure, mitigation cost, and effectiveness.
- Export the CSV.

## Investment optimizer (60 seconds)
- Open Investment optimizer.
- Set budget to ₹50,000 and note selected intervention(s).
- Increase to ₹1,50,000 and compare recommendations.
- Explain that estimated avoided loss is a model output based on assumptions, not a guaranteed saving.

## Closing (30 seconds)
"The current prototype uses rule-based calculations and synthetic data. Next steps include validated data ingestion, a tested optimization solver, authentication and audit logs, and evaluation of predictive models against historical incidents."

## Questions to prepare for
**Is this real-time?** No. This demo uses synthetic records and local SQLite. Live integrations are future work.

**Is the optimizer mathematically optimal?** No. The current implementation uses a greedy heuristic ordered by estimated avoided loss per rupee.

**Is this an AI/ML prediction model?** Not yet. The present risk engine is transparent and rule-based. An ML component would require relevant labelled data, validation, and measurable evaluation.

**Can the results be used for actual investment decisions?** No. The assumptions and output must be validated with authorized organization data and security experts first.
