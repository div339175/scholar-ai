# StepCode Scholar AI — Evidence-Based Module Completion & Roadmap Audit

**Audit Date:** 2026-11-19  
**Repository:** `https://github.com/div339175/scholar-ai`  
**Thesis:** *"Student activity is not the same as student competence. Completion does not equal mastery."*

---

## Executive Summary

In conventional learning platforms, students can manually click "Complete" or mark checkmarks arbitrarily, producing an illusion of advancement without verified mastery. 

To eliminate this fundamental contradiction with Scholar AI's mission, the roadmap module completion architecture was audited and refactored. The arbitrary `[Complete Module]` button has been completely eliminated. In its place, the system enforces **evidence-grounded state transitions** across both the backend SQLite database and the frontend UI.

---

## A. Current Implementation of Module Completion

Prior to this fix, the Roadmap UI contained a direct `[Complete Module]` button on in-progress cards:
```tsx
#4 Recursion & Backtracking Foundations
[Practice Problems] [Complete Module] [IN PROGRESS]
```
Clicking it dispatched `POST /students/{id}/roadmap/{node_id}/complete`, which set `status = "COMPLETED"` in SQLite without verifying:
1. Whether the student had completed the required telemetry/practice problems.
2. Whether the student was under an active Scholar AI pause (`PAUSE_ADVANCEMENT`) due to False Progress.
3. Whether the student had failed a conceptual mastery check (`REMEDIATION`).

### Refactored Implementation
1. **Endpoint**: `POST /students/{id}/roadmap/{node_id}/verify-completion` and `POST /students/{id}/roadmap/{node_id}/complete?force=false`.
2. **Backend Checks**:
   - Node must exist and belong to the student.
   - Node cannot be `LOCKED` (prerequisites must be satisfied).
   - If Scholar AI has flagged False Progress on this topic and ordered `PAUSE_ADVANCEMENT`, completion is blocked (HTTP 400).
   - If the student has an unmastered check or pending remediation on this topic, completion is blocked (HTTP 400).
   - The student must have satisfied the minimum practice problem evidence threshold ($\ge 2$ unassisted solves, or $\ge 3$ for Sliding Window) recorded in SQLite telemetry.
3. **Database-Driven**: Module completion strictly mutates SQLite `roadmap_nodes` and updates `students.roadmap_completion` based on real completion math.

---

## B. Architectural Alignment

An arbitrary "Complete Module" button contradicts the core thesis of Scholar AI:
- If a student can self-assert completion, "completion" is disconnected from competence.
- Scholar AI exists to safeguard the student against false progress and superficial learning.
- By replacing manual completion with system-derived verification, completion becomes a verified milestone backed by telemetry evidence.

---

## C. Completion Requirements Model

To complete a module, a student must provide:
1. **Prerequisite Clearance**: The preceding module in the sequence must already be `COMPLETED`.
2. **Practice Telemetry Evidence**:
   - Minimum 2 problems solved independently for the module's topic (3 for high-density topics like Sliding Window).
   - Solves must be recorded in SQLite telemetry (`telemetry_events`).
3. **Scholar AI Clean Bill of Health**:
   - No active False Progress flag on the topic (`FP_HINT_CRUTCH`, `FP_RAPID_GUESS`, etc.).
   - No pending mastery verification requirement (`PAUSE_ADVANCEMENT`).
4. **Mastery Verification (if flagged)**:
   - If flagged for false progress, the student must complete a server-evaluated conceptual mastery check with score $\ge 80\%$, triggering `RESUME_ROADMAP` before the module can be finalized.

---

## D. Edge Cases Handled

| State | Condition | UI Representation | Action Available | Completion Allowed? |
| :--- | :--- | :--- | :--- | :--- |
| **LOCKED** | Preceding module incomplete | Grayed badge: `Requires #X` | None | **NO** (HTTP 400 if attempted) |
| **AVAILABLE** | Preceding module complete, not started | Indigo badge: `Available` | `[Start Module]` | **NO** (Must start first) |
| **NEEDS_EVIDENCE** | In progress, solved problems < threshold | Amber badge: `Needs Evidence (X/Y)` | `[Practice Problems]` | **NO** (Evidence required) |
| **MASTERY_CHECK_REQUIRED** | False progress detected by Scholar AI | Orange badge: `Mastery Required` | `[Verify Mastery]` | **NO** (Blocked by pause) |
| **REMEDIATION** | Mastery check failed (< 80%) | Red badge: `Remediation` | `[Review Invariants]`, `[Practice Problems]` | **NO** (Blocked by remediation) |
| **IN_PROGRESS (Ready)** | Evidence satisfied ($\ge 2$ solves, clean) | Emerald badge: `Evidence Ready` | `[Verify Evidence]` | **YES** (Invokes verification) |
| **COMPLETED** | Verified and finalized in SQLite | Green badge: `Completed` | `[Review Invariants]` | **Already Completed** |

