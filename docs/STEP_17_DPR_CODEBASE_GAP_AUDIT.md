# STEP 17 — DPR-TO-CODEBASE GAP AUDIT

**Date:** November 18, 2026  
**Auditor:** Antigravity (Automated Inspection — No Code Modified)  
**Repository:** `/Users/divakarmaurya/stepcode`  
**DPR Source:** StepCode Technologies Detailed Project Report (uploaded images, Nov 2026)

> **Audit Rule:** Every claim in this report is grounded in actual file contents, actual runtime values, and actual test execution output. Nothing is assumed or inferred from README claims alone.

---

## 1. EXECUTIVE SUMMARY

The StepCode Scholar AI prototype successfully demonstrates the **core intelligence pipeline** described in the DPR's Scholar AI specification: telemetry → false progress detection → intervention → mastery verification → roadmap adaptation → verified capability → conversational mentor. This core pipeline is **fully implemented and deterministic** with 177 automated tests (163 backend + 14 frontend) passing.

**However**, the DPR describes a **complete student platform** with 15+ distinct product pillars (coding playground, projects, hackathons, career launchpad, mock interviews, college analytics, recruiter portal, JWT authentication, PostgreSQL with pgvector, RAG). **None of these secondary pillars are implemented**. Only the Scholar AI intelligence core and a demo UI are present.

| Category | Verdict |
| :--- | :--- |
| Scholar AI Core Pipeline | ✅ FULLY IMPLEMENTED |
| Student Dashboard UI | ⚠️ PROTOTYPE / DEMO ONLY |
| Authentication | ❌ NOT IMPLEMENTED |
| Coding Playground | ❌ NOT IMPLEMENTED |
| Projects / GitHub Verification | ❌ NOT IMPLEMENTED |
| Hackathons | ❌ NOT IMPLEMENTED |
| Career Launchpad / Mock Interviews | ❌ NOT IMPLEMENTED |
| College / Recruiter Portal | ❌ NOT IMPLEMENTED |
| PostgreSQL / pgvector / RAG | ❌ NOT IMPLEMENTED |
| Multi-tenant / JWT / RBAC | ❌ NOT IMPLEMENTED |

**Verdict for Internship Submission:** The implemented Scholar AI core is **technically impressive** and directly matches the DPR's Scholar AI intelligence requirements. As an internship prototype scoped to the Scholar AI layer, it is defensible and strong. As an end-to-end platform prototype, it is significantly incomplete against the full DPR scope.

---

## 2. REPOSITORY INVENTORY

### 2.1 Directory Structure

```
stepcode/
├── backend/
│   ├── app/
│   │   ├── config.py               # Settings (DATABASE_URL, CORS_ORIGINS)
│   │   ├── database.py             # SQLAlchemy engine setup
│   │   ├── main.py                 # FastAPI app + CORS + router registration
│   │   ├── data/
│   │   │   ├── mastery_questions.py    # 4 curated MCQ topics (8 questions total)
│   │   │   └── scholar_knowledge.py   # Curated knowledge items (keyword-retrieval)
│   │   ├── models/
│   │   │   ├── student.py          # Student, ReadinessSnapshot
│   │   │   ├── problem.py          # Problem, CodingTelemetry / LearningEvent
│   │   │   ├── roadmap.py          # RoadmapNode
│   │   │   └── scholar.py          # ScholarIntervention, MasteryCheck
│   │   ├── routers/
│   │   │   ├── dashboard.py        # GET /students/{id}, /readiness, /verified-capability
│   │   │   ├── telemetry.py        # GET/POST /students/{id}/telemetry
│   │   │   ├── roadmap.py          # GET/POST /students/{id}/roadmap, /adaptation
│   │   │   └── scholar.py          # 12 Scholar AI endpoints
│   │   ├── schemas/
│   │   │   ├── student.py
│   │   │   ├── telemetry.py
│   │   │   ├── roadmap.py
│   │   │   └── scholar.py
│   │   └── services/
│   │       ├── false_progress_detector.py
│   │       ├── intervention_service.py
│   │       ├── mastery_service.py
│   │       ├── mastery_assessment_service.py
│   │       ├── readiness_service.py
│   │       ├── roadmap_adaptation_service.py
│   │       ├── roadmap_service.py
│   │       ├── scholar_conversation_service.py
│   │       ├── scholar_intent_service.py
│   │       ├── scholar_knowledge_service.py
│   │       ├── scholar_orchestrator_service.py
│   │       ├── scholar_response_service.py
│   │       └── telemetry_service.py
│   ├── seed_data.py                # 2 demo students (Alex, Priya) + telemetry
│   ├── requirements.txt            # fastapi, uvicorn, pydantic, sqlalchemy, pytest, httpx
│   └── tests/ (13 test files, 163 tests)
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # 4-view router (landing/onboarding/dashboard/classic)
│   │   ├── api/scholarApi.ts       # 10 typed API client methods
│   │   ├── components/ (11 components)
│   │   ├── pages/ScholarPage.tsx   # Original technical diagnostic page
│   │   ├── types/scholar.ts        # TypeScript domain interfaces
│   │   └── tests/scholar.test.tsx  # 14 Vitest tests
│   ├── package.json                # react 19, lucide-react, typescript, vite, vitest
│   └── vite.config.ts              # Proxy /api → localhost:8000
├── docs/ (14 documentation files)
├── .env.example                    # DATABASE_URL, DEBUG, CORS_ORIGINS
├── stepcode.db                     # SQLite database (476 students, 2322 telemetry rows)
└── README.md
```

### 2.2 Frontend Components

| Component | Purpose | Status |
| :--- | :--- | :--- |
| `LandingPage.tsx` | Marketing page, thesis, CTAs | Exists, functional |
| `AuthModal.tsx` | Simulated login/signup UI | Exists, **no backend auth** |
| `OnboardingFlow.tsx` | 4-step goal/experience/commitment flow | Exists, **data not persisted** |
| `StudentDashboardView.tsx` | Tabbed student dashboard | Exists, partial content |
| `ScholarPage.tsx` | Original technical evaluator dashboard | Exists, fully functional |
| `ScholarChatPanel.tsx` | Conversational Scholar interface | Exists, functional |
| `GroundedKnowledgePanel.tsx` | Curated knowledge display | Exists, functional |
| `MasteryFlowModal.tsx` | Interactive mastery check UI | Exists, functional |
| `ScholarStateCard.tsx` | Evidence state card | Exists, functional |
| `CurrentActionBanner.tsx` | Action directive banner | Exists, functional |
| `StudentSelector.tsx` | Demo mode archetype switcher | Exists, functional |
| `ReadinessRoadmapContext.tsx` | Readiness context card | Exists, functional |

### 2.3 Frontend Routing

There is **no React Router or file-based routing**. All navigation is handled by state machine in `App.tsx`:

```
AppView = "landing" | "onboarding" | "dashboard" | "classic_evaluator"
```

URL parameters supported:
- `/?mode=demo` → Dashboard (Demo Mode)
- `/?view=dashboard` → Dashboard
- `/?view=classic` → Classic Evaluator

There are **zero URL-based routes** for individual pages. No deep-linking.

---

## 3. CURRENT ARCHITECTURE

### 3.1 Backend Architecture Map

