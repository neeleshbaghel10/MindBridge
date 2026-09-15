# MindBridge

### Digital Mental Health & Psychological Support Ecosystem for Students in Higher Education

MindBridge is a full-stack digital mental health and psychological support platform designed for students in higher education.

The platform brings together **wellbeing tracking, validated self-assessment tools, AI-assisted psychological first-aid, counselling discovery and booking, moderated peer support, psychoeducational resources, crisis escalation, and privacy-conscious institutional analytics** in a single ecosystem.

The system is designed around one principle:

> **Technology should help students access support earlier, while keeping professional intervention and human judgement at the centre of the system.**

---

## Problem

Students in higher education frequently experience academic pressure, anxiety, burnout, sleep problems, social isolation, and other wellbeing challenges.

However, several barriers can prevent students from seeking support:

- Stigma associated with mental health services
- Lack of awareness about available resources
- Difficulty accessing counsellors
- No simple mechanism for tracking wellbeing over time
- Limited early identification of declining wellbeing
- Fragmented support services
- Lack of privacy-conscious institutional insights

MindBridge addresses these gaps by providing students with a single, confidential platform through which they can monitor their wellbeing, access self-help resources, connect with support services, and seek professional assistance when required.

---

# Solution

MindBridge follows an end-to-end support journey:

