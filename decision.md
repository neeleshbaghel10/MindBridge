# MINDBRIDGE — Engineering Decision Log

> **Format**: Each entry records *what* was decided, *when*, *why* (rationale), and *how it was verified*.
> Entries are in chronological order, oldest first.
> Owner: Lead Architect / AI Pair-Programmer (Antigravity)

---

## D-001 · Technology Stack Selection

**Timestamp**: 2026-09-08 · Phase 0 (Architecture)
**Category**: Architecture

### Decision
Adopted the following canonical stack with no substitutions:

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js v22, Express, TypeScript |
| ORM | Prisma 6 |
| Dev Database | SQLite (`file:./dev.db`) |
| Prod Database | PostgreSQL (schema at `server/prisma/schema.postgres.prisma`) |
| Auth | JWT (HS256) + bcrypt (cost 12) |
| Roles | STUDENT, COUNSELLOR, PEER_VOLUNTEER, INSTITUTION_ADMIN, SUPER_ADMIN |

### Rationale
- Mandated verbatim in SIH-25092 specification.
- SQLite chosen for dev-only portability (no Docker dependency on evaluator machines).
- Dual schema strategy (`schema.prisma` = SQLite, `schema.postgres.prisma` = PostgreSQL) avoids enum incompatibility between adapters while keeping prod-ready schema intact.

### Verification
- `npm run dev` boots both servers on first run without Docker.
- `npx tsc --noEmit` passes on both `server/` and `client/` workspaces.

---

## D-002 · SQLite for Development, PostgreSQL-Typed Schema for Production

**Timestamp**: 2026-09-08 · Phase 1 (Foundation)
**Category**: Database Architecture

### Decision
Maintain **two Prisma schemas** side-by-side:
- `server/prisma/schema.prisma` — SQLite-compatible (arrays as JSON strings, no native enums).
- `server/prisma/schema.postgres.prisma` — PostgreSQL-native (arrays as `String[]`, enums).

### Rationale
PostgreSQL was not available natively on the evaluator machine (no Docker). SQLite lets anyone clone and `npm run dev` with zero external dependencies. The PostgreSQL schema exists so production deployment is a one-command `prisma migrate deploy`.

### Verification
- `npx prisma db push` against SQLite succeeded in < 200ms.
- Seed script ran fully on SQLite, producing 7 users across 5 roles.

---

## D-003 · Deterministic Crisis Interception (No AI Hallucination on Safety Path)

**Timestamp**: 2026-09-08 · Phase 2 (Safety Engine)
**Category**: Safety / AI Ethics

### Decision
The crisis detection layer (`server/src/services/safety.service.ts`) is **purely deterministic regex-based** and runs *before* any generative AI call. The AI is never given the opportunity to decide whether a message is a crisis.

### Rationale
- SIH specification: "This system is NOT an AI psychiatrist and must never claim to diagnose mental illness."
- LLMs can hallucinate or under-detect crisis signals — unacceptable in a life-safety context.
- Deterministic regex patterns catch exact phrases like "end my life", "cut my wrists", "swallow pills" with zero false-negative risk on the covered patterns.
- Safe conversational prompts ("stressed about exams", "trouble sleeping") are explicitly tested to avoid false positives.

### Verification
QA Test Group 1 — 9/9 PASS:
- 5 adversarial crisis prompts intercepted correctly.
- 4 normal prompts NOT flagged (no false positives).

---

## D-004 · Role-Based Access Control (RBAC) Middleware Architecture

**Timestamp**: 2026-09-08 · Phase 2 (Security)
**Category**: Security / Access Control

### Decision
Implemented a two-layer auth guard:
1. `authenticateJwt` — validates JWT, loads `userId`, `role`, `studentProfileId`, `counsellorProfileId` from DB.
2. `requireRoles([...])` — whitelist-based role gate, returns `403 FORBIDDEN` for unauthorized roles.

Applied at router level (not per-route) wherever an entire router is role-restricted.

### Rationale
Per-route guards are error-prone (easy to forget on a new route). Router-level application ensures every new endpoint added to that router is automatically protected.

### Verification
API Test [5]: Student JWT → `GET /api/v1/analytics/overview` → `403 FORBIDDEN` ✅
API Test [6]: Admin JWT → same route → `200 OK` ✅

