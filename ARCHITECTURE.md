# SYSTEM ARCHITECTURE

## School Examination & Terminal Report Management System
**Version:** 2.0 (Revised Architecture)

---

## 1. Architectural Philosophy: Server-First

The system is engineered following Next.js 16 App Router Server-First principles:

```text
Next.js Server Component (Default)
        ↓
Server Action / Server Service
        ↓
Application Domain Service Layer
        ↓
Domain Validation Layer (Zod + DB Constraints)
        ↓
Prisma ORM
        ↓
PostgreSQL Database
```

When client-side state is genuinely required (e.g. spreadsheet score entry grid, dynamic quick search):

```text
Server Component (Initial Render)
        ↓
Small Client Component Boundary ("use client")
        ↓
TanStack React Query Hook
        ↓
Next.js API Route Handler
        ↓
Application Service Layer
        ↓
Prisma ORM
        ↓
PostgreSQL Database
```

---

## 2. Directory Layout

```text
school_report_system/
├── app/
│   ├── actions/          # Server Actions (Auth, Mark Entry, Finalization, Publication)
│   ├── api/              # Route Handlers (Auth, Scores, Reports, SMS)
│   ├── dashboard/        # Server-rendered Dashboard Shell & Overview
│   ├── login/            # Staff & Academic Authentication Portal
│   ├── globals.css       # Tailwind CSS v4 Theme Design Tokens
│   └── layout.tsx        # Root Layout with Font and Query/Auth Providers
├── components/
│   ├── layout/           # AppShell, AppSidebar, AppHeader, NavUser
│   ├── providers/        # QueryProvider (TanStack Query)
│   └── ui/               # shadcn / Base UI Accessible Primitives (Button, Card, Table, Alert, Badge)
├── lib/
│   ├── auth/             # Session management (HMAC-SHA256), ScopeGuard, AuthContext
│   ├── errors.ts         # Structured AppError with machine-readable error codes
│   ├── prisma.ts         # PrismaClient singleton instance
│   └── utils.ts          # Classnames & cn utilities
├── prisma/
│   └── schema.prisma     # Relational PostgreSQL schema (24 entities)
├── scripts/              # Automated verification & test suites
└── server/
    └── services/         # Pure domain service layer
        ├── AuditService.ts
        ├── AuthService.ts
        ├── SchoolProfileService.ts
        └── SystemSettingService.ts
```

---

## 3. Core Academic Workflow

The entire architecture is designed around the fundamental distinction:
$$\text{LIVE ACADEMIC DATA} \neq \text{OFFICIAL RESULT SNAPSHOT}$$

1. **Live Operational Phase:**
   - Teachers enter scores in `student_assessment_scores`.
   - Scores are validated against category max scores and teacher subject allocations.
   - Live calculations are previews only.
2. **Review & Moderation Phase:**
   - Exam officers review completeness, identify missing marks, and moderate scores.
   - Headmaster signs off and approves the term.
3. **Atomic Finalization Phase:**
   - Term transitions inside a PostgreSQL transaction:
     - Run final validation (block on missing marks).
     - Compute weighted CA, exam totals, grades, grade points, GPA.
     - Calculate deterministic dense rankings for subjects and classes.
     - Freeze records into `term_results` and `term_result_subjects`.
     - Lock the term and mark as `FINALIZED`.
4. **Report & Publication Phase:**
   - Terminal reports and PDFs are read **strictly from the immutable snapshot**.
   - Public access is secured through SHA-256 hashed access tokens.
