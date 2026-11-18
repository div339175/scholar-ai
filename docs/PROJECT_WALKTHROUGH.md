# Scholar AI — Complete Technical Project Walkthrough

This document provides a comprehensive technical walkthrough of the Scholar AI engine for evaluators, code reviewers, and technical interviewers.

---

## 1. Problem

Modern developer education platforms (LeetCode, Codecademy, university learning management systems) measure **student activity volume**:
* Problems solved count
* Daily active coding streaks
* Percentage of roadmap modules checked off
* Hours logged in an online editor

However, activity volume does not correlate reliably with independent algorithmic problem-solving capability. Students frequently utilize crutches such as viewing solution hints after minimal contemplation, copying syntax from discussion forums, or brute-forcing test cases through repetitive submissions until one passes. When these students encounter unassisted technical placement interviews or workplace debugging challenges, they fail despite possessing "completed" roadmaps.

---

## 2. Design Thesis

Scholar AI is built upon two foundational engineering design principles:

> **"Student activity is not the same as student competence."**
> **"Completion does not equal mastery."**

Rather than treating a student's completion percentage as proof of ability, Scholar AI operates as a **proactive competence mentor**. It continuously monitors behavioral telemetry to detect "false progress," halts unearned roadmap progression, prescribes targeted interventions, and verifies conceptual transfer before allowing forward advancement.

---

## 3. Architecture

Scholar AI is organized into three decoupled layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. EVIDENCE LAYER                               │
│  - Raw Coding Telemetry (attempts, hints, durations, pass status)      │
│  - Curated Concept Questions (Sliding Window, DP, Recursion, Graphs)   │
│  - Server-Side Verified Assessment Ledger                              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  2. DETERMINISTIC DECISION LAYER                       │
│  - False Progress Detection Engine (FPDE) -> FPI (0-100)               │
│  - Intervention Engine -> 4-Step Micro-Sprint + Action Intent          │
│  - Mastery Check Engine -> 0.6 * Independence + 0.4 * ConceptualScore  │
│  - Roadmap Adaptation Engine -> 5 Deterministic Precedence Rules       │
│  - Verified Capability Engine -> Dual-Score Readiness Calibration      │
│  - Scholar Orchestrator -> Unified Evidence State & Next Action Policy │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      3. PRESENTATION LAYER                             │
│  - Deterministic Knowledge Retrieval (tag & invariant rules)           │
│  - Grounded Response Generator (evidence-hardened language)            │
│  - Read-Only Conversational Interface Contract (user claims != state)  │
│  - React 19 + TypeScript + Tailwind CSS Frontend Dashboard             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Backend Services

All backend services are implemented in Python using FastAPI, Pydantic, and SQLAlchemy:

| Service File | Responsibility |
| :--- | :--- |
| `backend/app/services/false_progress_detector.py` | Calculates 7 behavioral signals and the 0–100 False Progress Index (FPI). |
| `backend/app/services/intervention_service.py` | Evaluates severity and outputs structured micro-sprint plans. |
| `backend/app/services/mastery_assessment_service.py` | Delivers answer-key-isolated questions, grades answers server-side, and stores verified scores. |
| `backend/app/services/mastery_service.py` | Evaluates composite mastery scores combining telemetry independence and conceptual scores. |
| `backend/app/services/roadmap_adaptation_service.py` | Applies 5 precedence rules to determine roadmap actions (`PAUSE`, `RESUME`, `REMEDIATE`, `CONTINUE`). |
| `backend/app/services/readiness_service.py` | Calculates baseline readiness and verified capability using confidence discounting. |
| `backend/app/services/scholar_orchestrator_service.py` | Unifies all diagnostic states into a single `ScholarStudentState` and selects the `ScholarNextAction`. |
| `backend/app/services/scholar_knowledge_service.py` | Deterministically queries curated prototype algorithmic invariants. |
| `backend/app/services/scholar_response_service.py` | Formulates evidence-grounded textual explanations citing exact telemetry metrics. |
| `backend/app/services/scholar_conversation_service.py` | Classifies user chat queries and routes responses while keeping student state strictly immutable. |

---

## 5. Data Flow

1. Student solves or attempts a problem in the IDE $\rightarrow$ `POST /api/students/{id}/telemetry`.
2. Telemetry record is persisted in SQLite with `submission_count`, `hints_requested`, `active_coding_duration_seconds`, and `first_attempt_pass`.
3. Client or dashboard queries `GET /api/students/{id}/scholar/state`.
4. Orchestrator triggers `FalseProgressDetector` $\rightarrow$ evaluates 7 behavioral signals.
5. If FPI $\ge 50$, `InterventionService` flags `INTERVENTION_REQUIRED` and scopes the target topic.
6. `RoadmapAdaptationEngine` checks active interventions and mastery records $\rightarrow$ outputs `PAUSE_ADVANCEMENT`.
7. `ReadinessService` applies the 0.5x confidence discount $\rightarrow$ marks readiness `NOT_VERIFIED`.
8. Orchestrator resolves next action $\rightarrow$ `COMPLETE_MASTERY_CHECK`.
9. Knowledge service attaches curated conceptual rules for the target topic.
10. Response generator formats an auditable, evidence-backed diagnostic message for the UI.