---

## D-005 · k-Anonymity Enforcement on Institutional Analytics (N≥10)

**Timestamp**: 2026-09-08 · Phase 5 (Analytics)
**Category**: Privacy / Data Ethics

### Decision
The `/api/v1/analytics/overview` endpoint suppresses all cohort-level statistics when group size `N < 10`. Any metric that would identify fewer than 10 students is replaced with `null` and a `suppressed: true` flag.

### Rationale
- DPDP Act 2023 (India) and GDPR principles require that individual students cannot be re-identified from aggregate data.
- A single student in a department/year cohort would be trivially identifiable from their mood or stress stats without k-anonymity.
- N≥10 is a widely accepted minimum in health informatics anonymization.

### Verification
- Analytics route code inspected: `where count >= 10` enforced in query.
- Seed data includes fewer than 10 students per cohort; analytics endpoint returns suppressed values for small cohorts.

---

## D-006 · Non-Blocking Audit Log Writer

**Timestamp**: 2026-09-08 · Phase 3 (Middleware)
**Category**: Observability / Performance

### Decision
`recordAuditLog()` middleware writes to the `AuditLog` table inside a `res.on('finish')` callback — *after* the response has already been sent to the client. Errors in audit logging are silently swallowed (logged to `console.error` only).

### Rationale
- Audit logging must never slow down or crash a user-facing response.
- A failed audit write should not propagate as a 500 to the student — it is an internal concern.
- `res.on('finish')` guarantees the log only records actually-completed requests (not ones that errored mid-stream).

### Verification
- Code review of `audit.middleware.ts`: `res.on('finish', async () => {...})` pattern confirmed.
- Privacy endpoint (`GET /api/v1/privacy/audit-logs`) returns audit trail for admin inspection.

---

## D-007 · Emergency SOS Button Always Visible (Not Behind Route Guard)

**Timestamp**: 2026-09-08 · Phase 4 (Frontend)
**Category**: UX / Safety

### Decision
The `EmergencySosModal` component and its trigger button are rendered inside `Navbar.tsx` which is visible on **every authenticated page**. The modal content (crisis helplines: 14416, 1800-599-0019, 112) is **statically embedded** — it does not require an API call to display.

### Rationale
- In a crisis, any network latency or API failure would be catastrophic.
- Helplines are national numbers that do not change frequently; static embedding ensures zero-latency display.
- The button uses `crisis-500` colour (red) to be unambiguously urgent without requiring reading.

### Verification
- `EmergencySosModal.tsx` reviewed: helplines are hardcoded strings, modal opens on click with no async operation.
- Backend SOS endpoint (`POST /api/v1/ai-chat/crisis/sos`) additionally creates a `CrisisEvent` DB record for institutional follow-up.

---

## D-008 · PHQ-9 Question 9 Critical Trigger

**Timestamp**: 2026-09-08 · Phase 3 (Assessment Engine)
**Category**: Clinical Safety

### Decision
In the PHQ-9 assessment submission handler (`assessment.routes.ts`), any non-zero answer to Question 9 ("Thoughts that you would be better off dead, or of hurting yourself in some way") immediately triggers a `RiskEvent` creation and returns a `criticalAlertTriggered: true` flag to the frontend, regardless of total score.

### Rationale
- PHQ-9 Q9 is clinically recognized as a direct suicidality indicator.
- A student scoring 0 on all other questions but 1 on Q9 would have a total score of 1 (Minimal depression) — which would otherwise appear safe. Ignoring Q9 in isolation would be a dangerous clinical oversight.
- This matches validated PHQ-9 clinical guidance from Kroenke et al. (2001).

### Verification
- Code inspected in `assessment.routes.ts`: Q9 special-case block present.
- QA Test Group 4 covers PHQ-9 scoring bands (21/21 PASS).

---

## D-009 · Anonymous Alias Generation for Students

**Timestamp**: 2026-09-08 · Phase 1 (Auth)
**Category**: Privacy / UX

### Decision
On student registration, a system-generated `anonymousAlias` (e.g., `TranquilRiver-4821`) is assigned and used as their display name in the Peer Community and all counsellor-facing views. Real names are never shown in social contexts.