```text
                    ┌──────────────────────┐
                    │       STUDENT        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Wellbeing Check-in │
                    │   & Self-Assessment  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Early Identification  │
                    │ & Trend Monitoring    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌──────────────┐   ┌─────────────┐
       │ AI Support │   │ Self-Help    │   │ Counselling │
       │ Assistant  │   │ Resources    │   │ & Referral  │
       └─────┬──────┘   └──────────────┘   └──────┬──────┘
             │                                     │
             └────────────────┬────────────────────┘
                              ▼
                    ┌──────────────────────┐
                    │ Follow-up & Continued│
                    │ Wellbeing Support    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Privacy-Preserving   │
                    │ Institutional        │
                    │ Analytics            │
                    └──────────────────────┘





   ## SAFETY WORKFLOW

  Student Input
     │
     ▼
Safety Classification
     │
     ├───────────────┐
     │               │
     ▼               ▼
Lower Risk        Higher Risk
     │               │
     ▼               ▼
Normal AI        Crisis Response
Support          Workflow
     │               │
     │               ├── Immediate guidance
     │               ├── Crisis resources
     │               ├── Campus support
     │               └── Professional referral
     │
     ▼
Continued Support





## APPOINTMENT WORKFLOW
Student
   │
   ▼
Counsellor Directory
   │
   ▼
Select Counsellor
   │
   ▼
View Availability
   │
   ▼
Select Time Slot
   │
   ▼
Book Appointment
   │
   ▼
Appointment Confirmation
   │
   ▼
Counselling Session
   │
   ▼
Follow-up







                ## ROLE BASED-ACCESS

                    ┌───────────────┐
                    │     USER      │
                    └───────┬───────┘
                            │
                            ▼
                     Authentication
                            │
                            ▼
                       Role Check
                            │
          ┌─────────┬───────┼────────┬────────────┐
          ▼         ▼       ▼        ▼            ▼
       Student  Counsellor  Peer    Admin     Super Admin





                    ## SYSTEM ARCHITECTURE


┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                        │
│                                                             │
│   React + TypeScript + Vite + Tailwind CSS                  │
│                                                             │
│   Student Portal │ Counsellor Portal │ Admin Portal         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                         API LAYER                            │
│                                                             │
│                    Node.js + Express                        │
│                                                             │
│  Authentication │ Check-ins │ Assessments │ AI Chat         │
│  Counselling    │ Community │ Resources   │ Analytics       │
│  Privacy        │ Notifications │ Moderation                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION SERVICES                      │
│                                                             │
│  Safety Engine │ Recommendation Engine │ Appointment Logic   │
│  AI Pipeline   │ Moderation            │ Analytics           │
│  Consent       │ Audit                 │ Notification        │
└───────────────┬─────────────────────┬────────────────────────┘
                │                     │
                ▼                     ▼
┌────────────────────────┐   ┌────────────────────────────────┐
│       DATABASE         │   │          AI SERVICES            │
│                        │   │                                │
│ Prisma ORM             │   │ Safety Classifier               │
│                        │   │ Intent Classification            │
│ SQLite / PostgreSQL    │   │ Retrieval / RAG                 │
│                        │   │ LLM Provider                    │
│ Users                  │   │ Response Guard                  │
│ Assessments            │   │ Psychological First-Aid         │
│ Check-ins              │   │                                │
│ Appointments           │   └────────────────────────────────┘
│ Community              │
│ Resources              │
│ Audit Logs             │
└────────────────────────┘




                        ## AI ARCHITECTURE



                         USER MESSAGE
                              │
                              ▼
                    ┌──────────────────┐
                    │ Input Validation │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Safety Classifier│
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
                    ▼                  ▼
                 Safe Path          Risk Path
                    │                  │
                    ▼                  ▼
             Intent Classifier    Crisis Service
                    │                  │
                    ▼                  ▼
              Retrieval Layer      Crisis Response
                    │
                    ▼
              LLM Provider
                    │
                    ▼
             Response Guard
                    │
                    ▼
                Student




  ## Backend Module Architecture

 backend/src/
│
├── ai/
│   ├── crisisService
│   ├── intentClassifier
│   ├── llmProvider
│   ├── pfaPipeline
│   ├── responseGuard
│   ├── retrievalService
│   └── safetyClassifier
│
├── analytics/
├── counselling/
├── peer/
├── safety/
│
├── middleware/
│   ├── authentication
│   ├── authorization
│   ├── audit
│   └── error handling
│
├── routes/
│   ├── authentication
│   ├── assessments
│   ├── check-ins
│   ├── AI chat
│   ├── counselling
│   ├── appointments
│   ├── peer support
│   ├── resources
│   ├── analytics
│   ├── privacy
│   └── notifications
│
├── services/
├── prisma/
└── tests/



## Database Design

Institution
     │
     ├── Users
     │     │
     │     ├── StudentProfile
     │     └── CounsellorProfile
     │
     ├── Assessments
     │     └── AssessmentResponses
     │
     ├── WellbeingCheckins
     │     └── WellbeingMetrics
     │
     ├── ChatSessions
     │     └── ChatMessages
     │
     ├── RiskEvents
     │     └── CrisisEvents
     │
     ├── CounsellorAvailability
     │     └── Appointments
     │
     ├── PeerPosts
     │     ├── PeerComments
     │     ├── PeerReactions
     │     └── PeerReports
     │
     ├── Resources
     │     └── ResourceProgress
     │
     ├── Recommendations
     ├── Notifications
     ├── Consents
     └── AuditLogs




  ##Security flow
     Request
   │
   ▼
CORS / Security Headers
   │
   ▼
Rate Limiting
   │
   ▼
Authentication
   │
   ▼
Authorization / RBAC
   │
   ▼
Input Validation
   │
   ▼
Business Logic
   │
   ▼
Database / Service Layer
   │
   ▼
Audit / Response


##Project Structure


MindBridge/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── schema.postgres.prisma
│   │
│   ├── src/
│   │   ├── ai/
│   │   ├── analytics/
│   │   ├── counselling/
│   │   ├── middleware/
│   │   ├── peer/
│   │   ├── prisma/
│   │   ├── routes/
│   │   ├── safety/
│   │   ├── services/
│   │   ├── tests/
│   │   └── index.ts
│   │
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── shared/
│   └── types.ts
│
├── .gitignore
├── DECISIONS.md
├── README.md
├── package.json
└── package-lock.json