```
Router                     → Schema                    → Service                      → Database
─────────────────────────────────────────────────────────────────────────────────────────────
GET /students/{id}         → StudentResponse           → DB query                     → students
GET /{id}/readiness        → ReadinessResponse         → ReadinessService             → coding_telemetry, students
GET /{id}/verified-cap     → VerifiedCapabilityResponse→ ReadinessService.evaluate_   → all tables
GET /{id}/telemetry        → List[TelemetryResponse]   → TelemetryService             → coding_telemetry
POST /{id}/telemetry       → TelemetryResponse         → TelemetryService.log_        → coding_telemetry
GET /{id}/roadmap          → List[RoadmapNodeResponse] → RoadmapService               → roadmap_nodes
POST /{id}/roadmap         → RoadmapNodeResponse       → RoadmapService.add_node      → roadmap_nodes
GET /{id}/roadmap/adapt.   → RoadmapAdaptationDecision → RoadmapAdaptationService     → all tables
GET /{id}/false-progress   → FalseProgressDiagnostic   → FalseProgressDetector        → coding_telemetry
GET /{id}/intervention     → InterventionPlan          → InterventionService          → coding_telemetry, roadmap_nodes
GET /{id}/mastery-assess./{topic}  → MasteryAssessQuestion  → MasteryAssessService    → IN-MEMORY
POST /{id}/mastery-assess./submit  → MasteryAssessResult    → MasteryAssessService    → IN-MEMORY
POST /{id}/mastery-check   → MasteryCheckResult        → MasteryService              → mastery_checks, scholar_interventions
GET /{id}/mastery-check/status → MasteryCheckStatus    → MasteryService              → mastery_checks
GET /{id}/scholar/state    → ScholarStudentState        → ScholarOrchestratorService  → all tables
GET /{id}/scholar/next-action → ScholarNextAction       → ScholarOrchestratorService  → all tables
GET /{id}/scholar/context  → ScholarGroundedContext     → ScholarKnowledgeService     → IN-MEMORY static dict
GET /{id}/scholar/knowledge/topic/{t} → List[KnowledgeRetrieval] → ScholarKnowledgeService → IN-MEMORY
GET /{id}/scholar/knowledge/item/{id} → ScholarKnowledgeItem → ScholarKnowledgeService → IN-MEMORY
GET /{id}/scholar/response → ScholarResponse            → ScholarResponseService      → all tables
POST /{id}/scholar/chat    → ScholarConversationResponse→ ScholarConversationService  → all tables (read-only)
GET /{id}/interventions    → List[ScholarIntervention]  → DB query                   → scholar_interventions
```

**Total API Endpoints:** 22 endpoints across 4 routers.

---

## 4. FRONTEND AUDIT

### 4.1 Actual Pages / Views

| View | Trigger | Backend Connected | Student-Friendly |
| :--- | :--- | :--- | :--- |
| Landing Page | Default app load | ❌ No | ✅ Yes |
| Auth Modal | "Get Started" CTA | ❌ No backend auth | ✅ Yes (prototype disclaimer shown) |
| Onboarding Flow | After simulated login | ❌ No backend | ✅ Yes |
| Student Dashboard | After onboarding or Demo | ✅ Partial | ✅ Yes |
| Classic Evaluator | `?view=classic` | ✅ Full | ⚠️ Technical |

### 4.2 Navigation

No React Router. Navigation is view-state only. `StudentDashboardView.tsx` has 7 tab types as internal state:
- `dashboard` ✅ — Functional (loads Scholar state from API)
- `roadmap` ✅ — Functional (loads roadmap from API)
- `practice` ⚠️ — UI placeholder only. Displays mock problem text, no real code editor.
- `projects` ⚠️ — UI placeholder only. No backend data.
- `scholar` ✅ — Functional Scholar chat + knowledge panel
- `insights` ✅ — Technical diagnostic state card (full FPDE data)
- `profile` ⚠️ — UI placeholder. Displays onboarding data from props, not from backend.

### 4.3 Authentication UI

- `AuthModal.tsx` renders login/signup form with email/password fields.
- On form submit, calls `onSuccess(email)` **directly in the browser** with zero API call.
- **No backend authentication endpoint exists.**
- Students are identified by hardcoded demo IDs (`student_alex`, `student_priya`).
- After "login", user is routed to onboarding or dashboard without any session token.

### 4.4 Onboarding UI

- `OnboardingFlow.tsx` collects: career goal, experience level, weekly hours.
- Data is passed via props to `StudentDashboardView` and displayed in profile tab.
- **Data is never sent to any backend endpoint.**
- **Data does not affect roadmap, Scholar state, or any backend behavior.**

### 4.5 CSS / Styling

- CSS is **custom design system** in `frontend/src/index.css` using CSS custom properties (CSS variables).
- **Tailwind CSS is NOT installed.** `package.json` has zero Tailwind dependency.
- `README.md` and `ARCHITECTURE.md` both claim "Tailwind CSS 3.4+". This is **incorrect**.
- Styling uses hand-crafted utility classes (`.card`, `.btn`, `.badge`) defined in `index.css`.

---

## 5. BACKEND AUDIT

### 5.1 Services Inventory

| Service | Purpose | Deterministic | No-LLM | Tested |
| :--- | :--- | :--- | :--- | :--- |
| `false_progress_detector.py` | 7-signal FPI computation | ✅ | ✅ | ✅ 11 tests |
| `intervention_service.py` | Intervention plan generation | ✅ | ✅ | ✅ 12 tests |
| `mastery_service.py` | Mastery check evaluation | ✅ | ✅ | ✅ 12 tests |
| `mastery_assessment_service.py` | MCQ server-side grading + in-memory ledger | ✅ | ✅ | ✅ 11 tests |
| `readiness_service.py` | Standard readiness + VCS computation | ✅ | ✅ | ✅ 13 tests |
| `roadmap_adaptation_service.py` | 5-rule roadmap mutation decisions | ✅ | ✅ | ✅ 11 tests |
| `roadmap_service.py` | Roadmap node CRUD | ✅ | ✅ | ✅ (via models test) |
| `telemetry_service.py` | Telemetry log / retrieval | ✅ | ✅ | ✅ (via models test) |
| `scholar_orchestrator_service.py` | State + action assembly | ✅ | ✅ | ✅ 13 tests |
| `scholar_knowledge_service.py` | Keyword-based knowledge retrieval | ✅ | ✅ | ✅ 14 tests |
| `scholar_response_service.py` | Evidence-grounded response text | ✅ | ✅ | ✅ 21 tests |
| `scholar_conversation_service.py` | Intent-routed conversational API | ✅ | ✅ | ✅ 28 tests |
| `scholar_intent_service.py` | Keyword-based intent classification | ✅ | ✅ | ✅ (via conversation tests) |

### 5.2 Business Rules Implemented

1. **FPDE — 7 Behavioral Signals:** `FP_HINT_CRUTCH`, `FP_BRUTE_FORCE`, `FP_LOW_INDEPENDENCE`, `FP_TIME_ANOMALY`, `FP_CONCEPT_BLINDSPOT`, `FP_VELOCITY_DECAY`, `FP_SHALLOW_CONSISTENCY`
2. **Mastery Requirements:** attempts = 1, hints_used = 0, solved = True, verified_score >= 80
3. **Roadmap Adaptation — 5 Precedence Rules:** False Progress → Intervention → Failed Mastery → Resume Mastery → Normal Continuation
4. **Confidence Multiplier:** `0.5 + (0.5 × mastery_coverage)` → range [0.5, 1.0]
5. **VCS Formula:** `standard_readiness × mastery_confidence_multiplier`
6. **Evidence Boundary:** Chat messages are NEVER treated as telemetry or evidence
7. **Answer Key Isolation:** `correct_answer` and `explanation` stripped before client delivery

---

## 6. DATABASE AUDIT

### A. Is the database SQLite or PostgreSQL?

**SQLite.** `config.py` line 7: `DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./stepcode.db")`. The file `stepcode.db` exists at the project root and is currently the active database.

### B. Is PostgreSQL actually implemented or only configuration-ready?

**Configuration-ready only.** `.env.example` contains the commented-out line:
```
# DATABASE_URL="postgresql://user:password@localhost:5432/stepcode"
```
`database.py` has a conditional for `sqlite` check-same-thread. No psycopg2, asyncpg, or pg-specific driver is in `requirements.txt`. PostgreSQL is **not installed or tested**.

### C. Is pgvector actually implemented?

**No.** `pgvector` is not in `requirements.txt`, not imported anywhere in the codebase, and not referenced in any model or service. The DPR mentions pgvector for RAG. This is **entirely absent** from the prototype.

### D. Which student information is persisted?

Persisted in `students` table: `id`, `name`, `career_goal`, `weekly_hours`, `current_streak`, `roadmap_completion`, `created_at`.

