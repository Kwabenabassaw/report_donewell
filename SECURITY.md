# SECURITY & AUTHORIZATION SPECIFICATION

## School Examination & Terminal Report Management System
**Version:** 2.0 (Revised Architecture)

---

## 1. Authentication

- **Password Storage:** Hashed using `bcryptjs` with salt rounds.
- **Session Tokens:** Cryptographic HMAC-SHA256 signed tokens containing:
  - `userId`
  - `username`
  - `displayName`
  - `roles`
  - `activeRole`
  - `exp` (7-day expiration)
- **Signature Verification:** Constant-time verification using `crypto.timingSafeEqual` to prevent timing attacks.
- **Cookie Security:** HTTP-only, SameSite=Lax, Secure in production, root path.

---

## 2. Two-Tier Authorization Model (Role + Scope)

System security requires passing two distinct gates:

### Layer 1: Role Verification
Ensures the actor holds one of the valid academic roles:
- `SUPER_ADMIN`
- `HEADMASTER`
- `EXAM_OFFICER`
- `CLASS_TEACHER`
- `SUBJECT_TEACHER`
- `STUDENT`
- `GUARDIAN`

### Layer 2: Scope Verification (`ScopeGuard`)
Enforces that even with `SUBJECT_TEACHER` role, a teacher can ONLY view and edit records for their specific assignments:
$$\text{Teacher Access} \iff (\text{Teacher ID} \times \text{Class ID} \times \text{Subject ID} \times \text{Term ID}) \in \text{subject\_allocations}$$

Cross-class and cross-subject attempts are rejected with `UNAUTHORIZED_TEACHER`.

---

## 3. Append-Only Audit Logging

All sensitive actions trigger an immutable entry in `audit_logs`:
- `LOGIN_SUCCESS`, `LOGIN_FAILED`
- `CREATE_SCORE`, `UPDATE_SCORE`, `LOCK_SCORE`
- `SUBMIT_TERM`, `APPROVE_TERM`, `FINALIZE_TERM`, `REOPEN_TERM`
- `SWITCH_ACTIVE_ROLE`

Audit logs record the actor ID, entity ID, previous values (JSON), new values (JSON), IP address, and user agent.
