# MINDBRIDGE: Digital Mental Health & Psychological Support Ecosystem for Higher Education

[![SIH 25092](https://img.shields.io/badge/SIH%20Problem-25092-blue.svg)](https://sih.gov.in)
[![Security Tested](https://img.shields.io/badge/Security-RBAC%20%26%20Zero--PII-emerald.svg)]()
[![Safety Scanner](https://img.shields.io/badge/Safety%20Scanner-100%25%20Deterministic-red.svg)]()
[![License](https://img.shields.io/badge/Architecture-Enterprise%20Tier-teal.svg)]()

> **Digital Mental Health & Psychological Support Ecosystem for Students in Higher Education (SIH 25092)**
> 
> *A production-quality, stigma-free, confidential platform bridging students, AI psychological first-aid, validated clinical screenings, licensed campus counsellors, moderated peer support, and privacy-preserving institutional analytics.*

---

## ⚠️ Important Clinical Safety Boundaries

1. **Non-Diagnostic Premise**: MINDBRIDGE is **strictly NOT an AI psychiatrist** and never claims to diagnose psychiatric disorders or prescribe medication.
2. **Deterministic Crisis Interceptor**: Every conversational input is analyzed by a deterministic, zero-hallucination safety filter before reaching the generative AI layer. If suicidal ideation or acute self-harm language is detected, the generative model is completely bypassed, immediately delivering verified 24/7 national emergency helplines (**Tele-MANAS `14416`**, **KIRAN `1800-599-0019`**, and campus first response).
3. **No Direct Database Access**: The AI assistant has zero query access to sensitive student medical records, check-in history, or identity tables.
4. **k-Anonymity Shield**: Institutional administrators (Deans/Directors) **never** see individual student mental-health logs. Campus metrics are strictly aggregated with cohort thresholds ($N \ge 10$) to prevent de-anonymization.

---

## 🌟 Key Functional Pillars

| Pillar | Capabilities |
|---|---|
| **1. Early Identification & Tracking** | 15-second daily micro-check-ins (mood: 1-5, sleep hours, stress level, energy, tags) with a 7/14/30-day longitudinal trajectory curve. |
| **2. Validated Clinical Screenings** | Scientifically validated instruments: **PHQ-9** (Depression), **GAD-7** (Anxiety), and **WHO-5** (Wellbeing Index) with clear clinical disclaimers, score calculation, severity categorization, and critical item flagging. |
| **3. AI Psychological First-Aid** | Active-listening, non-judgmental conversational companion providing cognitive reframing, bite-sized coping actions, and interactive **4-7-8 Vagus Nerve Breathing** widgets. |
| **4. Confidential Counselling Discovery** | Verified directory of campus clinical psychologists and counsellors with conflict-free slot booking, virtual/in-person modalities, and encrypted session notes. |
| **5. Moderated Peer Community** | Safe discussion hub where students share experiences under generated pseudonyms (e.g. `@TranquilSparrow42`) with automated toxicity screening and volunteer triage queues. |
| **6. Psychoeducational Resource Library** | Evidence-informed guides covering exam panic, imposter syndrome, sleep architecture for STEM students, and CBT thought challenges. |
| **7. Privacy & Consent Governance** | Granular consent tracking (Terms, Privacy, Emergency Intervention, Research), instant 1-click **GDPR / DPDP JSON Data Export**, and permanent account erasure workflow. |

---

## 👥 Pre-Configured Test Personas (1-Click Evaluation)

All accounts are pre-seeded with password: `Password123!`

| Role | Email | Name / Persona | Key Features to Test |
|---|---|---|---|
| **STUDENT** | `aarav.patel@aiths.ac.in` | Aarav Patel (`@TranquilSparrow42`) | Daily check-in, AI first-aid chat, PHQ-9 screening, book counsellor, download data |
| **STUDENT 2** | `diya.sharma@aiths.ac.in` | Diya Sharma (`@SereneRiver19`) | Stigma-free peer posts, sleep tracking, personalized recommendations |
| **COUNSELLOR** | `dr.ananya@aiths.ac.in` | Dr. Ananya Sen (RCI Licensed) | View assigned caseload, view consented student stress trends, save encrypted notes |
| **PEER VOLUNTEER** | `rohan.peer@aiths.ac.in` | Rohan Mehra | Triage flagged peer posts, approve or escalate high-distress posts |
| **INSTITUTION ADMIN** | `dean.welfare@aiths.ac.in` | Prof. Meenakshi Iyer (Campus Dean) | View $k$-anonymized campus stress index by department, audit logs |
| **SUPER ADMIN** | `admin@mindbridge.org` | System Administrator | Global audit trails, system health, configuration |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v20+ recommended, tested on v22.19)
- npm (v10+)

### 1. Installation
From the root directory:
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Initialize Database & Seeders
```bash
cd backend

# Generate Prisma Client & apply schema (zero-setup SQLite dev.db)
npx prisma generate
npx prisma db push

# Seed realistic test data across all 5 roles
npm run seed
```

### 3. Run Automated Verification Suite
```bash
# In backend directory:
npm run test
```
*Executes 21 automated unit, security, and crisis red-teaming tests.*

### 4. Launch the Ecosystem
From the root directory:
```bash
npm run dev
```
Or run individually:
- **Backend API**: `http://localhost:5000` (`npm run dev:backend`)
- **Frontend App**: `http://localhost:5173` (`npm run dev:frontend`)

---

## 📐 Technology Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Tooling**: Vite 6
- **Styling**: Tailwind CSS with custom calming palette (`brand`, `calm`, `crisis`)
- **Icons**: Lucide React
- **Routing**: React Router v6

### Backend
- **Runtime**: Node.js & Express with TypeScript
- **ORM**: Prisma ORM
- **Database**: PostgreSQL (native `schema.postgres.prisma` included) & SQLite (`dev.db` for instant offline execution)
- **Security**: Helmet, CORS, express-rate-limit, bcrypt (12 rounds), JWT tokens
- **Validation**: Zod runtime schema validation on all inputs

---

## 🛡️ National Helplines Configured
- **Tele-MANAS**: `14416` (24x7 Toll-Free, 20+ Languages)
- **KIRAN**: `1800-599-0019` (Ministry of Social Justice & Empowerment)
- **Vandrevala Foundation**: `+91-9999-666-555`
- **Campus Emergency**: `112`