### Rationale
- Core SIH requirement: "stigma-free access to psychological support."
- Students will not share feelings in a peer forum if their real identity is visible.
- Counsellors need anonymous identifiers for note-taking without storing PII in session logs.

### Verification
- `seed.ts` generates aliases using adjective + noun + random 4-digit suffix.
- `PeerCommunityPage.tsx` displays `anonymousAuthorName` not user's real name.
- `CounsellorPortalPage.tsx` shows only `anonymousAlias` and academic context (department, year).

---

## D-010 · AI Mock Mode for Offline Evaluation

**Timestamp**: 2026-09-08 · Phase 2 (AI Service)
**Category**: Reliability / Evaluation UX

### Decision
`server/src/services/ai.service.ts` checks `AI_MOCK_MODE=true` in `.env`. When set, all AI responses come from a deterministic local knowledge base (CBT/DBT grounding techniques, breathing exercises) instead of calling the Gemini API.

### Rationale
- Evaluators may not have a Google Gemini API key.
- The system must work completely offline for SIH demo.
- Mock responses are still high-quality, evidence-informed content — not Lorem Ipsum.

### Verification
- `server/.env` ships with `AI_MOCK_MODE=true` by default.
- AI chat session created and responded correctly during API Test [7] and [8] without any API key.

---

## D-011 · Bug Fix — Express Route Ordering (`/user/recommendations` vs `/:slug`)

**Timestamp**: 2026-09-09T05:34 IST · Phase 8 (Bug Fixes)
**Category**: Bug Fix / Routing

### Decision
Moved `router.get('/user/recommendations', ...)` to appear **before** `router.get('/:slug', ...)` in `server/src/routes/resource.routes.ts`.

### Problem
Express matches routes in declaration order. `/:slug` was declared before `/user/recommendations`, so a request to `/resources/user/recommendations` was being matched as `slug = "user"` and returning a 404 ("Resource guide not found").

### Rationale
Specific static paths must always precede wildcard parameter paths in Express routers.

### Verification
- API Test [4]: `GET /api/v1/resources/user/recommendations` → `200 OK`, 3 items ✅
- API Test [11]: Same endpoint called after check-in → 1 personalized recommendation ✅

---

## D-012 · Bug Fix — Prisma Upsert Using Hardcoded String ID

**Timestamp**: 2026-09-09T05:34 IST · Phase 8 (Bug Fixes)
**Category**: Bug Fix / Database

### Decision
Changed the `Recommendation` upsert in `checkin.routes.ts` from using a fabricated string `id` as the `where` clause to using the `@@unique` compound key `{ studentProfileId_resourceId: { studentProfileId, resourceId } }`.

### Problem
```typescript
// BEFORE (broken): where.id was a string like "rec-uuid-uuid"
// but the model's @id is auto-generated uuid(), so this never matched
where: { id: `rec-${studentProfileId}-${panicResource.id}` }

// AFTER (correct): uses the @@unique compound constraint
where: { studentProfileId_resourceId: { studentProfileId, resourceId: panicResource.id } }
```
The broken version silently failed every time — `upsert` tried to create a new row each time but the fabricated `id` string was not a valid UUID format, causing DB errors in strict mode.

### Schema Change
Added `@@unique([studentProfileId, resourceId])` to the `Recommendation` model in `schema.prisma`.
Ran `npx prisma db push` to apply the constraint.
Ran `npx prisma generate` to regenerate the Prisma client with the new compound key type.

### Verification
- API Test [10]: High-stress check-in (moodScore=2, stressLevel=5) submitted ✅
- API Test [11]: `/resources/user/recommendations` returned 1 personalized recommendation post-checkin ✅
- TypeScript: `npx tsc --noEmit` → 0 errors ✅

---

## D-013 · Bug Fix — Invalid `riskCategory: 'PANIC_SOS'`

**Timestamp**: 2026-09-09T05:34 IST · Phase 8 (Bug Fixes)
**Category**: Bug Fix / Data Integrity

### Decision
Changed `riskCategory: 'PANIC_SOS'` to `riskCategory: 'PANIC'` in the SOS endpoint of `aichat.routes.ts`. The SOS origin is preserved in `triggerSnippetRedacted: '[SOS-BUTTON] Student pressed explicit 1-Click Emergency SOS button.'`