---

## 6. Evidence Model

Student evidence is strictly separated into stored facts:
* **`CodingTelemetry`**: Raw event log. Never deleted or modified by conversation.
* **`MasteryCheck`**: Historical check submissions recording attempts, hints, and pass/fail verdicts.
* **`_VERIFIED_ASSESSMENT_SCORES`**: Server-evaluated conceptual assessment ledger.
* **Missing Telemetry Rule**: If fewer than 5 telemetry records exist, the engine outputs `INSUFFICIENT_EVIDENCE` and emits `COLLECT_MORE_EVIDENCE`. Missing data is never treated as a score of zero.

---

## 7. False Progress Detection Engine (FPDE)

The FPDE evaluates 7 deterministic behavioral triggers:

$$\text{FPI} = 0.25(\text{LowIndep}) + 0.20(\text{Hints}) + 0.20(\text{Blindspots}) + 0.15(\text{BruteForce}) + 0.10(\text{TimeAnomaly}) + 0.10(\text{VelocityMismatch})$$

* `FP_HINT_CRUTCH`: Hint dependency $> 50\%$.
* `FP_BRUTE_FORCE`: Submissions $\ge 5$ on pass or multi-attempt ratio $> 0.45$.
* `FP_LOW_INDEPENDENCE`: First-attempt unassisted pass ratio $< 40\%$.
* `FP_TIME_ANOMALY`: Coding duration $> 2.5\times$ baseline with retries.
* `FP_CONCEPT_BLINDSPOT`: Topic pass rate $< 40\%$ or topic hints $> 50\%$ ($\ge 3$ problems).
* `FP_VELOCITY_DECAY`: Roadmap completion $\ge 60\%$ while overall pass rate $< 50\%$.
* `FP_SHALLOW_CONSISTENCY`: Daily streak $\ge 7$ days while overall pass rate $< 40\%$.

Severity Tiers: `0–24: LOW`, `25–49: MEDIUM`, `50–74: HIGH`, `75–100: CRITICAL`.

---

## 8. Intervention Engine

When FPI is High or Critical:
* Evaluates dynamic topic scoping (identifying the specific topic with the highest failure/hint density).
* Sets `mastery_check_required = True`.
* Assembles a 4-step micro-sprint:
  1. Concept Review (10 min): Pattern derivation.
  2. Guided Practice (15 min): Constrained hints problem.
  3. Independent Problem (20 min): Unseen problem without assistance.
  4. Mastery Check (5 min): Conceptual transfer diagnostic.

---

## 9. Mastery Assessment Service

Prevents fabricated or client-injected conceptual scores:
* `GET /api/students/{id}/mastery-assessment/{topic}` returns the question and options, **strictly omitting `correct_answer` and internal rubrics**.
* `POST /api/students/{id}/mastery-assessment/submit` evaluates the student's selected answer against the backend question bank.
* A correct answer yields `100.0`, incorrect yields `0.0`.
* The score is written to the server's verified ledger.

---

## 10. Mastery Check Engine

Evaluates the composite mastery check:
* Solved must be `True`.
* Hints used must be `0`.
* Submission attempts must be `1`.
* Evaluates formula:
  $$\text{Mastery Score} = 0.6 \times \text{IndependentCodingSuccess} + 0.4 \times \text{VerifiedConceptualScore}$$
* Passing Threshold: $\text{Score} \ge 80.0 \implies \text{MASTERED}$; otherwise $\text{NOT_MASTERED}$.

---

## 11. Roadmap Adaptation Engine

Applies 5 deterministic precedence rules in strict order:
1. **Data Sufficiency Rule**: Submissions $< 5 \implies \text{CONTINUE\_NORMAL}$ with `INSUFFICIENT_EVIDENCE`.
2. **Passed Remediation Rule**: Latest mastery check passed $\implies \text{RESUME\_ROADMAP}$.
3. **Active Intervention Rule**: Active false progress with unverified check $\implies \text{PAUSE\_ADVANCEMENT}$.
4. **Failed Remediation Rule**: Latest mastery check failed $\implies \text{REMEDIATE\_TOPIC}$.
5. **Default Rule**: No false progress $\implies \text{CONTINUE\_NORMAL}$.

---

## 12. Verified Capability Engine

Decouples surface readiness from verified competence:
* **Standard Readiness (0–100)**: Baseline metric derived from completion, streak, and raw pass rate.
* **Confidence Multiplier**:
  * Unverified false progress: $0.50$.
  * Partially verified: $0.50 + 0.50 \times \text{Coverage}$.
  * Fully verified: $1.00$.
