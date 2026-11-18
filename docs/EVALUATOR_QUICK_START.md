# Scholar AI — Evaluator Quick Start Guide

Welcome to the StepCode Scholar AI evaluation guide. This document provides an immediate orientation for evaluators, hiring managers, and code reviewers who need to inspect and run the project quickly.

---

## What is this?

**Scholar AI** is a deterministic, evidence-grounded student state and intervention engine built as a proactive competence mentor for StepCode.

Unlike generic chatbots that guess whether a student understands a concept, Scholar AI evaluates raw behavioral telemetry to detect **false progress**, halts unearned roadmap progression, prescribes structured micro-sprint interventions, and verifies conceptual transfer before permitting forward advancement.

---

## What problem does it solve?

Online computer science platforms measure **activity volume** (problems completed, daily streaks, time spent, roadmap percentage). But students routinely pass problems by relying on crutches (hints, trial-and-error submissions, copying solution templates).

When these students enter technical interviews, they fail because their activity volume masked an underlying absence of independent problem-solving ability.

Scholar AI solves this by enforcing the core thesis:
> **"Student activity is not the same as student competence."**
> **"Completion does not equal mastery."**

---

## What should I look at first? (Recommended Inspection Order)

To understand the engineering design efficiently, inspect files in this sequence:

1. [**README.md**](file:///Users/divakarmaurya/stepcode/README.md): High-level system overview, design rules, and full pipeline diagram.
2. [**System Architecture Diagram**](file:///Users/divakarmaurya/stepcode/docs/ARCHITECTURE.md): Clear visual breakdown of the Evidence Layer, Decision Layer, and Presentation Layer.
3. [**backend/app/services/false_progress_detector.py**](file:///Users/divakarmaurya/stepcode/backend/app/services/false_progress_detector.py): The 7 mathematical trigger algorithms and the weighted 0–100 False Progress Index (FPI).
4. [**backend/app/services/mastery_assessment_service.py**](file:///Users/divakarmaurya/stepcode/backend/app/services/mastery_assessment_service.py): Server-side question retrieval and answer-key isolation logic.
5. [**backend/app/services/mastery_service.py**](file:///Users/divakarmaurya/stepcode/backend/app/services/mastery_service.py): The composite mastery scoring formula ($0.6 \times \text{Independence} + 0.4 \times \text{ConceptualScore}$).
6. [**backend/app/services/roadmap_adaptation_service.py**](file:///Users/divakarmaurya/stepcode/backend/app/services/roadmap_adaptation_service.py): The 5 deterministic precedence rules governing roadmap gating (`PAUSE`, `RESUME`, `REMEDIATE`, `CONTINUE`).
7. [**backend/app/services/readiness_service.py**](file:///Users/divakarmaurya/stepcode/backend/app/services/readiness_service.py): The dual-metric formula decoupling standard activity readiness from verified capability.
8. [**backend/app/services/scholar_orchestrator_service.py**](file:///Users/divakarmaurya/stepcode/backend/app/services/scholar_orchestrator_service.py): Central orchestration layer aggregating states and issuing single-action directives.
9. [**frontend/src/pages/ScholarPage.tsx**](file:///Users/divakarmaurya/stepcode/frontend/src/pages/ScholarPage.tsx): React 19 UI dashboard integrating state cards, action banners, chat, and the interactive `MasteryFlowModal`.
10. [**backend/tests/test_scholar_end_to_end.py**](file:///Users/divakarmaurya/stepcode/backend/tests/test_scholar_end_to_end.py): The complete end-to-end regression test suite proving the full pipeline across Scenarios A through G.

---

## How to Run the Project (Verified Commands)

### 1. Run Backend Server

```bash
# From repository root:
source .venv/bin/activate
pip install -r backend/requirements.txt   # (if not already installed)

# Seed the SQLite demo database (Alex & Priya)
PYTHONPATH=backend python backend/seed_data.py

# Start FastAPI server on port 8000
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **Swagger API Documentation**: `http://localhost:8000/docs`
* **API Health Check**: `curl http://localhost:8000/api/health`

### 2. Run Frontend Application

```bash
# In a separate terminal tab:
cd frontend
npm install   # (if not already installed)

# Start Vite development server on port 5173
npm run dev
```
* **Frontend Application**: `http://localhost:5173`
* **Direct Scholar AI View**: `http://localhost:5173/scholar`

---

## How to Run the Automated Test Suites

### Run Backend Tests (163 tests)

```bash
# In repository root:
source .venv/bin/activate
pytest -v backend/tests
```
* **Expected result**: `163 passed in ~1.5 seconds`.

### Run Frontend Tests (14 tests)

```bash
# In repository root:
cd frontend
npm test
```
* **Expected result**: `14 passed in ~700ms`.

### Run Production Build

```bash
# In repository root:
cd frontend
npm run build
```
* **Expected result**: Clean production build with TypeScript compilation and Vite bundling (`dist/`) in $< 1$ second.

---

## Fast Verification Scenarios to Test in UI

1. **Observe Alex Sharma (False Progress)**:
   * Navigate to `http://localhost:5173/scholar?student=student_alex`.
   * Observe: 72% roadmap completion, but FPI is **87.0 (CRITICAL)**.
   * Action Banner: **`COMPLETE_MASTERY_CHECK`** on **Sliding Window**.
   * Roadmap Status: **`PAUSE_ADVANCEMENT`**.
2. **Execute Interactive Mastery Check**:
   * Click **"Start Mastery Check"** on the banner.
   * Select the correct option: *"Whenever the frequency map contains more than K distinct characters..."*.
   * Click **"Submit Mastery Check"**.
   * Observe: Action Banner turns green with **`RESUME_ROADMAP`**; Verified Capability updates to **76.9**.
3. **Observe Priya Mehta (Autonomous Baseline)**:
   * Switch the dropdown to **Priya Mehta (`student_priya`)**.
   * Observe: FPI is **10.0 (LOW)**, Roadmap Action is **`CONTINUE_NORMAL`**, Scholar Action is **`CONTINUE_LEARNING`**.