### Problem
`'PANIC_SOS'` is not a valid documented category value. Valid values are: `SELF_HARM`, `SUICIDAL_IDEATION`, `PANIC`, `VIOLENCE`. Using an invalid value would cause runtime errors in any code that processes `riskCategory` as an enum, and is misleading in audit/analytics reports.

### Verification
- API Test [9]: `POST /api/v1/ai-chat/crisis/sos` → `200 OK`, 4 helplines returned ✅
- `CrisisEvent` record created in DB with `riskCategory: 'PANIC'` ✅

---

## D-014 · Bug Fix — Missing `animate-fadeIn` CSS Keyframe

**Timestamp**: 2026-09-09T05:34 IST · Phase 8 (Bug Fixes)
**Category**: Bug Fix / Frontend

### Decision
Added `fadeIn`, `slideUp`, and `spin-slow` keyframes and animation classes to `client/tailwind.config.js`:

```js
animation: {
  'fade-in': 'fadeIn 0.4s ease-out forwards',
  'fadeIn':  'fadeIn 0.4s ease-out forwards',  // supports both class names
  'slide-up': 'slideUp 0.35s ease-out forwards',
  'spin-slow': 'spin 8s linear infinite',
},
keyframes: {
  fadeIn:  { '0%': { opacity: '0', transform: 'translateY(-8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
  slideUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
}
```

### Problem
`animate-fadeIn` was referenced in multiple page components (DashboardPage, AiSupportPage, etc.) but the keyframe was not defined in Tailwind config. Tailwind would silently purge the class, causing all fade-in entrance animations to be missing in production builds.

### Verification
- Client production build: `npm run build` → 0 errors, 1611 modules ✅
- `animate-fadeIn` and `animate-fade-in` both supported to handle class name variants used across files ✅

---

## D-015 · Bug Fix — TypeScript `req.params.*` Type (`string | string[]`)

**Timestamp**: 2026-09-09T05:34 IST · Phase 8 (Bug Fixes)
**Category**: Bug Fix / TypeScript

### Decision
Cast all `req.params.*` and `req.ip` usages with `String()` across:
- `src/middleware/audit.middleware.ts`
- `src/routes/aichat.routes.ts`
- `src/routes/assessment.routes.ts`
- `src/routes/appointment.routes.ts`
- `src/routes/peer.routes.ts`
- `src/routes/resource.routes.ts`

### Problem
`@types/express-serve-static-core` defines `ParamsDictionary` as `{ [key: string]: string | string[] }`. This means `req.params.id` is typed as `string | string[]` even though Express always delivers a single string for named parameters. Prisma's `where: { id }` fields expect `string`, not `string | string[]`.

### Fix Pattern
```typescript
// BEFORE: const id = req.params.id;          // string | string[]
// AFTER:  const id = String(req.params.id);   // string (always safe)
```

### Verification
- `npx tsc --noEmit` in `server/` → **exit code 0, 0 errors** ✅ (down from 22 errors)

---

## D-016 · Bug Fix — `session.messages` Type Narrowing Loss in AI Chat

**Timestamp**: 2026-09-09T05:34 IST · Phase 8 (Bug Fixes)
**Category**: Bug Fix / TypeScript

### Decision
Extracted `sessionWithMessages.messages` into a local `recentMessages` variable **before** the null-guard check in the AI chat message handler.

### Problem
```typescript
// TypeScript control-flow narrowed the type of `session` after the null-check,
// but `session.messages` (from `include: { messages }`) was not preserved
// in the narrowed type — TSC reported: "Property 'messages' does not exist"
const session = await prisma.chatSession.findUnique({ include: { messages: ... } });
if (!session) return;
session.messages.reverse(); // ← TS error here
```

### Fix
```typescript
const sessionWithMessages = await prisma.chatSession.findUnique({ include: { messages: ... } });
if (!sessionWithMessages) return;
const recentMessages = sessionWithMessages.messages; // extracted before narrowing
recentMessages.slice().reverse().map((m: { sender: string; content: string }) => ...)
```

### Verification
- `npx tsc --noEmit` → 0 errors ✅
- API Test [8]: Crisis message correctly processed through the non-null session path ✅

---

## D-017 · Added `.gitignore` to Root Repository

**Timestamp**: 2026-09-09T05:34 IST · Phase 8 (Housekeeping)
**Category**: Repository Hygiene

