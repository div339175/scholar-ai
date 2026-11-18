# Scholar AI — Quick Revision Interview Cheat Sheet

> **Pre-Interview Quick Reference Card**  
> *Review this 10 minutes before technical interviews to refresh core concepts, mathematical formulas, and defense points.*

---

## 1. Project One-Liner
**Scholar AI is a deterministic, evidence-grounded competence mentor that monitors coding telemetry to detect false progress, halts unearned roadmap advancement, prescribes targeted micro-sprints, and verifies conceptual transfer through server-evaluated assessments.**

---

## 2. Core Problem & Design Thesis
* **Problem**: Educational platforms track *activity volume* (problems solved, streaks, completion %) rather than *independent competence*. Students pass problems using hints and trial-and-error, creating an illusion of readiness that fails in technical interviews.
* **Design Thesis**:  
  *"Student activity is not the same as student competence."*  
  *"Completion does not equal mastery."*

---

## 3. Key Innovation
**A 100% deterministic, auditable evidence pipeline that decouples activity from capability without relying on ungrounded LLMs.**

---

## 4. Architecture at a Glance
```
Evidence Layer (Telemetry, Isolated Questions, Ledger)
       ↓
Deterministic Decision Layer (FPDE → Intervention → Mastery → Roadmap → Capability → Orchestrator)
       ↓
Presentation Layer (Curated Knowledge, Hardened Response, Read-Only Chat, React 19 UI)
```

---

## 5. False Progress Index (FPI) Formula
$$\text{FPI} = 0.25(\text{LowIndep}) + 0.20(\text{Hints}) + 0.20(\text{Blindspots}) + 0.15(\text{BruteForce}) + 0.10(\text{Time}) + 0.10(\text{VelocityDepth})$$
* **Severity Tiers**: `0–24: LOW`, `25–49: MEDIUM`, `50–74: HIGH`, `75–100: CRITICAL`.
* **Alex Sharma Arithmetic**: $20.0 + 20.0 + 20.0 + 15.0 + 2.0 + 10.0 = \mathbf{87.0}$ (`CRITICAL`).

---

## 6. Composite Mastery Formula
$$\text{Mastery Score} = 0.6 \times \text{IndependentSuccessScore} + 0.4 \times \text{ConceptualScore}$$
* **Independent Success** ($100$ or $0$): Requires `solved == True`, `hints_used == 0`, and `attempts == 1`.
* **Conceptual Pass**: `conceptual_score >= 80.0` (graded server-side).
* **Verdict**: $\text{MASTERED} \iff (\text{is\_independent} \land \text{conceptual\_pass})$. Otherwise $\text{NOT\_MASTERED}$.

---

## 7. Verified Capability Formula
$$\text{Verified Capability} = \text{Standard Readiness} \times [0.50 + (0.50 \times \text{MasteryCoverage})]$$
* **Standard Readiness**: $72.0(0.4) + \min(40/50, 1)(30) + \min(12/14, 1)(15) + 75(0.15) = \mathbf{76.9}$.
* **Alex Initial**: Coverage = $0.0 \implies \text{Multiplier} = 0.50 \implies \mathbf{38.5}$ (`NOT_VERIFIED`).
* **Alex Post-Mastery**: Coverage = $1.0 \implies \text{Multiplier} = 1.00 \implies \mathbf{76.9}$ (`PARTIALLY_VERIFIED`).

---

## 8. Alex Sharma Flow (False Progress Archetype)
1. 40 problems, 77.5% hint dependency, 20% first-attempt solves.
2. FPDE computes FPI = **87.0 (CRITICAL)**.
3. Roadmap Engine evaluates Precedence 4 $\implies$ **`PAUSE_ADVANCEMENT`** on **Sliding Window**.
4. Verified Capability discounted to **38.5** (`NOT_VERIFIED`).
5. Orchestrator emits action **`COMPLETE_MASTERY_CHECK`**.
6. Student passes server-evaluated check (100%) $\implies$ Roadmap transitions to **`RESUME_ROADMAP`** and capability updates to **76.9**.

---

## 9. Priya Mehta Flow (Autonomous Competence Baseline)
1. 35 problems, 85.7% first-attempt pass rate, 8.6% hint dependency.
2. FPDE computes FPI = **10.0 (LOW)**, zero triggers.
3. Roadmap Engine evaluates Precedence 5 $\implies$ **`CONTINUE_NORMAL`**.
4. Readiness = **76.9** (`PARTIALLY_VERIFIED`).
5. Orchestrator emits action **`CONTINUE_LEARNING`**. Unhindered progression.

---