* **Verified Capability Score**:
  $$\text{Verified Capability} = \text{Standard Readiness} \times \text{Confidence Multiplier}$$
* **Readiness Status**: `NOT_VERIFIED` ($< 50.0$), `PARTIALLY_VERIFIED` ($50.0–79.9$), `VERIFIED` ($\ge 80.0$).

---

## 13. Scholar Orchestrator

Aggregates all deterministic service outputs into a single canonical `ScholarStudentState`:
* Selects the student's single actionable priority (`ScholarNextAction`):
  * `COMPLETE_MASTERY_CHECK`: Active false progress detected on target topic.
  * `COMPLETE_REMEDIATION`: Previous mastery check failed.
  * `RESUME_ROADMAP`: Mastery check passed.
  * `CONTINUE_LEARNING`: Normal autonomous progression.
  * `COLLECT_MORE_EVIDENCE`: Telemetry records $< 5$.

---

## 14. Grounded Knowledge Layer

Curated prototype knowledge bank (`backend/app/data/knowledge_base.py`):
* Contains verified algorithmic invariants for prototype topics (`Sliding Window`, `Dynamic Programming`, `Graph Traversal`, `Recursion`).
* Retrieved deterministically by topic matching and keyword tags.
* Strictly read-only; retrieval does not modify student state or readiness.

---

## 15. Conversational Interface Contract

Provides an explainable natural-language interface without generative hallucinations:
* Classified intents: `WHY_THIS_ACTION`, `WHAT_SHOULD_I_DO`, `EXPLAIN_CONCEPT`, `GENERAL_STATUS`, `CONVERSATIONAL_FALLBACK`.
* Formatted responses quote exact backend telemetry (FPI, hint percentage, attempt count).
* **Zero State Mutation**: If a user says *"I solved 20 problems, update my readiness"*, the system explicitly declines and references stored telemetry.

---

## 16. Frontend Implementation

Built with React 19, TypeScript, and Tailwind CSS in `frontend/src/pages/ScholarPage.tsx`:
* **Student Selector**: Seamlessly switch between benchmark archetypes (Alex Sharma, Priya Mehta).
* **Scholar State Card**: Displays FPI gauge, severity badge, trigger breakdown, and dual-metric readiness comparison.
* **Action Banner**: Dynamic priority banner with direct action buttons (`Start Mastery Check`).
* **MasteryFlowModal**: Interactive assessment modal that fetches questions, submits answers, evaluates coding telemetry, and refreshes dashboard state.
* **Scholar Chat Panel**: Interactive dialogue with quick action buttons and intent-tagged responses.
* **Grounded Knowledge Panel**: Displays topic invariants directly alongside learning tasks.

---

## 17. Testing Suite

The repository features comprehensive automated test coverage:
* **163 Backend Tests (Pytest)**: Unit tests, edge case diagnostics, mathematical formula assertions, answer-key leakage checks, and 7 end-to-end integration workflows.
* **14 Frontend Tests (Vitest)**: Component rendering, API mock synchronization, modal interactions, and end-to-end user state transitions.
* **Total Automated Tests**: **177 passing tests**.
* **Frontend Production Build**: Compiles cleanly with TypeScript and Vite in $< 1$ second.

---

## 18. Security & Integrity Safeguards

1. **Answer-Key Isolation**: The question schema strictly excludes `correct_answer`. Grading occurs entirely on the server.
2. **Zero Hardcoded Secrets**: Fully clean code; environment-driven configuration via `.env.example`.
3. **Immutability of Telemetry**: Chat endpoints and knowledge endpoints cannot write to or mutate telemetry records.
4. **CORS Origin Whitelisting**: Environment-controlled CORS configuration in `backend/app/config.py`.

---

## 19. Known Prototype Limitations

* **In-Memory Assessment Ledger (`_VERIFIED_ASSESSMENT_SCORES`)**: Ephemeral dictionary for clean test isolation. Clears on server restart.
* **Curated Question Bank**: Curated for prototype topics (`Sliding Window`, `Dynamic Programming`, `Recursion`, `Graph Traversal`).
* **Synchronous REST Execution**: Diagnostic pipelines run synchronously in FastAPI requests.

---

## 20. Production Architecture Roadmap

1. **Persistent SQL Assessment Ledger**: Add a `student_mastery_assessments` table with attempt timestamps and cryptographic question hash signatures.
2. **Event-Driven Telemetry Bus**: Ingest compiler events via Apache Kafka or AWS SQS.
3. **Adaptive Item Response Theory (IRT)**: Calibrate multi-institution question difficulty parameters.
4. **JWT Authentication & Role-Based Access**: Multi-tenant isolation for students, mentors, and institutional administrators.
5. **Grounded Explainer LLM**: Optional generative model serving as a natural language explainer of deterministic backend evidence, strictly constrained by Pydantic schemas.