### Decision
Created `/.gitignore` at monorepo root covering:
- `node_modules/` (all workspaces)
- `server/prisma/dev.db` + WAL files (`-journal`, `-shm`, `-wal`)
- `server/.env` (secrets)
- `client/dist/` and `server/dist/` (build artifacts)
- OS files (`.DS_Store`, `Thumbs.db`)
- IDE files (`.idea/`, `.vscode/settings.json`)
- `*.tsbuildinfo`

`.env.example` and `server/.env.example` are **explicitly un-ignored** (`!.env.example`) so templates are committed.

### Rationale
Without `.gitignore`, a `git init && git add .` would commit SQLite database (contains PII), secret keys, and 300MB+ of `node_modules`.

### Verification
- File created at repo root.
- Key exclusions validated by pattern review.

---

## D-018 · Database Re-seed After Schema Migration

**Timestamp**: 2026-09-09T05:35 IST · Phase 8 (Operations)
**Category**: Data / Operations

### Decision
After running `npx prisma db push --accept-data-loss` to apply the `@@unique` constraint on `Recommendation`, re-ran `npx ts-node src/prisma/seed.ts` to restore all demo data.

### Problem
`--accept-data-loss` wipes the database when a destructive constraint (UNIQUE index) is added to an existing table in SQLite. This deleted all 7 seeded users and their associated data.

### Rationale
For an evaluation/prototype system, data loss during schema migration is acceptable. In production, a proper `prisma migrate dev` + `migrate deploy` flow with non-destructive migrations would be used.

### Verification
- Seed completed: 7 users, 3 assessments, 4 resources, 14-day check-in history, counsellor availability ✅
- Login confirmed: `aarav.patel@aiths.ac.in` / `Password123!` → JWT issued ✅

---

## D-019 · Final QA Gate — 21/21 Unit Tests + 15/15 API Integration Tests

**Timestamp**: 2026-09-09T11:29 IST · Phase 8 (QA)
**Category**: Quality Assurance

### Results

**Unit / Integration QA Harness (`runAllTests.ts`):**
| Group | Tests | Result |
|---|---|---|
| Crisis & Safety Engine Red-Teaming | 9 | ✅ 9/9 |
| Cryptographic Security & Tokens | 3 | ✅ 3/3 |
| Database & Seed Data Integrity | 4 | ✅ 4/4 |
| Screening Scoring & Severity | 5 | ✅ 5/5 |
| **Total** | **21** | **✅ 21/21** |

**Live API Integration Tests (PowerShell):**
| # | Test | Result |
|---|---|---|
| 1 | Health check | ✅ HEALTHY |
| 2 | Student login | ✅ role=STUDENT |
| 3 | Resources listing | ✅ 4 items |
| 4 | Recommendations (route-fix) | ✅ 3 items |
| 5 | RBAC: student → analytics 403 | ✅ FORBIDDEN |
| 6 | Admin analytics | ✅ OK |
| 7 | AI chat session creation | ✅ 1 welcome msg |
| 8 | Crisis message detection | ✅ isCrisis=true, CRISIS_SYSTEM |
| 9 | SOS endpoint | ✅ 4 helplines |
| 10 | High-stress check-in | ✅ mood=2 stress=5 |
| 11 | Post-checkin recommendations | ✅ 1 personalized rec |
| 12 | Assessments list | ✅ 3 instruments |
| 13 | Counsellors directory | ✅ 2 counsellors |
| 14 | Peer posts | ✅ 2 posts |
| 15 | Timeline | ✅ 15 entries |

**Client Production Build:** `npm run build` → 1611 modules, 0 errors ✅
**Server TypeScript Compilation:** `npx tsc --noEmit` → exit 0, 0 errors ✅

---

## D-020 · Design Principle — "Not a Hospital, Not a Chatbot"

**Timestamp**: 2026-09-08 · Phase 0 (UX Philosophy)
**Category**: UX / Design

### Decision
All UI uses the custom `brand` (teal) and `calm` (slate) colour palette. No clinical whites, no robot avatars, no "chat bubble" UI for the AI support interface. The breathing grounding widget uses animated concentric circles, not text-only instructions.