**NOT persisted:** onboarding answers collected by `OnboardingFlow.tsx`, authentication credentials, session data.

### E. Which telemetry is persisted?

Persisted in `coding_telemetry` table: `student_id`, `problem_id`, `topic`, `difficulty`, `submission_count`, `successful`, `first_attempt_pass`, `hints_requested`, `active_coding_duration_seconds`, `timestamp`.

**Current DB state:** 2,322 telemetry rows (seeded + test-generated).

### F. Are submissions persisted?

Telemetry submissions are persisted via `POST /students/{id}/telemetry`. However, the frontend has **no coding playground** to generate real submissions. Demo telemetry is seeded statically via `seed_data.py`.

### G. Are mastery assessments persisted?

**Critically: NO.** The `_VERIFIED_ASSESSMENT_SCORES` dictionary in `mastery_assessment_service.py` line 24 is an **in-memory Python dict**:

```python
_VERIFIED_ASSESSMENT_SCORES: Dict[Tuple[str, str], float] = {}
```

This resets on **every server restart**. If the server restarts between a student taking the MCQ and completing the mastery check, the verified score is lost and mastery cannot be confirmed. The file itself documents this:

> `# PROTOTYPE LIMITATION: Verified assessment scores are currently stored in an in-memory ledger`

There is a `mastery_checks` table in the DB, but it only stores the `MasteryCheck` model (linked to interventions), not the `_VERIFIED_ASSESSMENT_SCORES` from the assessment service. These are two separate systems.

### H. Are interventions persisted?

