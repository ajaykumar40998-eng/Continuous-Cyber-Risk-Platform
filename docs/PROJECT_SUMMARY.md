# Project Summary

**Title:** AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform  
**Identifier:** SIH26105  
**Prototype scope:** Full-stack, local demonstration build.

## Problem
Security teams may have many findings but limited mitigation budgets. A risk register alone does not directly compare estimated financial exposure and remediation cost.

## Proposed prototype
A browser dashboard for synthetic asset findings, transparent likelihood-impact scoring, expected-loss estimates, and a budget-aware prioritization heuristic.

## Technical stack
- Frontend: React, TypeScript, Vite, Recharts
- API: Python FastAPI
- Persistence: SQLite
- Data transfer: REST/JSON
- Export: CSV

## Risk calculation
- Risk score = round(likelihood × impact × 10)
- Expected loss = likelihood × exposure estimate
- Modelled avoided loss = expected loss × mitigation effectiveness

## Scope boundaries
This build is a functional prototype, not a production security product. It does not currently ingest live logs, scan systems, connect to cloud accounts, or train/run an ML model. The title refers to the intended project direction; current functionality is rule-based.