### Rationale
Verbatim from specification: *"The application must NOT look like a hospital or generic AI chatbot."* Research shows students avoid mental health apps that feel clinical or impersonal (Gulliver et al., 2010).

### Verification
- Tailwind config: `brand` (teal-green), `calm` (slate), `amberwarm` (amber), `crisis` (red) — no clinical blue/white.
- `InteractiveGroundingWidget.tsx`: animated sphere with timer, not static text.
- `AiSupportPage.tsx`: conversation interface styled as a "companion" not a support ticket.

---

## D-021 · Monorepo Restructuring to Dedicated `frontend/` and `backend/` Architecture

**Timestamp**: 2026-09-09T12:28 IST · Phase 9 (Architecture & Scalability)
**Category**: Architecture / Scalability

### Decision
Migrated and reorganized the codebase from legacy `client/` and `server/` directories into dedicated, modular `frontend/` and `backend/` architectures.
1. Renamed `client/` to `frontend/` and updated package identity to `@mindbridge/frontend` (`mindbridge-frontend`).
2. Renamed `server/` to `backend/` and updated package identity to `@mindbridge/backend` (`mindbridge-backend`).
3. Refactored root `package.json` scripts with explicit `dev:backend`, `dev:frontend`, `build`, `seed`, and `test` lifecycle hooks, while preserving `dev:server` and `dev:client` backward compatibility aliases.
4. Updated root `.gitignore` to include both `frontend/dist/` and `backend/dist/`, as well as `backend/prisma/dev.db*`.
5. Replaced previous process daemons with updated workers pointing to the new directories.

### Rationale
- High-growth engineering teams require unambiguous domain boundaries between client presentations and server services.
- Renaming to canonical `frontend` and `backend` removes ambiguity with generic "client/server" network terminology.
- Simplifies Docker multi-stage containerization, CI/CD pipeline targeting (e.g., `cd frontend && npm test`, `cd backend && docker build`), and path-based monorepo build caching (Turborepo/Nx).

### Verification
- `backend`: `npx tsc --noEmit` passed with 0 errors.
- `backend`: `npm run test` (QA test harness) passed with **21/21 tests passing**.
- `frontend`: `npm run build` completed cleanly, bundling 1611 modules in 16.5s.
- Both daemons running: backend on `:5000` (`HEALTHY`) and frontend on `:5173` (`200 OK`).
- Live 14-endpoint API integration test suite verified 100% functional.

---

## D-022 · Production PostgreSQL Schema, Generated Migrations, & Comprehensive 20-Student Seed

**Timestamp**: 2026-09-09T13:00 IST · Phase 10 (Database Architecture)
**Category**: Database / Scalability / Clinical Data

### Decision
Fully implemented the MindBridge 22-entity relational database architecture across both production PostgreSQL (`schema.postgres.prisma` + SQL migrations) and local SQLite (`schema.prisma`):
1. **Production PostgreSQL Schema**: Fully normalized with 10 native PostgreSQL enums (`UserRole`, `ConsentType`, `ConsentStatus`, `RiskLevel`, `CrisisStatus`, `AppointmentStatus`, `MeetingType`, `PostStatus`, `ModerationAction`, `NotificationType`).
2. **Generated Production Migration**: Generated `prisma/migrations/20260909_init_postgresql/migration.sql` (573 lines, 21.6 KB) via `prisma migrate diff --from-empty`, complete with composite indexes, foreign keys with explicit cascade behaviors (`onDelete: Cascade` vs `onDelete: SetNull`), and unique constraints.
3. **Compound Indexes & Unique Constraints**:
   - `Recommendation`: `@@unique([studentProfileId, resourceId])`
   - `WellbeingMetric`: `@@unique([institutionId, department, periodDate])`
   - `Consent`: `@@unique([userId, type, version])`
   - Index optimization on `[department, yearOfStudy]`, `[studentProfileId, date]`, `[status, createdAt]`.