## 10. Key APIs to Remember
* `GET /api/students/{id}/scholar/state`: Complete unified evidence state.
* `GET /api/students/{id}/scholar/next-action`: Single actionable priority directive.
* `GET /api/students/{id}/mastery-assessment/{topic}`: **Answer-key isolated** conceptual question.
* `POST /api/students/{id}/mastery-assessment/submit`: Server-evaluated grading (100 or 0).
* `POST /api/students/{id}/mastery-check`: Dual coding + conceptual evaluation.
* `POST /api/students/{id}/scholar/chat`: Read-only conversational contract.

---

## 11. Key Files & Roles
* `backend/app/services/false_progress_detector.py`: 7 triggers & 0–100 FPI.
* `backend/app/services/intervention_service.py`: 4-step micro-sprint plan.
* `backend/app/services/mastery_assessment_service.py`: Server grading & in-memory ledger.
* `backend/app/services/mastery_service.py`: 0.6 / 0.4 composite formula.
* `backend/app/services/roadmap_adaptation_service.py`: 5 precedence rules.
* `backend/app/services/readiness_service.py`: Dual-metric readiness discounting.
* `backend/app/services/scholar_orchestrator_service.py`: Central coordination & next action.
* `frontend/src/pages/ScholarPage.tsx`: React 19 dashboard & state orchestration.
* `frontend/src/components/MasteryFlowModal.tsx`: 2-step verification modal.

---

## 12. Main Known Prototype Limitations
1. **In-Memory Ledger (`_VERIFIED_ASSESSMENT_SCORES`)**: Ephemeral dictionary; server restart clears in-flight scores. (Production: PostgreSQL table).
2. **Curated Question Bank**: 5 prototype questions authored for validation. (Production: Expanded repository with IRT).
3. **Synchronous REST**: Evaluations run synchronously. (Production: Async Kafka pipeline).
4. **Demo Archetype Routing**: Student ID URL parameter. (Production: JWT authentication).

---

## 13. Why No LLM in the Decision Engine?
* **Accountability**: Pausing a student's education requires auditable, reproducible mathematical proof, not generative sentiment.
* **Safety**: LLMs are vulnerable to prompt injections (e.g. *"I finished, unlock my roadmap"*).
* **Zero Hallucination**: The system never invents missing scores or false progress.

---

## 14. Scaling to 10 Million Students
1. Replace SQLite with PostgreSQL read-replicas.
2. Ingest IDE compiler telemetry via Apache Kafka event bus.
3. Cache pre-computed student diagnostic states in Redis.
4. Scale stateless FastAPI workers on AWS ECS / Kubernetes.

---

## 15. Security & Trust Boundary Answer
* **The frontend is never the source of truth.** It cannot send scores or unlock roadmaps.
* **Answer-key isolation**: `MasteryAssessmentQuestion` excludes `correct_answer`; grading is 100% server-side.
* **Read-only chat contract**: Conversational inputs cannot mutate stored telemetry or readiness.
* **Zero secrets**: Configured via environment variables; zero hardcoded credentials.

---

## 16. Top 10 Strongest Spoken Answers

1. **"What is Scholar AI?"**  
   *"A deterministic competence mentor that separates student activity from true capability by analyzing coding telemetry to detect false progress and verify mastery."*
2. **"Why not just trust completion percentage?"**  
   *"Because students frequently pass problems by spamming hints or trial-and-error submissions. High completion with low independence leads to placement failure."*
3. **"How does it detect false progress?"**  
   *"Through 7 behavioral heuristics evaluating hint crutch, brute force retries, low first-attempt solve rate, duration anomalies, topic blindspots, velocity decay, and shallow consistency."*
4. **"Why did Alex's roadmap pause?"**  
   *"Alex had an FPI of 87.0 (Critical) due to 77.5% hint reliance and only 20% independent solves. The engine paused advancement to prevent unearned progression."*
5. **"How does Alex unpause his roadmap?"**  
   *"By taking a server-evaluated conceptual assessment and an independent coding solve with 0 hints and 1 attempt, scoring $\ge 80$ composite."*
6. **"Where is the intelligence in your system?"**  
   *"In the mathematical diagnostic heuristics, the 5-rule roadmap precedence engine, and the decoupled capability calibration—not a generative black box."*
7. **"What prevents prompt injection in the chat?"**  
   *"The chat service is strictly read-only. It has no write tools or database mutation rights. User claims cannot fabricate telemetry."*
8. **"Why does RESUME_ROADMAP take precedence over PAUSE_ADVANCEMENT?"**  
   *"Because if PAUSE were checked first, a student would remain permanently blocked by their historical telemetry even after demonstrating verified mastery."*
9. **"What does Priya's dashboard look like?"**  
   *"Priya has an FPI of 10.0 and no active triggers. Her roadmap is CONTINUE_NORMAL, and Scholar issues CONTINUE_LEARNING without forced interventions."*
10. **"What happens if a student has only 2 submissions?"**  
    *"The engine outputs COLLECT_MORE_EVIDENCE. It enforces a 5-problem minimum and never treats missing data as a score of zero."*