---

## E. Backend Enforcement & Error Payloads

When a client attempts an unverified or illegal completion:

1. **Attempting to complete a locked module**:
   - Status: `HTTP 400 Bad Request`
   - Payload: `{"detail": "Cannot complete locked module. Complete prerequisite module #X first."}`

2. **Attempting to complete a module paused for False Progress**:
   - Status: `HTTP 400 Bad Request`
   - Payload: `{"detail": "Scholar AI has paused advancement on this topic. You must complete and pass the conceptual mastery check first."}`

3. **Attempting to complete a module with insufficient practice evidence**:
   - Status: `HTTP 400 Bad Request`
   - Payload: `{"detail": "Module requires at least 2 practice problem solves before completion (currently 0 solved). Complete practice problems to generate telemetry evidence."}`

4. **For benchmark fixtures**:
   - `complete_roadmap_node(student_id, node_id, force=True)` is reserved for offline data generation and benchmark fixtures, ensuring evaluator archetypes (Alex, Priya, Marcus) remain exact.

---

## F. State Machine

```
              ┌───────────────────────────┐
              │          LOCKED           │
              └─────────────┬─────────────┘
                            │ Preceding module COMPLETED
                            ▼
              ┌───────────────────────────┐
              │         AVAILABLE         │
              └─────────────┬─────────────┘
                            │ POST /start
                            ▼
              ┌───────────────────────────┐
              │      NEEDS_EVIDENCE       │ ◄────────┐
              └─────────────┬─────────────┘          │
                            │                        │
       ┌────────────────────┴────────────────────┐   │
       │ Telemetry solves                        │ False Progress
       │ satisfy required threshold              │ detected
       ▼                                         ▼
┌──────────────┐                       ┌─────────────────────────┐
│ IN_PROGRESS  │                       │  MASTERY_CHECK_REQUIRED │
│(Evidence OK) │                       └────────────┬────────────┘
└──────┬───────┘                                    │
       │                                            │ Conceptual Mastery Check
       │ verify-completion                          ├─────────────────┐
       ▼                                            │ Score >= 80%    │ Score < 80%
┌──────────────┐                                    ▼                 ▼
│  COMPLETED   │                              ┌───────────┐     ┌─────────────┐
└──────────────┘                              │ RESUME    │     │ REMEDIATION │
                                              │ ROADMAP   │     └─────────────┘
                                              └─────┬─────┘
                                                    │
                                                    └─► Unlocks verify-completion
```

---

## G. Evaluator Archetype Preservation

The implementation preserves the canonical evaluator archetypes without corrupting their state:
- **Alex Sharma (`student_alex`)**: 72.0% completion, 12-day streak, Sliding Window flagged with False Progress (`PAUSE_ADVANCEMENT`). The Sliding Window module correctly reflects `MASTERY_CHECK_REQUIRED` and blocks advancement until mastery is proven.
- **Priya Mehta (`student_priya`)**: 65.0% completion, 9-day streak, genuine mastery. Unflagged modules with sufficient practice evidence can be verified cleanly.
- **Marcus Vance (`student_marcus`)**: 15.0% completion, sparse telemetry. Early modules correctly reflect `NEEDS_EVIDENCE` and guide Marcus to collect practice telemetry before advancing.

---

## H. Verification Test Results

### Backend Suite (`pytest backend/tests/ -v`)
- **184 of 184 tests passed** in 1.76s.
- Includes `backend/tests/test_student_lifecycle.py`:
  - `test_11_evidence_based_module_completion_verification`: Confirms that completing without evidence returns HTTP 400, solving practice problems allows completion, and locked modules reject completion.
  - `test_12_mastery_check_completion_unlocks_roadmap_and_remediation_blocks`: Confirms false progress pause blocks completion, failed mastery check blocks completion in remediation, and passing mastery check unlocks completion and sequence progression.

### Frontend Suite (`vitest run --run`)
- **23 of 23 tests passed** in 1.14s.
- Confirms:
  - Arbitrary `[Complete Module]` button does not exist in the DOM.
  - In-progress modules with insufficient evidence render `Needs Evidence (X/Y)` badge and `[Practice Problems]` button.
  - Modules with satisfied evidence render `[Verify Evidence]` and `Evidence Ready` badge.
  - Clicking `[Verify Evidence]` invokes `scholarApi.verifyRoadmapNodeCompletion`.
  - Production build (`npm run build`) succeeded with 0 TypeScript errors.