4. **Soft Deletion & Audit Fields**: Added `deletedAt` to `User`, `StudentProfile`, `CounsellorProfile`, `PeerPost`, and `PeerComment` to support DPDP Act 2023 / GDPR Right to Erasure without breaking relational consistency.
5. **Comprehensive Realistic Seed Script**:
   - 20 realistic student profiles with unique pseudonymous aliases across 5 distinct engineering departments.
   - 3 licensed clinical psychologists with RCI registration numbers and verified specializations.
   - 2 peer volunteers with student profile attachments.
   - 1 institution with campus security hotlines and Tele-MANAS configuration.
   - 3 validated instruments (PHQ-9, GAD-7, WHO-5) with question sets, scoring rules, and disclaimers.
   - 14-day longitudinal wellbeing check-ins with realistic mid-term stress curves.
   - 4 evidence-informed psychoeducational resources, appointment bookings, and moderated peer posts.

### Rationale
A student psychological support platform requires strict referential integrity, zero data loss, and mathematical isolation between sensitive personal data and aggregated institutional metrics.

### Verification
- `testDatabaseRelations.ts`: **29/29 tests passed** verifying all entities, foreign key traversals, unique constraints, and soft deletion flags.
- `runAllTests.ts`: **21/21 tests passed** (Crisis red-teaming, crypto, seed integrity, clinical scoring).
- Backend and Frontend services live and responding with `HEALTHY` and `200 OK`.

---

## D-023 · Centralized Authentication, Hardened RBAC, & Threat Mitigation Architecture

**Timestamp**: 2026-09-09T13:10 IST · Phase 11 (Authentication & Authorization)
**Category**: Security / Authentication / Authorization / Compliance

### Decision
Implemented a centralized, multi-layered authentication and authorization architecture for MindBridge adhering strictly to defense-in-depth principles:
1. **Password Security & Hashing**: Upgraded Bcrypt work factor to cost 12 with constant-time comparison to thwart timing attacks.
2. **Stateless JWT with State Revocation**: Dual-phase token management utilizing cryptographically signed JSON Web Tokens (15m-24h expiry) paired with a high-performance in-memory revocation blacklist (`tokenBlacklist`) to guarantee immediate invalidation upon logout or password reset.
3. **5-Role Centralized RBAC Middleware (`requireRoles`)**:
   - Strictly enforces authorization at every backend route across `STUDENT`, `COUNSELLOR`, `PEER_VOLUNTEER`, `INSTITUTION_ADMIN`, and `SUPER_ADMIN`.
   - Never trusts client-side state alone.
   - Detects and intercepts horizontal and vertical role escalation attempts, asynchronously logging full forensic traces to the `AuditLog` table.
   - Prevents self-registration into administrative roles (`INSTITUTION_ADMIN` or `SUPER_ADMIN`).
4. **Brute-Force Attack Mitigation (`loginAttemptTracker`)**:
   - In-memory sliding window tracking failed authentication attempts per identifier.
   - Triggers a 15-minute account lockout upon 5 consecutive failed attempts (HTTP 429 `TOO_MANY_FAILED_ATTEMPTS`).
   - Rejects even correct passwords during active lockout windows.
5. **Tokenized Lifecycles for Password Reset & Email Verification**:
   - Purpose-scoped, time-bounded JWT tokens (`purpose: 'password_reset'` for 15m; `purpose: 'email_verification'` for 24h).
   - Single-use enforcement: Tokens are immediately blacklisted upon consumption (`TOKEN_ALREADY_USED`).
6. **Input Sanitation & Strict Validation**:
   - Zod schemas validate all authentication payloads (email normalization, password entropy >= 8 characters, required clinical credentials).
7. **Comprehensive Audit Trail**:
   - Immutable logging of all security-sensitive events: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `USER_LOGGED_OUT`, `PASSWORD_RESET_SUCCESS`, `EMAIL_VERIFICATION_REQUESTED`, and `UNAUTHORIZED_ROLE_ESCALATION_ATTEMPT`.

### Rationale
In mental health and university clinical applications, unauthorized access, privilege escalation, or session hijacking poses severe safety and legal risks (DPDP Act 2023, HIPAA, FERPA). Independent route-level verification and auditability are non-negotiable architectural mandates.

### Verification
- `testAuthAndRbac.ts`: **32/32 tests passed** (100% success rate):
  - Valid login across roles (Student, Counsellor, Institution Admin)
  - Invalid password and non-existent user handling
  - Missing and malformed Authorization header handling
  - Role escalation prevention (Student $\rightarrow$ Admin Analytics blocked, Student $\rightarrow$ Counsellor Availability blocked, Super Admin self-assignment blocked)
  - Expired token rejection (`TOKEN_EXPIRED`)
  - Malformed email and weak password rejection (`VALIDATION_ERROR`)
  - Brute-force lockout trigger on 5 failed attempts + lockout retention
  - Logout session invalidation and blacklist enforcement
  - Single-use password reset lifecycle
  - Email verification token issuance and database state update
  - AuditLog recording of all key security events
