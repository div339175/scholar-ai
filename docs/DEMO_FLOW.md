# Scholar AI — UI Demo Flow & Screenshot Guide

This guide details the exact manual steps and UI states required to capture screenshots demonstrating the Scholar AI engine in action. 

> [!NOTE]
> All states described below correspond to verified deterministic backend responses running locally with the FastAPI backend (`http://localhost:8000`) and the Vite React frontend (`http://localhost:5173`).

---

## Prerequisites for Capturing Screenshots

1. **Start Backend**:
   ```bash
   source .venv/bin/activate
   PYTHONPATH=backend uvicorn app.main:app --port 8000 --reload
   ```
2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open browser at `http://localhost:5173`. Navigate to the **Scholar AI** tab or direct URL `http://localhost:5173/scholar`.

---

## Recommended Screenshot Catalog (10 Screens)

### 1. Scholar Dashboard — Alex Initial State
* **Student**: Alex Sharma (`student_alex`)
* **URL**: `http://localhost:5173/scholar?student=student_alex`
* **What to capture**: Full screen showing Alex's high-level profile (72% roadmap completion, 12-day active streak) side-by-side with the Scholar AI State Card displaying a **False Progress Index of 87.0 (CRITICAL)**.
* **Key Evidence**: Visually highlights the core problem—surface activity (72% complete) masking underlying conceptual struggles.

### 2. False-Progress Warning & Behavioral Diagnostic
* **Student**: Alex Sharma
* **Component**: Scholar State Card (left panel)
* **What to capture**: Zoomed view of the Diagnostic Breakdown displaying active trigger codes:
  * `FP_HINT_CRUTCH` (77.5% hint dependency)
  * `FP_LOW_INDEPENDENCE` (20.0% unassisted first-attempt pass)
  * `FP_BRUTE_FORCE` (4.2 avg submissions per problem)
  * Affected Topics: `Dynamic Programming`, `Sliding Window`
* **Key Evidence**: Proves that false progress detection is driven by explicit telemetry metrics, not arbitrary LLM sentiment.

### 3. Current Action Banner — COMPLETE_MASTERY_CHECK
* **Student**: Alex Sharma
* **Component**: Action Banner (top of center panel)
* **What to capture**: Amber banner showing:
  * Badge: `Action Required`
  * Action: `COMPLETE_MASTERY_CHECK`
  * Target Topic: `Sliding Window`
  * Button: **"Start Mastery Check"**
* **Key Evidence**: Demonstrates proactive gating—the system halts forward advancement until the student demonstrates independent capability.

### 4. Conversational Explanation ("Why this action?")
* **Student**: Alex Sharma
* **Component**: Scholar Chat Panel (center panel)
* **What to capture**: The chat history after clicking the quick prompt **"Why this action?"**.
* **What the UI displays**: Scholar's response citing the exact evidence:
  > *"Action COMPLETE_MASTERY_CHECK was selected because false progress was detected in Sliding Window (False Progress Index: 87.0, severity: CRITICAL). Telemetry shows a hint dependency of 77.5% and unassisted pass ratio of 20.0%..."*
* **Key Evidence**: Transparent, deterministic reasoning traceable to backend telemetry without generative hallucinations.

### 5. Grounded Knowledge Panel — Sliding Window Invariants
* **Student**: Alex Sharma
* **Component**: Grounded Knowledge Panel (right panel)
* **What to capture**: Curated conceptual knowledge items for `Sliding Window`:
  * Title: *"Fixed vs Variable Window Invariants"*
  * Content explaining window contraction conditions and pointer invariants.
  * Tag: `curated_prototype`
* **Key Evidence**: Educational guidance grounded in validated algorithmic invariants rather than unconstrained web search or open-ended generative chat.

### 6. Mastery Assessment Modal — Question & Answer-Key Isolation
* **Student**: Alex Sharma
* **Action**: Click **"Start Mastery Check"** on the Action Banner
* **What to capture**: The `MasteryFlowModal` displaying the multiple-choice conceptual assessment:
  * Question: *"In a variable-size sliding window problem for finding the longest substring with at most K distinct characters, when should the left pointer advance?"*
  * 4 options (radio buttons)
  * Note in UI: Inspection of browser DevTools network tab confirms `correct_answer` is strictly absent from the payload.
* **Key Evidence**: Demonstrates answer-key isolation and integrity—the client never knows the correct answer before submission.

### 7. Mastery Evaluation Submission & Verified Score Result
* **Student**: Alex Sharma
* **Action**: Select the correct option: *"Whenever the frequency map contains more than K distinct characters, until the distinct count is <= K again."* and click **"Submit Mastery Check"**.
* **What to capture**: Modal result showing:
  * Status: **"Mastery Check Passed!"**
  * Conceptual Score: **100% (Server-Evaluated)**
  * Independence: **100%** (1 attempt, 0 hints)
  * Composite Mastery Score: **100.0 / 100**
  * Transition message: *"Roadmap advancement unlocked."*
* **Key Evidence**: Server-side grading updates the student's verified capability in real time.

### 8. Roadmap Resumed Dashboard State
* **Student**: Alex Sharma
* **Component**: Center Action Banner after completing check
* **What to capture**: The Action Banner automatically turns **Green**:
  * Action: `RESUME_ROADMAP`
  * Status: `NORMAL`
  * Message: *"Mastery verified for Sliding Window. Roadmap advancement resumed."*
* **Key Evidence**: The roadmap state changes dynamically from `PAUSE_ADVANCEMENT` to `RESUME_ROADMAP` as a direct consequence of verified evidence.

### 9. Updated Capability & Readiness Decoupling
* **Student**: Alex Sharma
* **Component**: Scholar State Card (readiness section)
* **What to capture**: 
  * Standard Readiness: `76.9`
  * Verified Capability: `76.9` (updated from initial confidence-discounted `38.5`)
  * Readiness Status: `PARTIALLY_VERIFIED`
* **Key Evidence**: Demonstrates dual-metric readiness—unverified activity cannot inflate verified capability; only passed mastery checks unlock the confidence multiplier.

### 10. Priya Mehta — Normal Autonomous Progression
* **Student**: Priya Mehta (`student_priya`)
* **URL**: `http://localhost:5173/scholar?student=student_priya`
* **What to capture**: Priya's dashboard:
  * FPI: `10.0` (LOW severity)
  * Action: `CONTINUE_LEARNING`
  * Roadmap Status: `CONTINUE_NORMAL`
  * Chat: *"Your learning telemetry reflects verified autonomous progress without active false-progress flags..."*
* **Key Evidence**: Contrast case showing that Scholar AI does not interfere or force interventions when student telemetry proves genuine independent competence.