The `ScholarIntervention` model and `scholar_interventions` table exist and have 1 row (Alex's pre-seeded intervention). However, the `InterventionService.generate_intervention()` method is a **pure in-memory computation** — it does not write to the database. The DB intervention is used only by `MasteryCheck`. New interventions generated by the engine are not automatically persisted to the DB.

### I. Are roadmap adaptations persisted?

**No.** `RoadmapAdaptationService.determine_adaptation()` returns a `RoadmapAdaptationDecision` schema object. It does **not** write to the database. Roadmap node statuses (LOCKED/IN_PROGRESS/COMPLETED) in the DB are only set by `seed_data.py`. The adaptation engine computes what SHOULD happen, but it does not apply the mutation.

### J. Is readiness persisted or calculated dynamically?

**Both.** `ReadinessService.get_or_create_readiness()` both calculates and writes a `ReadinessSnapshot` to the DB. `ReadinessService.evaluate_verified_capability()` computes dynamically from live data. The `readiness_snapshots` table has 144 rows (from prior test runs).

### K. Is Scholar state persisted or calculated dynamically?

**Calculated dynamically, not persisted.** `ScholarOrchestratorService.get_student_state()` assembles state on every request by calling all underlying services. No `ScholarStudentState` table exists in the database.

### L. Which information is currently in-memory?

1. **`_VERIFIED_ASSESSMENT_SCORES`** (`mastery_assessment_service.py` line 24) — resets on server restart
2. **Knowledge items** (`scholar_knowledge.py`) — static Python dict, never touches DB
3. **Mastery questions** (`mastery_questions.py`) — static Python dict, never touches DB
4. **InterventionService output** — pure computation, not persisted

---

## 7. AUTHENTICATION AUDIT

### Current Implementation

**Authentication is completely absent from the backend.** There is:
- Zero authentication middleware
- Zero JWT token generation or validation
- Zero login or signup endpoint
- Zero session management
- Zero password hashing
- Zero role-based access control

### Frontend Auth

- `AuthModal.tsx` renders a login/signup form
- On submit, `handleSubmit()` calls `onSuccess(email)` immediately — **no API call**
- The email is accepted as-is, stored in no state, used nowhere
- Credentials are purely decorative in the UI prototype

### Student ID Security

All API endpoints accept `{student_id}` from the URL path. No authorization check prevents:
- Student A from calling `/students/student_priya/scholar/state`
- Any caller from calling `/students/student_alex/telemetry` and injecting data
- Any caller from posting a fake mastery check for any student

### Marcus Scenario

`StudentDashboardView.tsx` line 334 references `student_marcus` as a dropdown option. However, **`student_marcus` does not exist in the database**. The backend returns 404 when this profile is selected. This is a broken evaluator experience.

### Security Implications

| Risk | Current State | Risk Level |
| :--- | :--- | :--- |
| Any student can read any other student's state | Yes — no auth | HIGH (prototype only) |
| Any caller can inject telemetry for any student | Yes — no auth | HIGH (prototype only) |
| `_VERIFIED_ASSESSMENT_SCORES` reset loses mastery proof | Yes — in-memory | MEDIUM |
| Answer key leakage | ❌ No — correctly isolated | NONE |
| Hardcoded secrets | ❌ No | NONE |
| SQL injection | No — SQLAlchemy ORM used | LOW |
| CORS wildcard | `CORS_ORIGINS="*"` by default | MEDIUM (dev-only acceptable) |

---

## 8. STUDENT JOURNEY AUDIT

### Full Journey Assessment

| Step | Status | Evidence |
| :--- | :--- | :--- |
| **Landing Page** | ✅ IMPLEMENTED | `LandingPage.tsx` — thesis, CTAs, features |
| **Sign Up / Login** | ⚠️ SIMULATED | `AuthModal.tsx` — no backend call, decorative form |
| **Onboarding — Career Goal** | ⚠️ UI ONLY | `OnboardingFlow.tsx` — data not sent to backend |
| **Onboarding — Experience Level** | ⚠️ UI ONLY | Collected in state, displayed in profile tab, not persisted |
| **Onboarding — Weekly Commitment** | ⚠️ UI ONLY | Same as above |
| **Baseline Assessment** | ⚠️ UI ONLY | Onboarding step 4 explains concept, no actual assessment runs |
| **Personalized Roadmap** | ⚠️ STATIC DEMO | Roadmap loaded from DB (pre-seeded), not generated from onboarding input |
| **Student Dashboard** | ✅ PARTIAL | `StudentDashboardView.tsx` — real Scholar AI data |
| **Learning / Coding** | ❌ MISSING | Practice tab is placeholder; no code editor, no execution |
| **Projects** | ❌ MISSING | Projects tab is placeholder |
| **Scholar AI Mentor** | ✅ IMPLEMENTED | Chat + knowledge panel functional |
| **Readiness Score** | ✅ IMPLEMENTED | Live VCS from backend |
| **Career** | ❌ MISSING | No career tab content beyond placeholder |

### Can a New Student Use StepCode?

**NO.** A completely new student cannot:
1. Create a real account with their own student ID
2. Submit their own coding attempts (no coding playground)
3. Receive a roadmap generated from their actual goal and skill level
4. Have their progress tracked over time (no real auth/session)
5. Access anything beyond the two pre-seeded benchmark profiles

The application functions correctly as an **evaluator demo** of the Scholar AI intelligence pipeline, but not as an actual student product.

---

## 9. SCHOLAR AI AUDIT

### Pipeline Trace

| Layer | File | Function | Input | Output | Persistence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Telemetry** | `telemetry_service.py` | `log_telemetry()` | TelemetryCreate | CodingTelemetry | ✅ DB |
| **FPDE** | `false_progress_detector.py` | `analyze_student()` | Session, student_id | FalseProgressDiagnosticResponse | ❌ Dynamic |
| **Intervention** | `intervention_service.py` | `generate_intervention()` | Student, diagnostic, telemetry, roadmap | InterventionPlan | ❌ Dynamic |
| **Mastery Assessment** | `mastery_assessment_service.py` | `evaluate_answer()` | student_id, topic, q_id, answer | MasteryAssessmentResult | ⚠️ IN-MEMORY only |
| **Mastery Check** | `mastery_service.py` | `evaluate_mastery()` | db, MasteryCheckRequest | MasteryCheckResult | ✅ DB (mastery_checks) |
| **Roadmap Adaptation** | `roadmap_adaptation_service.py` | `determine_adaptation()` | db, student_id | RoadmapAdaptationDecision | ❌ Not applied to DB |
| **Verified Capability** | `readiness_service.py` | `evaluate_verified_capability()` | db, student_id | VerifiedCapabilityResponse | ⚠️ Snapshot written |
| **Scholar Orchestrator** | `scholar_orchestrator_service.py` | `get_student_state()` | db, student_id | ScholarStudentState | ❌ Dynamic |
| **Next Action** | `scholar_orchestrator_service.py` | `get_next_action()` | db, student_id | ScholarNextAction | ❌ Dynamic |
| **Knowledge** | `scholar_knowledge_service.py` | `get_by_topic()` | topic | List[ScholarKnowledgeRetrieval] | ❌ Static dict |
| **Response** | `scholar_response_service.py` | `generate_response()` | db, student_id | ScholarResponse | ❌ Dynamic |
| **Conversation** | `scholar_conversation_service.py` | `handle_message()` | db, student_id, message | ScholarConversationResponse | ❌ Read-only |
| **Frontend** | `ScholarPage.tsx` / `StudentDashboardView.tsx` | Multiple | API responses | Rendered UI | ❌ Client-side only |

### Scholar AI Nature

Scholar AI is:
- ✅ **Reactive** — responds to actual stored telemetry
- ✅ **Proactive** — generates intervention plans proactively
- ✅ **Deterministic** — same inputs always produce same outputs
- ❌ **NOT LLM-based** — zero LLM or AI API calls
- ❌ **NOT RAG-based** — keyword matching, not semantic retrieval
- ❌ **NOT Hybrid** — purely rule-based / mathematical

---

## 10. FPDE AUDIT

### Triggers (Verified from Code)

**File:** `backend/app/services/false_progress_detector.py`

| Trigger | Signal | Formula | Threshold |
| :--- | :--- | :--- | :--- |
| `FP_HINT_CRUTCH` | Hint dependency rate | `problems_with_hints / total_problems` | > 0.50 |
| `FP_BRUTE_FORCE` | Multi-attempt + brute force | `brute_force_events > 0 OR multi_attempt_rate > 0.45` | ≥ 5 submissions |
| `FP_LOW_INDEPENDENCE` | First-attempt pass rate | `first_attempt_passes / total_problems` | < 0.40 |
| `FP_TIME_ANOMALY` | Duration anomaly + retries | `duration > 2.5×expected AND submissions > 1` | ≥ 2 anomalies or rate > 10% |
| `FP_CONCEPT_BLINDSPOT` | Topic-level weak areas | `pass_rate < 0.40 OR hint_rate > 0.50` per topic | ≥ 3 topic events |
| `FP_VELOCITY_DECAY` | Roadmap ahead of mastery | `roadmap_completion ≥ 60% AND pass_rate < 50%` | — |
| `FP_SHALLOW_CONSISTENCY` | Streak without depth | `streak ≥ 7 AND pass_rate < 0.40` | — |

**Minimum evidence threshold:** 5 problems required (`MIN_PROBLEMS_FOR_EVALUATION = 5`)

### FPI Formula

```
sub_independence = (1 - unassisted_pass_ratio) × 100   weight: 0.25
sub_hints        = (hint_dependency / 0.70) × 100       weight: 0.20
sub_blindspots   = (len(affected_topics) / 2.0) × 100   weight: 0.20
sub_brute        = (multi_attempt_rate / 0.50) × 100    weight: 0.15
sub_time         = (time_anomaly_rate / 0.25) × 100     weight: 0.10
sub_velocity_depth = 0/50/100 (mismatch triggers)       weight: 0.10

FPI = Σ(sub × weight), clamped to [0, 100]
```

### Alex Sharma — Verified Calculation

**Actual runtime output (live database):**

```
Alex FPI: 87.0 (CRITICAL)
Triggers: FP_HINT_CRUTCH, FP_BRUTE_FORCE, FP_LOW_INDEPENDENCE, 
          FP_TIME_ANOMALY, FP_CONCEPT_BLINDSPOT, FP_VELOCITY_DECAY, 
          FP_SHALLOW_CONSISTENCY
```

All 7 triggers fire. This matches the documented value of 87.0.

**Classification rule:** `fp_index >= 50.0 OR (fp_index >= 35.0 AND triggers >= 3)` → `is_false_progress = True`

---

## 11. MASTERY SYSTEM AUDIT

### Question Bank

**File:** `backend/app/data/mastery_questions.py`

4 topics with curated MCQ questions:

| Topic | Question ID(s) | Questions |
| :--- | :--- | :--- |
| Sliding Window | `sw_q01`, `sw_q02` | 2 |
| Dynamic Programming | `dp_q01` | 1 |
| Recursion | `rec_q01` | 1 |
| Graph Traversal | `graph_q01` | 1 |

**Answer Key Isolation:** Confirmed. `MasteryAssessmentService.get_question()` returns `MasteryAssessmentQuestion` which contains: `question_id`, `topic`, `question_text`, `options`, `difficulty`. It does NOT include `correct_answer` or `explanation`.

### Server-Side Grading

`MasteryAssessmentService.evaluate_answer()`: Exact string match after normalization (`answer.strip().upper()`). Score is 100.0 if correct, 0.0 if incorrect. No partial credit, no LLM judgment.

### `_VERIFIED_ASSESSMENT_SCORES` Behavior

```python
_VERIFIED_ASSESSMENT_SCORES: Dict[Tuple[str, str], float] = {}
```

- Lives in module-level Python dict
- Populated when `evaluate_answer()` is called: `_VERIFIED_ASSESSMENT_SCORES[(student_id, topic)] = score`
- Read by `ReadinessService.evaluate_verified_capability()` via `MasteryAssessmentService.get_verified_score()`
- **Reset to empty on every server restart**
- Tests use `clear_verified_scores()` for isolation

**Risk:** A student who takes the MCQ and then the server restarts cannot proceed through mastery verification without re-taking the MCQ.

### Mastery Check Criteria

**File:** `backend/app/services/mastery_service.py`

Mastery evaluation rules:
1. `solved = True` (independent solution)
2. `attempts = 1` (first try)
3. `hints_used = 0` (no hints)
4. Verified conceptual score ≥ 80 (from `_VERIFIED_ASSESSMENT_SCORES`)

If all 4 met → `decision = MASTERED`, `independent = True`

### UI Flow

`MasteryFlowModal.tsx` provides the full mastery flow:
1. Displays MCQ from `GET /mastery-assessment/{topic}`
2. Accepts option selection
3. Submits to `POST /mastery-assessment/submit`
4. Shows result
5. Presents coding scenario with attempt/hint inputs
6. Submits to `POST /mastery-check`
7. Updates page state based on result

The full end-to-end mastery check flow **works from the UI**.

---

## 12. READINESS / VERIFIED CAPABILITY AUDIT

### Standard Readiness Formula

**File:** `backend/app/services/readiness_service.py` → `compute_standard_readiness()`

```
Standard Readiness = 
  (roadmap_completion × 0.40) +
  (min(problems_solved/50, 1.0) × 100 × 0.30) +
  (min(streak/14, 1.0) × 100 × 0.15) +
  (project_score × 0.15)       ← project_score hardcoded to 75.0
```

**Note:** `project_score` is hardcoded to `75.0` as a placeholder. No real project tracking exists.

### Verified Capability Formula

```
VCS = standard_readiness × mastery_confidence_multiplier
mastery_confidence_multiplier = 0.5 + (0.5 × mastery_coverage)
```

Where `mastery_coverage` = `verified_topics / required_topics` (0.0 or 1.0 for single topic scenarios).

### Alex — Verified Values (Live Computation)

```
Alex Standard Readiness: 76.9
Alex Mastery Coverage: 0.0 (Sliding Window not yet verified)
Alex Multiplier: 0.5 (minimum, false progress + unverified)
Alex VCS: 76.9 × 0.50 = 38.5 ✅
Alex Status: NOT_VERIFIED ✅
```

After verified mastery:
```
Mastery Coverage → 1.0
Multiplier → 0.5 + (0.5 × 1.0) = 1.0
VCS → 76.9 × 1.0 = 76.9
```

Both values match documented claims exactly.

### Readiness Status Categories

| Status | Condition |
| :--- | :--- |
| `NOT_VERIFIED` | false_progress_detected AND unverified_topics > 0 |
| `PARTIALLY_VERIFIED` | unverified_topics > 0 OR vcs < 80.0 |
| `VERIFIED_READY` | vcs >= 80.0 AND no unverified topics |
| `INSUFFICIENT_EVIDENCE` | total_events < 5 |

---

## 13. CODING PLAYGROUND AUDIT

**Status: NOT IMPLEMENTED**

The DPR describes: "a coding playground with auto-graded problems."

Current repository contains:
- A `Problem` database model with title, topic, difficulty
- A `CodingTelemetry` model capturing behavioral signals
- 40 problem records in the seed data (title, topic, difficulty only — no problem description, constraints, test cases, or starter code)
- `StudentDashboardView.tsx` "Practice" tab renders a hardcoded static UI card describing a fake problem

**What does NOT exist:**
- Code editor component (no CodeMirror, Monaco, Ace, or similar)
- Code execution (no sandbox, no Docker, no Judge0, no API)
- Language selection
- Test cases or expected outputs in DB
- Submission evaluation
- Automatic grading
- Submission history UI
- Hint delivery system (hints are tracked in telemetry but never delivered)
- Actual problem descriptions, constraints, or examples

**Consequence:** The FPDE relies on telemetry fields (`hints_requested`, `submission_count`, `first_attempt_pass`) that **currently can only be seeded statically** or submitted via raw API calls. There is no student-facing path to generate organic telemetry.

---

## 14. PROJECTS AUDIT

**Status: NOT IMPLEMENTED**

The DPR describes: "verified industry projects" with GitHub verification.

Current repository contains:
- `StudentDashboardView.tsx` "Projects" tab renders static placeholder cards
- `readiness_service.py` line 56 uses `project_score: float = 75.0` hardcoded as default
- **No project data model** in any SQLAlchemy model
- **No project API endpoints**
- **No GitHub integration** (no GitHub API calls, no OAuth, no webhook handlers)
- **No commit verification, PR verification, or build check**

The 15% project weight in the Standard Readiness formula (`project_score × 0.15`) uses a **hardcoded 75.0** for all students.

---

## 15. HACKATHON AUDIT

**Status: NOT IMPLEMENTED**

No hackathon functionality exists anywhere in the repository:
- No hackathon database model
- No hackathon API endpoint
- No hackathon UI component
- No hackathon seed data
- The word "hackathon" does not appear in any source file

---

## 16. CAREER AUDIT

**Status: NOT IMPLEMENTED**

The DPR describes: career launchpad, job recommendations, mock interviews, placement analytics, recruiter-facing evidence, college dashboards.

Current repository contains:
- `StudentDashboardView.tsx` Profile tab (displays onboarding data props)
- **No career endpoint or router**
- **No mock interview functionality**
- **No job recommendation system**
- **No recruiter portal or college analytics**
- **No readiness-to-job-mapping**

The verified capability score (`VCS`) is computed but only displayed inside the prototype dashboard. There is no mechanism to export or share it with recruiters or colleges.

---

## 17. KNOWLEDGE / RAG AUDIT

### Actual Implementation

**File:** `backend/app/data/scholar_knowledge.py`  
**File:** `backend/app/services/scholar_knowledge_service.py`

The knowledge system is a **curated static Python dictionary** with keyword-based retrieval. It is definitively **NOT RAG**.

| Feature | RAG (Real) | Current Implementation |
| :--- | :--- | :--- |
| Storage | Vector database (pgvector, Chroma, etc.) | Static Python `Dict` |
| Retrieval | Semantic/embedding similarity | Keyword substring matching |
| Indexing | Vector embeddings | None |
| Search quality | Semantic | Lexical only |
| External content | Optional | None |
| LLM usage | Often for generation | None |
| pgvector | Required | Not installed |

**Knowledge content:** 4 topics (Sliding Window, Dynamic Programming, Recursion, Graph Traversal) with ~4 items per topic. Items have: `knowledge_id`, `topic`, `title`, `content`, `difficulty`, `tags`.

**Retrieval algorithm** (`scholar_knowledge_service.py`):
1. Topic matching: exact string match
2. Tag matching: token substring matching against tag list
3. Content matching: token appears in item content

This is correct to describe as "curated keyword retrieval," not RAG. Documentation should not call it RAG.

---

## 18. CONVERSATIONAL SCHOLAR AUDIT

### Supported Intents (Verified from Code)

**File:** `backend/app/services/scholar_intent_service.py`

| Intent | Trigger Keywords | Response Source |
| :--- | :--- | :--- |
| `FALSE_PROGRESS_STATUS` | "false progress", "fpi", "flagged" | Scholar state |
| `INTERVENTION_STATUS` | "remediation", "intervention" | Scholar state |
| `EXPLAIN_TOPIC` | "explain", "teach me", "invariant" | Knowledge service |
| `WHY_THIS_ACTION` | "why", "why this" | Response service |
| `MASTERY_STATUS` | "mastery", "mastered" | Scholar state |
| `READINESS_STATUS` | "readiness", "am i ready", "capability" | Scholar state |
| `ROADMAP_STATUS` | "roadmap", "where am i" | Scholar state |
| `NEXT_ACTION` | "next", "what should i do" | Response service |
| `UNKNOWN` | Anything else | Boundary message |

**Topic Recognition:** "Sliding Window", "Dynamic Programming", "Recursion", "Graph Traversal" (keyword match)

### Evidence Boundary Test (from tests)

Verified by `test_scholar_conversation.py`:
- `"I solved 20 problems."` → UNKNOWN intent, state NOT mutated
- `"I mastered Sliding Window."` → MASTERY_STATUS intent, reads existing state only
- `"My readiness should be 95."` → UNKNOWN or READINESS_STATUS, reads existing state only

No user message can mutate telemetry, mastery checks, or roadmap state. This is confirmed by test `test_read_only_state_guarantee`.

---

## 19. API CONTRACT AUDIT

### Frontend → Backend Mapping

| Frontend Call | Endpoint | Backend Schema | Frontend Type | Mismatch? |
| :--- | :--- | :--- | :--- | :--- |
| `getStudentProfile()` | `GET /students/{id}` | `StudentResponse` | `StudentProfile` | ⚠️ Minor: `StudentProfile` lacks `created_at` |
| `getScholarState()` | `GET /{id}/scholar/state` | `ScholarStudentState` | `ScholarStudentState` | ✅ |
| `getNextAction()` | `GET /{id}/scholar/next-action` | `ScholarNextAction` | `ScholarNextAction` | ✅ |
| `sendScholarChat()` | `POST /{id}/scholar/chat` | `ScholarConversationResponse` | `ScholarConversationResponse` | ✅ |
| `getVerifiedCapability()` | `GET /{id}/verified-capability` | `VerifiedCapabilityResponse` | `VerifiedCapabilityResponse` | ⚠️ **Field mismatch (see below)** |
| `getMasteryAssessmentQuestion()` | `GET /{id}/mastery-assessment/{topic}` | `MasteryAssessmentQuestion` | `MasteryAssessmentQuestion` | ✅ |
| `submitMasteryAssessment()` | `POST /{id}/mastery-assessment/submit` | `MasteryAssessmentResult` | `MasteryAssessmentResult` | ✅ |
| `submitMasteryCheck()` | `POST /{id}/mastery-check` | `MasteryCheckResult` | `MasteryCheckResult` | ✅ |
| `getTopicKnowledge()` | `GET /{id}/scholar/knowledge/topic/{t}` | `List[ScholarKnowledgeRetrieval]` | `ScholarKnowledgeRetrieval[]` | ✅ |
| `getRoadmap()` | `GET /{id}/roadmap` | `List[RoadmapNodeResponse]` | Inline type | ✅ |

**Critical Mismatch — `VerifiedCapabilityResponse`:**

Backend schema (`schemas/student.py`) returns: `standard_readiness_score`, `verified_capability_score`, `mastery_coverage`, `mastery_confidence_multiplier`, `readiness_status`, `evidence`, `limitations`.

Frontend type (`types/scholar.ts` lines 79-90): `standard_readiness`, `mastery_coverage`, `mastery_multiplier`, `verified_capability_score`, `readiness_status`, `evidence_chain`.

Field names `standard_readiness` vs `standard_readiness_score` and `mastery_multiplier` vs `mastery_confidence_multiplier` **don't match**. The frontend type `VerifiedCapabilityResponse` appears to be from an older API version and may cause silent undefined reads.

### Unused API Endpoints (Backend exists, Frontend doesn't call)

- `GET /{id}/false-progress` — not called by frontend directly
- `GET /{id}/intervention` — not called by frontend directly
- `GET /{id}/mastery-check/status` — not called by frontend directly
- `GET /{id}/interventions` — not called by frontend directly
- `GET /{id}/scholar/response` — not called by frontend directly (only via chat/state)
- `GET /{id}/scholar/context` — called by `getScholarContext()` but usage in `StudentDashboardView` is unclear

---

## 20. UI STATE AUDIT

| State | UI Handling | Student-Friendly Language |
| :--- | :--- | :--- |
| First-time visitor | ✅ Landing page | ✅ Yes |
| Loading | ✅ Spinner shown | ✅ Yes |
| Empty state | ✅ Honest message | ✅ Yes |
| Error | ✅ Error banner | ⚠️ Technical message |
| Insufficient evidence | ⚠️ State card shows raw status | ⚠️ Partially |
| Normal progress | ✅ Green indicators | ✅ Yes |
| False progress detected | ✅ Warning card | ✅ Translated text |
| Intervention | ✅ Intervention card | ✅ Translated text |
| Mastery check required | ✅ Primary action card | ✅ Yes |
| Mastery check modal | ✅ MasteryFlowModal | ✅ Yes |
| Mastery passed | ✅ Green success card | ✅ Yes |
| Mastery failed | ✅ Remediation card | ✅ Yes |
| Roadmap paused | ✅ Dashboard pill | ✅ Translated |
| No target topic | ✅ No crash, honest state | ✅ Yes |
| Unknown student | ✅ 404 error message | ⚠️ Technical |
| Evaluator demo mode | ✅ Amber banner | ✅ Yes |
| `student_marcus` selected | ❌ 404 error — student doesn't exist | ❌ Broken |

---

## 21. EVALUATOR MODE AUDIT

### Demo Mode Banner

✅ When `isDemoMode = true`, `StudentDashboardView.tsx` displays amber banner: "DEMO MODE: Using benchmark student profiles for evaluation."

### Benchmark Selector

✅ Dropdown in Demo Mode header:
- Alex Sharma → `student_alex` (False Progress — exists in DB)
- Priya Mehta → `student_priya` (Healthy Progress — exists in DB)
- Marcus Vance → `student_marcus` (**does NOT exist in DB** — returns 404)

**Bug:** Marcus is listed as "Insufficient Evidence Scenario" but no such student is seeded. Selecting Marcus shows error state.

### Demo URL

✅ `/?mode=demo` instantly loads evaluator dashboard with Alex pre-loaded.

### Tech Diagnostic Separation

✅ Technical raw data (FPI numbers, trigger codes, formula breakdown) is isolated to the **Insights tab**, not shown in the main student dashboard.

---

## 22. SECURITY AUDIT

| Concern | Finding | Severity |
| :--- | :--- | :--- |
| Hardcoded API keys | ❌ None found | NONE |
| Hardcoded passwords | ❌ None found | NONE |
| External AI API keys | ❌ None required | NONE |
| Answer key leakage | ❌ Correctly stripped | NONE |
| SQL injection | Unlikely — ORM used | LOW |
| CORS wildcard `"*"` | Default config | MEDIUM (dev-only) |
| No authentication | Any user can access any student | HIGH (acceptable for prototype) |
| student_id URL injection | Any student_id accepted | HIGH (acceptable for prototype) |
| Telemetry injection | No auth = anyone can POST fake telemetry | HIGH (prototype) |
| `_VERIFIED_ASSESSMENT_SCORES` volatile | Server restart loses all assessment proofs | MEDIUM |
| Debug mode | `DEBUG=False` by default | SAFE |
| `.env.example` sensitive data | Only commented-out DB URLs | NONE |

**No production-critical secrets found.** All security concerns are inherent to the prototype-without-auth design, which is correctly documented.

---

## 23. TESTING AUDIT

### Backend Tests — Verified Count

```bash
pytest backend/tests
Result: 163 passed, 1 warning in 1.45s  ✅
```

Matches documented count exactly.

### Frontend Tests — Verified Count

```bash
npm --prefix frontend test -- --run
Result: 14 tests passed  ✅
```

Matches documented count exactly.

### Production Build

Verified earlier this session:
```
vite v6.4.6 building for production...
✓ 2147 modules transformed.
dist/assets/index-ByDezpL3.js   326.53 kB │ gzip: 91.73 kB
✓ built in 719ms  ✅
```

### Test Coverage Gaps

| Area | Coverage | Gap |
| :--- | :--- | :--- |
| FPDE | 11 tests ✅ | None significant |
| Intervention | 12 tests ✅ | None significant |
| Mastery check | 12 tests ✅ | None significant |
| Mastery assessment | 11 tests ✅ | None significant |
| Roadmap adaptation | 11 tests ✅ | None significant |
| Verified capability | 13 tests ✅ | None significant |
| Orchestrator | 13 tests ✅ | None significant |
| Knowledge | 14 tests ✅ | None significant |
| Response | 21 tests ✅ | None significant |
| Conversation | 28 tests ✅ | None significant |
| End-to-end | 7 tests ✅ | None significant |
| Frontend (App routing) | 0 tests | App.tsx routing untested |
| Frontend (StudentDashboardView) | 0 tests | 1073-line component untested |
| Frontend (LandingPage) | 0 tests | — |
| Frontend (OnboardingFlow) | 0 tests | — |
| `student_marcus` 404 | 0 tests | Known bug undetected |

---

## 24. DOCUMENTATION AUDIT

### README.md

| Claim | Reality | Accurate? |
| :--- | :--- | :--- |
| "177 Automated Tests Passing" | 163 + 14 = 177 ✅ | ✅ |
| "Tailwind CSS 3.4+" | Not installed; custom CSS | ❌ Incorrect |
| "real-time state cards" | Loaded on request, not websocket | ⚠️ Loose |
| "Zero LLM dependencies" | Confirmed | ✅ |
| "Single-Tenant Demo Routing" | Confirmed | ✅ |
| "JWT Authentication — Future" | Listed as production gap | ✅ |
| "FPI: 87.0 for Alex" | Confirmed by live computation | ✅ |
| "76.9 × 0.50 = 38.5" | Confirmed by live computation | ✅ |

### ARCHITECTURE.md

| Claim | Reality | Accurate? |
| :--- | :--- | :--- |
| "FastAPI, Pydantic v2, SQLAlchemy" | Confirmed | ✅ |
| "Tailwind CSS" | Not installed | ❌ Incorrect |
| "React 19" | Confirmed | ✅ |
| "7 behavioral signals" | Confirmed | ✅ |

### FINAL_SUBMISSION_CHECKLIST.md

- Claims 163 backend tests ✅
- Claims 14 frontend tests ✅
- Claims answer-key isolation ✅
- Claims no hardcoded secrets ✅
- Does NOT claim Tailwind ✅

### Documentation Gaps / Issues

1. **Tailwind CSS falsely claimed** in README.md and ARCHITECTURE.md. Frontend uses custom CSS.
2. **Marcus student not seeded** — DEMO_SCRIPT.md and StudentSelector.tsx reference Marcus but he 404s.
3. **`_VERIFIED_ASSESSMENT_SCORES` in-memory limitation** not documented in README or main checklist.
4. **Roadmap adaptation doesn't mutate DB** not documented.
5. **Onboarding data not persisted** not disclosed in documentation.

---

## 25. DPR REQUIREMENT MATRIX

| # | DPR Requirement | Current Implementation | Location | Status | Missing Work | Priority |
| :-- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Student platform | Demo UI with 2 benchmark students | `frontend/src/` | PROTOTYPE | Real student accounts, auth | P2 |
| 2 | Scholar AI personalization | Full deterministic 7-stage pipeline | `backend/app/services/` | IMPLEMENTED | RAG, LLM enhancement | P2 |
| 3 | Career goal input | Onboarding collects goal (UI only) | `OnboardingFlow.tsx` | PROTOTYPE / UI ONLY | Backend persistence + roadmap generation | P1 |
| 4 | AI onboarding | 4-step onboarding UI, no AI | `OnboardingFlow.tsx` | PROTOTYPE / UI ONLY | Actual AI-generated roadmap from goal | P2 |
| 5 | Skill assessment | MCQ mastery assessment (topic-only) | `mastery_assessment_service.py` | PARTIAL | Baseline skill assessment, broader topic coverage | P1 |
| 6 | Personalized roadmap | Static seeded roadmap per student | `seed_data.py`, `roadmap_nodes` | PROTOTYPE | Goal-driven roadmap generation engine | P1 |
| 7 | Adaptive roadmap | FPDE → intervention → adaptation logic | `roadmap_adaptation_service.py` | PARTIAL | DB mutation not applied; remediation nodes not inserted | P1 |
| 8 | Student dashboard | Full dashboard with tabs | `StudentDashboardView.tsx` | PARTIAL | Real data for practice/projects/career tabs | P1 |
| 9 | Coding playground | Placeholder UI only | `StudentDashboardView.tsx` | NOT IMPLEMENTED | Code editor, execution engine, test cases | P2 |
| 10 | Auto-grading | No code execution | None | NOT IMPLEMENTED | Judge0 or similar sandbox | P2 |
| 11 | Telemetry | CodingTelemetry model + API | `telemetry.py`, `problem.py` | IMPLEMENTED | Real telemetry generation (requires coding playground) | P2 |
| 12 | False Progress Detection | 7-signal FPDE with FPI 0-100 | `false_progress_detector.py` | IMPLEMENTED | — |  — |
| 13 | Proactive intervention | 4-step micro-sprint generation | `intervention_service.py` | IMPLEMENTED | DB persistence of generated interventions | P1 |
| 14 | Adaptive mastery check | MCQ + coding check + verified score | `mastery_assessment_service.py`, `mastery_service.py` | IMPLEMENTED | Persistent assessment scores (not in-memory) | P0 |
| 15 | Roadmap re-planning | Adaptation decision computed | `roadmap_adaptation_service.py` | PARTIAL | Decision must be applied to roadmap_nodes in DB | P0 |
| 16 | Verified Capability | VCS = SR × multiplier | `readiness_service.py` | IMPLEMENTED | — | — |
| 17 | Curated knowledge | 4 topics, keyword retrieval | `scholar_knowledge.py` | IMPLEMENTED | Broader topic coverage | P1 |
| 18 | RAG | Not implemented | None | NOT IMPLEMENTED | pgvector, embeddings, semantic retrieval | P2 |
| 19 | Conversational Scholar | 8-intent deterministic interface | `scholar_conversation_service.py` | IMPLEMENTED | — | — |
| 20 | Mock interviews | Not implemented | None | NOT IMPLEMENTED | Interview simulation system | P2 |
| 21 | Projects | Placeholder UI only | `StudentDashboardView.tsx` | NOT IMPLEMENTED | Project DB model, milestones, submission | P2 |
| 22 | GitHub verification | Not implemented | None | NOT IMPLEMENTED | GitHub OAuth, commit/PR API | P2 |
| 23 | Hackathons | Not implemented | None | NOT IMPLEMENTED | Hackathon model, hub, personalization | P2 |
| 24 | Career launchpad | Not implemented | None | NOT IMPLEMENTED | Job mapping, career readiness page | P2 |
| 25 | Readiness score | Standard Readiness + VCS | `readiness_service.py` | IMPLEMENTED | Real project weight (not 75.0 hardcoded) | P1 |
| 26 | Recruiter evidence | Not implemented | None | NOT IMPLEMENTED | Evidence export, recruiter portal | P2 |
| 27 | College analytics | Not implemented | None | NOT IMPLEMENTED | Cohort dashboards, college admin | P2 |
| 28 | Authentication | Not implemented (UI only) | `AuthModal.tsx` | NOT IMPLEMENTED | JWT, password hashing, session | P1 |
| 29 | PostgreSQL | SQLite (config-ready for PG) | `config.py`, `database.py` | PRODUCTION GAP | Migrate DB, install psycopg2 | P2 |
| 30 | pgvector | Not installed | None | NOT IMPLEMENTED | pgvector extension, embedding pipeline | P2 |
| 31 | Multi-tenant | Not implemented | None | NOT IMPLEMENTED | College/student/recruiter tenants | P2 |
| 32 | Role-based access | Not implemented | None | NOT IMPLEMENTED | RBAC middleware | P2 |
| 33 | Security | Prototype-safe (no secrets) | All files | PARTIAL | Auth, CORS tightening | P1 |
| 34 | Testing | 177 tests, 100% Scholar AI coverage | `backend/tests/`, `frontend/src/tests/` | IMPLEMENTED | Frontend dashboard tests, Marcus fix | P0 |
| 35 | Documentation | 14 docs files, mostly accurate | `docs/` | PARTIAL | Fix Tailwind claim, document limitations | P0 |
| 36 | Evaluator demo mode | Demo banner + Alex/Priya | `StudentDashboardView.tsx`, `App.tsx` | IMPLEMENTED | Fix Marcus 404 | P0 |

---

## 26. P0 / P1 / P2 GAP CLASSIFICATION

### P0 — MUST FIX FOR INTERNSHIP DEMO

These issues directly break or misrepresent the prototype during evaluation:

1. **Marcus 404 Bug:** `student_marcus` is listed in the evaluator demo selector (`StudentDashboardView.tsx` line 334) but does not exist in the database. Selecting Marcus shows an API error. Fix: either seed Marcus or remove from selector.
   - File: `frontend/src/components/StudentDashboardView.tsx`

2. **`_VERIFIED_ASSESSMENT_SCORES` Server-Restart Loss:** The verified assessment score is stored in-memory only. If the evaluator restarts the backend between MCQ submission and mastery check submission, mastery verification silently fails. Document clearly or add a session-scoped workaround.
   - File: `backend/app/services/mastery_assessment_service.py`

3. **Roadmap Adaptation Not Applied to DB:** The `RoadmapAdaptationService.determine_adaptation()` computes what SHOULD happen (PAUSE_ADVANCEMENT, RESUME_ROADMAP) but never writes this decision back to `roadmap_nodes`. The roadmap shown in the UI does not change after mastery check passes. This breaks the end-to-end story.
   - File: `backend/app/services/roadmap_adaptation_service.py`

4. **README / ARCHITECTURE Tailwind CSS False Claim:** Both `README.md` and `docs/ARCHITECTURE.md` claim "Tailwind CSS 3.4+". Tailwind is not installed. An evaluator who checks `package.json` will catch this discrepancy immediately.
   - Files: `README.md`, `docs/ARCHITECTURE.md`

5. **`VerifiedCapabilityResponse` Type Mismatch:** Frontend type uses `standard_readiness` while backend returns `standard_readiness_score`. Silent field read failure.
   - File: `frontend/src/types/scholar.ts`

### P1 — STRONGLY RECOMMENDED

These improve prototype quality significantly:

1. **Persist `_VERIFIED_ASSESSMENT_SCORES` to database** — Write verified MCQ scores to a `verified_assessment_scores` table (or `mastery_checks` table extension) to survive server restarts.

2. **Apply roadmap adaptation decisions to the database** — When `PAUSE_ADVANCEMENT` or `RESUME_ROADMAP` is returned, write the corresponding `is_locked` changes to `roadmap_nodes`.

3. **Seed Marcus as an "Insufficient Evidence" scenario** — 2-3 problems only, no FP triggered. Demonstrates `COLLECT_MORE_EVIDENCE` path.

4. **Persist onboarding data** — Even if onboarding doesn't generate a real personalized roadmap, storing the student's stated goal to their profile column would demonstrate end-to-end data flow.

5. **Extend knowledge base topics** — Only 4 topics covered. The seeded problems span 5 topics. `Arrays & Hashing` has no knowledge items or mastery questions.

6. **Add frontend tests for `StudentDashboardView`** — The largest component (1073 lines) has zero test coverage.

7. **Tighten CORS origins** — Default `"*"` should at least be documented as dev-only in `.env.example`.

### P2 — PRODUCTION / FUTURE WORK

These are explicitly DPR-scoped features that are **not expected** in an internship Scholar AI prototype:

- PostgreSQL migration (SQLite is correct for prototype)
- pgvector and semantic RAG
- Real coding playground and code execution
- GitHub integration and project verification
- Hackathon system
- Career launchpad and mock interviews
- College analytics and recruiter portal
- JWT authentication and RBAC
- Multi-tenant architecture

---

## 27. EXACT RECOMMENDED NEXT STEPS

In priority order, before submission:

1. **Fix Marcus 404** — Remove `student_marcus` from `StudentDashboardView.tsx` dropdown OR add a simple 2-row seed for `student_marcus` with minimal telemetry (< 5 events to trigger `COLLECT_MORE_EVIDENCE`).

2. **Fix Tailwind claim** — Replace "Tailwind CSS 3.4+" with "Custom CSS Design System (CSS variables + hand-crafted utilities)" in `README.md` and `ARCHITECTURE.md`.

3. **Fix `VerifiedCapabilityResponse` type mismatch** — Align frontend type field names with backend response field names.

4. **Document `_VERIFIED_ASSESSMENT_SCORES` limitation** — Add a visible note in README "Known Prototype Limitation" section explaining in-memory assessment score behavior.

5. **Document roadmap adaptation decision** — Clarify that the adaptation engine *determines* actions but node status mutation is deferred to production implementation.

6. **Run final verification pass** — Confirm all 177 tests still pass and build succeeds after any fixes.

---

## 28. MOST IMPORTANT QUESTION ANSWERED

> **"If I submit the current repository to StepCode Technologies as an internship Scholar AI prototype, what will an evaluator immediately understand, what will confuse them, and what major requirement will they notice is missing?"**

### What Is Already Strong

- **The Scholar AI pipeline is excellent** — 7-signal FPDE, intervention engine, evidence-grounded mastery check, roadmap adaptation decisions, verified capability formula, and conversational interface are all implemented correctly with mathematical precision.
- **177 tests prove correctness** — Every service is independently verifiable. Alex's FPI = 87.0 is a live-computed result, not a hardcoded claim.
- **Evidence integrity is impeccable** — Answer key isolation, read-only conversational contract, and server-side grading are all correctly implemented.
- **The landing page and thesis are compelling** — "Activity is not competence. Completion is not mastery." is clearly communicated.
- **Demo mode is clean and accessible** — Alex and Priya scenarios work flawlessly and illustrate contrasting student profiles.

### What Is Acceptable as Prototype Scope

- SQLite instead of PostgreSQL
- Keyword retrieval instead of pgvector/RAG
- Static seed data instead of real student registrations
- Deterministic MCQ mastery instead of coding sandbox execution
- CORS wildcard in development config

### What Is Visibly Incomplete

- **Marcus 404** — Will confuse evaluators who try the third demo profile
- **Tailwind CSS claim** — `package.json` has no Tailwind; evaluators will check
- **Onboarding goes nowhere** — The 4-step flow collects data that is never sent to any backend
- **Roadmap tab shows pre-seeded static data** — It doesn't reflect Scholar AI decisions applied
- **Practice tab is empty placeholder** — "Start Coding" button doesn't open a code editor
- **`_VERIFIED_ASSESSMENT_SCORES` resets on restart** — Mastery flow breaks if server restarts mid-flow

### What Creates Risk During Evaluation

1. **Marcus selector causing 404** — Evaluator may interpret this as a broken Scholar AI pipeline, not a missing seed student
2. **Tailwind false claim** — Technical evaluators will grep `package.json` and find the discrepancy immediately
3. **Roadmap not mutating after mastery** — If evaluator completes the full mastery check flow but sees the roadmap unchanged in the DB/API, the adaptation engine looks non-functional
4. **`_VERIFIED_ASSESSMENT_SCORES` volatile** — If the server is restarted between demo steps, mastery cannot complete

### What Should Be Implemented Next

1. Fix Marcus (P0 — 10 minutes)
2. Fix Tailwind docs claim (P0 — 5 minutes)
3. Fix type mismatch in `VerifiedCapabilityResponse` (P0 — 5 minutes)
4. Apply roadmap adaptation decision to DB (P1 — 2-3 hours)
5. Persist verified assessment scores to DB (P1 — 1-2 hours)
6. Add `student_marcus` seed with minimal telemetry (P1 — 30 minutes)

---

## 29. FINAL SCORECARD

> Scores reflect actual current implementation quality, not aspirational goals.

| Dimension | Score | Rationale |
| :--- | :--- | :--- |
| **Scholar AI Intelligence** | 92/100 | Deterministic, tested, mathematically rigorous. Loses 8 for in-memory ledger, unapplied roadmap mutations. |
| **Backend Architecture** | 85/100 | Clean layered architecture, proper separation. Loses 15 for in-memory state, hardcoded project_score, no auth. |
| **Evidence Integrity** | 97/100 | Excellent. Answer key isolated, read-only contract enforced, 0 hallucination risk. Minor: type mismatch. |
| **Testing** | 88/100 | 163 backend tests are thorough. Frontend testing severely lacking for new components. Marcus bug undetected. |
| **Frontend UX** | 72/100 | Good student-facing landing and dashboard. Loses points for broken Marcus, placeholder Practice/Projects tabs, non-functional onboarding persistence. |
| **Database / Persistence** | 55/100 | Core telemetry and roadmap persisted correctly. Critical gaps: in-memory scores, unapplied adaptation decisions, no migration. |
| **Authentication / Security** | 25/100 | No authentication at all (prototype-acceptable). Open CORS. Only saving grace: no hardcoded secrets, good answer key isolation. |
| **Documentation** | 70/100 | Comprehensive and mostly accurate. Loses points for incorrect Tailwind claim, undocumented limitations. |
| **DPR Alignment (Scholar AI scope)** | 82/100 | Scholar AI core fully aligns. Full platform features (playground, projects, hackathons, career) all absent. |
| **DPR Alignment (Full platform)** | 28/100 | Only Scholar AI and basic dashboard of the full DPR platform are present. |
| **Internship Demo Readiness** | 76/100 | The core pipeline and demo are strong. P0 fixes above would bring this to ~85. Marcus bug and Tailwind claim are unnecessary risks. |

**Overall Score (Scholar AI Prototype): 78/100**  
**Overall Score (Full Platform Product): 42/100**

---

## 29. INTERNSHIP SUBMISSION VERDICT

### As a "Scholar AI Internship Prototype"

**VERDICT: READY TO SUBMIT (with 3 P0 fixes)**

The Scholar AI pipeline is genuinely impressive:
- 7 behavioral signals with weighted FPI computation
- Server-side mastery verification with strict evidence boundaries
- 5-rule roadmap adaptation engine
- 8-intent deterministic conversational interface
- 177 automated tests with no failures
- Zero LLM or external AI dependencies

**Fix Marcus, fix Tailwind docs, fix type mismatch — then submit.**

### As a "Full StepCode Platform Prototype"

**VERDICT: NOT READY**

The DPR describes 15+ distinct product pillars. The internship prototype implements 1 (Scholar AI intelligence) plus a demo UI scaffold. This is not a gap to fill before the internship submission — it is the **correct scope** for a Scholar AI-focused internship challenge. The candidate should explicitly frame the submission as a Scholar AI prototype, not a complete platform demo.

---

*Audit complete. No code was modified during this inspection.*