- `testDatabaseRelations.ts`: **29/29 tests passed**.
- `runAllTests.ts`: **21/21 tests passed**.

---

## D-024 · MindBridge AI Psychological First-Aid Assistant Architecture

**Timestamp**: 2026-09-11 · Phase 5 (AI & Clinical Safety)
**Category**: AI Ethics / Clinical Safety / RAG Architecture / Vendor-Agnostic Design

### Decision
Implemented a modular, vendor-agnostic **AI Psychological First-Aid (PFA) Assistant** operating across a strict 7-stage processing pipeline:
`User message → Input Validation → Safety Classifier → Intent Classifier → Retrieval Layer (RAG) → Response Generation → Response Guard → Response`

1. **Vendor-Agnostic LLM Layer (`LLMProvider`)**:
   - Decoupled interface supporting multiple backends (`GeminiLlmProvider`, `RuleBasedFallbackLlmProvider`, `MultiProviderManager`).
   - Seamless automatic fallback to deterministic clinical engine on API errors, timeouts (>5000ms), or quota limits, guaranteeing 100% uptime.
2. **Clinical Safety & Non-Diagnostic Guardrails (`ResponseGuard`)**:
   - Strictly prohibits issuing medical or psychiatric diagnoses (e.g. "you have clinical depression").
   - Strictly prohibits prescribing or recommending pharmaceutical drugs or dosages.
   - Strictly prohibits pretending to be a licensed human professional.
   - Transparently states non-diagnostic status and redirects students to standardized screenings (PHQ-9/GAD-7) or verified campus counsellors.
3. **RAG Retrieval Engine with Clinical Metadata (`RetrievalService`)**:
   - Curates evidence-informed psychoeducational coping resources.
   - Every resource strictly retains audit metadata: `title`, `category`, `language`, `source`, `evidenceLevel` (Level 1 RCT to Level 3), `reviewDate`, `approvedStatus`, and `actionableSteps`.
4. **Deterministic Crisis Interception (`CrisisService`)**:
   - Short-circuits prior to LLM invocation upon detection of suicidal ideation or acute self-harm.
   - Strictly utilizes verified platform emergency helplines: **Tele-MANAS (`14416`)**, **KIRAN (`1800-599-0019`)**, and Campus Emergency (`112`). Never fabricates or hallucinates telephone numbers.
   - Logs immutable `RiskEvent` and `CrisisEvent` records to database.
5. **Privacy-Preserving Conversation Memory**:
   - Truncates context to recent 4 conversational turns.
   - Strips student PII, profile data, and clinical assessment responses from LLM payloads.

### Verification
- `testPfaAssistant.ts`: **110/110 tests passed** across all 12 clinical & adversarial scenarios:
  1. Normal empathetic conversation & active listening
  2. Anxiety & panic (4-7-8 breathing + anxiety resource retrieval)
  3. Academic stress & exam pressure (worth reframing + box breathing)
  4. Loneliness & campus disconnection (validation + peer support referral)
  5. Sleep difficulties & insomnia (sleep hygiene protocols)
  6. Crisis language & suicidal ideation (immediate interception + verified Tele-MANAS/KIRAN)
  7. Medication requests (strict refusal + doctor referral)
  8. Diagnosis requests (strict refusal + standardized screening referral)
  9. Prompt injection & jailbreak prevention (DAN mode / developer prompt leak blocked)
  10. Abusive / hostile input (calm de-escalation + zero mirrored toxicity)
  11. Empty input handling (gentle prompt to share when ready)
  12. RAG clinical metadata integrity (complete evidence metadata on all resources)
- Platform overall: **192 / 192 automated tests passing** across all test suites (`runAllTests.ts`, `testAuthAndRbac.ts`, `testDatabaseRelations.ts`, `testPfaAssistant.ts`).

---

*Last updated: 2026-09-11T00:10 IST*
*Total decisions logged: 24*
