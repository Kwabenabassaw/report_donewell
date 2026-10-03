# SCHOOL EXAMINATION & TERMINAL REPORT MANAGEMENT SYSTEM

## Software Requirements Specification (SRS)

**Version:** 2.0  
**Status:** Revised Technical Specification

---

# 1. System Architecture

## 1.1 Recommended Stack

### Frontend

- Next.js
- TypeScript
- React
- Server Components where appropriate
- Client Components for interactive mark-entry interfaces

### Backend/Application Layer

- Next.js Server Actions / Route Handlers
- Application service layer
- Domain/service layer
- Validation layer
- Repository/data-access layer

### Database

- PostgreSQL

### ORM

- Prisma

### Supporting Services

- Object/file storage for report PDFs and school assets
- SMS provider
- Background job mechanism for asynchronous tasks

---

# 2. Architectural Pattern

The application should use:

```text
UI
 ↓
Server Action / Route Handler
 ↓
Application Service
 ↓
Domain Validation
 ↓
Repository / Prisma
 ↓
PostgreSQL
```

Do not place all business logic directly inside React components or page files.

---

# 3. Domain Services

Create explicit services for major business operations.

Recommended services:

```text
AcademicYearService
TermService
EnrollmentService
TeacherAssignmentService
AssessmentService
ScoreEntryService
GradingPolicyService
ResultCalculationService
ResultValidationService
RankingService
ModerationService
ResultFinalizationService
ResultPublicationService
ReportService
NotificationService
AuditService
ImportService
```

---

# 4. Database Design

## 4.1 School Profile

### school_profiles

Fields:

```text
id
school_name
school_code
crest_url
motto
postal_address
email
phone
headmaster_signature_url
created_at
updated_at
```

---

# 5. Authentication & Authorization

## roles

```text
id
name
description
```

Example roles:

```text
SUPER_ADMIN
HEADMASTER
EXAM_OFFICER
CLASS_TEACHER
SUBJECT_TEACHER
STUDENT
GUARDIAN
```

## users

```text
id
username/email
password/session information
display_name
status
created_at
updated_at
```

## user_roles

```text
user_id
role_id
```

---

# 6. Teacher Assignment

## subject_allocations

```text
id
term_id
class_id
subject_id
teacher_id
created_at
updated_at
```

Constraint:

```text
UNIQUE(term_id, class_id, subject_id)
```

The authorization layer must use this table when determining teacher access.

---

# 7. Academic Years

## academic_years

```text
id
name
start_date
end_date
is_current
created_at
updated_at
```

Rules:

- start_date < end_date
- only one active current academic year
- finalized historical years cannot be casually deleted

Recommended:

```text
status:
DRAFT
ACTIVE
CLOSED
ARCHIVED
```

---

# 8. Terms

## terms

```text
id
academic_year_id
name
term_sequence
start_date
end_date
next_term_resumption
total_school_days

status

created_at
updated_at

submitted_at
submitted_by

approved_at
approved_by

finalized_at
finalized_by

published_at
published_by
```

Term status:

```text
DRAFT
MARK_ENTRY
SUBMITTED
UNDER_REVIEW
APPROVED
FINALIZED
PUBLISHED
REOPENED
CLOSED
```

Rules:

- term belongs to one academic year
- term dates must fall inside academic year
- term start < term end
- term sequence unique within academic year
- overlapping terms prohibited
- finalized terms cannot accept ordinary mark changes

---

# 9. Classes

## classes

```text
id
name
grade_level
class_teacher_id
status
created_at
updated_at
```

---

# 10. Subjects

## subjects

```text
id
name
code
is_elective
status
created_at
updated_at
```

---

# 11. Students

## students

```text
id
student_id_number
first_name
middle_name
last_name
gender
date_of_birth
photo_url
enrollment_date
status
created_at
updated_at
```

Student status:

```text
ACTIVE
ALUMNI
SUSPENDED
WITHDRAWN
TRANSFERRED
```

Student records should not be physically deleted when academic history exists.

---

# 12. Student Enrollment

## student_enrollments

```text
id
student_id
academic_year_id
class_id
roll_number
status
created_at
updated_at
```

Constraint:

```text
UNIQUE(student_id, academic_year_id)
```

Enrollment status:

```text
ACTIVE
COMPLETED
WITHDRAWN
TRANSFERRED
```

---

# 13. Subject Enrollment

## student_subject_enrollments

```text
id
student_enrollment_id
subject_id
created_at
updated_at
```

Constraint:

```text
UNIQUE(student_enrollment_id, subject_id)
```

If the school requires subject selection to vary by term, this model should be extended to include `term_id`.

---

# 14. Guardians

## guardians

```text
id
name
phone
email
relationship
created_at
updated_at
```

## student_guardians

```text
student_id
guardian_id
is_primary
created_at
```

---

# 15. Grading Policies

The revised system must not hardcode 30/70 inside SQL views.

## grading_policies

```text
id
name
academic_year_id
status
version
created_at
created_by
```

Example:

```text
Standard Terminal Policy
Version 1
```

---

# 16. Grading Components

## grading_components

```text
id
grading_policy_id
name
code
weight
component_type
sort_order
```

Example:

```text
CA
30

EXAM
70
```

Constraint:

```text
SUM(active component weights) = 100
```

---

# 17. Assessment Categories

## assessment_categories

```text
id
name
component_id
is_summative
created_at
updated_at
```

Example:

```text
Quiz
Assignment
Class Test
Project
Final Examination
```

Do not use a category's `default_weight` as an ambiguous replacement for grading component weights.

---

# 18. Assessments

## assessments

```text
id
term_id
class_id
subject_id
category_id
title
max_score
date_administered
status
created_by
locked_at
locked_by
created_at
updated_at
```

Assessment status:

```text
DRAFT
OPEN
SUBMITTED
LOCKED
```

---

# 19. Student Scores

## student_assessment_scores

```text
id
assessment_id
student_enrollment_id
raw_score
created_at
updated_at
created_by
updated_by
```

Constraint:

```text
UNIQUE(assessment_id, student_enrollment_id)
```

Database/service validation must guarantee:

```text
Assessment.term
=
StudentEnrollment.academic context

Assessment.class
=
StudentEnrollment.class

Student is enrolled in Assessment.subject
```

A score must never be accepted merely because both foreign keys are individually valid.

---

# 20. Score Validation

Rules:

```text
raw_score >= 0
raw_score <= assessment.max_score
```

Additional validation:

```text
student must belong to assessment class
student must belong to correct academic year
student must be enrolled in subject
term must permit mark entry
assessment must not be locked
teacher must be authorized
```

---

# 21. Grade Bands

## grade_bands

```text
id
grading_policy_id
grade
minimum_score
maximum_score
grade_point
interpretation
sort_order
```

Example:

```text
A
B
C
D
E
F
```

Constraints must prevent:

- overlapping ranges
- invalid ranges
- duplicate grades within one policy

---

# 22. Student Term Evaluation

## student_term_evaluations

```text
id
student_enrollment_id
term_id
days_present
days_absent
conduct_rating
attitude_rating
interest_rating
class_teacher_remarks
headmaster_remarks
created_at
updated_at
```

Validation:

```text
days_present >= 0
days_absent >= 0
days_present + days_absent <= total_school_days
```

If attendance exceptions are required, support:

```text
EXCUSED
UNEXCUSED
```

in a future attendance module.

---

# 23. Live Result Calculation

The system may expose calculated views such as:

```text
vw_student_subject_results
```

However:

> A calculated view is NOT the official historical result.

Views are used during:

- mark entry
- validation
- moderation
- preview

---

# 24. Official Result Snapshot

## term_results

```text
id
student_enrollment_id
term_id

total_score
average_score
class_position
cohort_size
gpa

status

finalized_at
finalized_by

published_at
published_by

created_at
```

Constraint:

```text
UNIQUE(student_enrollment_id, term_id)
```

---

# 25. Official Subject Result Snapshot

## term_result_subjects

```text
id
term_result_id
subject_id

ca_raw_score
ca_max_score
ca_weighted_score

exam_raw_score
exam_max_score
exam_weighted_score

total_score

grade
grade_point
interpretation

subject_position

teacher_remarks

created_at
```

This table is critical because the official report must preserve exactly what the school approved.

---

# 26. Result Snapshot Principle

After finalization:

```text
term_results
term_result_subjects
```

must be immutable.

Do not recalculate published reports from:

```text
student_assessment_scores
```

because those are operational/live records.

---

# 27. Result Status

Recommended:

```text
DRAFT
UNDER_REVIEW
APPROVED
FINALIZED
PUBLISHED
REOPENED
SUPERSEDED
```

Only privileged workflows can move a result backwards.

---

# 28. Finalization Transaction

Finalization must execute inside a database transaction.

Pseudo workflow:

```text
BEGIN

Validate term
Validate all required marks
Validate student cohort
Validate subject enrollment
Calculate subject results
Calculate subject rankings
Calculate student totals
Calculate student averages
Calculate GPA
Calculate class ranking
Create official snapshots
Mark term FINALIZED
Record finalization metadata
Write audit event

COMMIT
```

If any required validation fails:

```text
ROLLBACK
```

No partial finalization should occur.

---

# 29. Correct Cohort Calculation

Never use:

```sql
COUNT(*)
FROM student_enrollments
WHERE class_id = ?
```

without considering academic context.

The cohort must be determined using the correct:

```text
academic_year
+
term
+
class
+
eligible enrollment status
```

Example conceptual query:

```text
StudentEnrollment
WHERE
academic_year_id = current term academic year
AND class_id = target class
AND status = ACTIVE
```

---

# 30. Missing Mark Validation

The system must identify:

```text
Missing CA
Missing Examination
Missing Required Subject
Missing Teacher Remark
Missing Evaluation
```

Validation result example:

```text
Student: STU-00031
Subject: Mathematics

CA: COMPLETE
Exam: MISSING

Result Status:
INCOMPLETE
```

---

# 31. Finalization Blocking

Finalization must fail if blocking errors exist.

Example:

```text
Cannot finalize.

3 students have missing examination scores.

2 students are missing required subjects.

1 assessment contains invalid scores.
```

Warnings may be allowed for non-blocking issues.

---

# 32. Ranking Service

The ranking service should accept:

```text
term
class
eligible students
ranking policy
```

and return:

```text
student_id
score
rank
```

Ranking must be reproducible.

---

# 33. Authorization Model

Authorization consists of two layers:

### Layer 1 — Role

Example:

```text
SUBJECT_TEACHER
```

### Layer 2 — Scope

Example:

```text
Teacher X
→ Mathematics
→ Basic 8A
→ First Term
```

Both conditions must pass.

---

# 34. Permission Examples

## Headmaster

Can:

- view school results
- approve results
- finalize results
- publish results
- reopen results where policy permits

## Examination Officer

Can:

- configure academic data
- monitor marks
- validate
- moderate
- generate reports

Cannot automatically bypass headmaster approval if the workflow requires it.

## Subject Teacher

Can:

- view assigned assessments
- enter assigned scores
- edit scores before lock
- submit scores

Cannot:

- edit another teacher's subject
- edit another class
- finalize a term
- publish results

## Class Teacher

Can:

- view assigned class
- enter evaluations
- enter attendance
- enter remarks

---

# 35. Audit Logs

## audit_logs

```text
id
user_id
action
entity_type
entity_id
old_values
new_values
ip_address
user_agent
created_at
```

Audit records should be append-only.

---

# 36. Public Report Tokens

## generated_reports

```text
id
term_result_id
token_hash
pdf_storage_url

report_version

download_count

generated_at
generated_by

expires_at
revoked_at
last_accessed_at

is_current
superseded_at
```

Never store a reusable public access token in plaintext.

---

# 37. Report Generation

Report generation should operate from:

```text
term_results
+
term_result_subjects
+
school_profile
+
student
+
enrollment
```

not from mutable score-entry records.

---

# 38. Report Versioning

Every generated official report should have a version.

Example:

```text
Report Version 1
Report Version 2
```

If a result is legitimately reopened and re-finalized:

```text
Version 1 → superseded
Version 2 → current
```

The audit log must record why.

---

# 39. SMS Queue

Recommended tables:

## notification_jobs

```text
id
type
recipient
payload
status
attempts
available_at
processed_at
error_message
created_at
```

## sms_logs

```text
id
notification_job_id
recipient_phone
message_body
gateway_reference
delivery_status
dispatched_at
```

---

# 40. CSV Import

Service:

```text
ImportService
```

Workflow:

```text
Parse
→ Validate
→ Preview
→ Confirm
→ Transaction
→ Import
→ Audit
```

Validation errors should have machine-readable codes.

---

# 41. Error Codes

Recommended:

```text
SCORE_EXCEEDS_MAX
SCORE_BELOW_ZERO
STUDENT_NOT_ENROLLED
STUDENT_NOT_REGISTERED_FOR_SUBJECT
ASSESSMENT_LOCKED
TERM_LOCKED
TERM_FINALIZED
MISSING_REQUIRED_SCORE
MISSING_REQUIRED_SUBJECT
UNAUTHORIZED_TEACHER
INVALID_GRADE_RANGE
OVERLAPPING_GRADE_BAND
TERM_ALREADY_FINALIZED
RESULT_ALREADY_PUBLISHED
INVALID_TERM_DATES
INVALID_ACADEMIC_YEAR
```

---

# 42. Database Constraints

The database must enforce as much integrity as possible.

Examples:

```text
UNIQUE(student_id, academic_year_id)

UNIQUE(term_id, class_id, subject_id)

UNIQUE(assessment_id, student_enrollment_id)

UNIQUE(student_enrollment_id, term_id)
```

Use:

```text
CHECK constraints
FOREIGN KEYS
UNIQUE indexes
partial indexes
transactions
```

where appropriate.

---

# 43. Delete Policy

Avoid destructive cascading deletes for official academic records.

For historical entities:

```text
RESTRICT
```

or:

```text
ARCHIVE / SOFT DELETE
```

should generally be preferred.

A student with historical results should never disappear because someone deleted a current enrollment.

---

# 44. Current Academic Year

Do not rely solely on application logic to guarantee one current academic year.

Use a database constraint/partial unique index where appropriate.

The same applies to current terms.

---

# 45. Term Date Rules

The system must validate:

```text
AcademicYear.start <= Term.start

Term.end <= AcademicYear.end

Term.start < Term.end
```

Terms belonging to the same academic year must not overlap unless explicitly supported.

---

# 46. UI Requirements

The dashboard should contain:

```text
Overview
Academic Years
Terms
Classes
Subjects
Teachers
Students
Enrollments
Assessments
Mark Entry
Result Validation
Moderation
Finalization
Reports
SMS
Audit Logs
Settings
```

---

# 47. Mark Entry UI

The mark-entry interface should resemble a spreadsheet.

Example:

| Student | Quiz 1 | Quiz 2 | Assignment | Exam | Status |
|---|---:|---:|---:|---:|---|
| Student A | 8 | 9 | 18 | 65 | Complete |
| Student B | 7 | — | 17 | 61 | Missing |
| Student C | 9 | 8 | 19 | 70 | Complete |

Features:

- keyboard navigation
- paste support where safe
- cell validation
- dirty-state detection
- batch save
- optimistic UI only where safe
- server validation
- clear error messages

---

# 48. Dashboard

The dashboard should display:

```text
Current Academic Year
Current Term
Students
Classes
Subjects
Mark Completion %
Incomplete Results
Pending Teacher Submissions
Pending Approvals
Finalized Classes
Published Reports
SMS Delivery
```

---

# 49. Testing Requirements

The system must include:

## Unit tests

For:

- score calculation
- weighting
- grading
- ranking
- missing mark detection
- authorization
- term state transitions

## Integration tests

For:

- finalization
- report generation
- score entry
- teacher authorization
- database constraints

## End-to-end tests

For:

```text
Teacher login
→ enter marks
→ submit
→ officer review
→ headmaster approval
→ finalize
→ publish
→ access report
```

---

# 50. Critical Test Cases

The implementation must test:

### Test 1

Two students have identical scores.

Expected:

```text
1
1
```

for dense ranking.

### Test 2

A student from a previous academic year exists in the same class.

Expected:

Historical student is excluded from current cohort.

### Test 3

A student is missing an examination score.

Expected:

```text
INCOMPLETE
```

and finalization blocked.

### Test 4

Teacher attempts to edit another subject.

Expected:

```text
UNAUTHORIZED
```

### Test 5

Teacher attempts to edit finalized term.

Expected:

```text
TERM_LOCKED
```

### Test 6

Assessment score exceeds maximum.

Expected:

```text
SCORE_EXCEEDS_MAX
```

### Test 7

User attempts to alter published result.

Expected:

Operation rejected.

### Test 8

Grade bands overlap.

Expected:

Configuration rejected.

---

# 51. Non-Functional Requirements

## Security

Sensitive academic records must only be accessible to authorized users.

## Reliability

Finalization must be atomic.

## Maintainability

Business rules must not be duplicated across UI components.

## Performance

Large mark-entry datasets should use efficient queries and batch operations.

## Auditability

Important academic actions must be traceable.

## Scalability

The architecture should support growth in:

- students
- classes
- assessments
- terms
- academic years

---

# 52. Core Data Flow

```text
USER
 ↓
AUTHENTICATION
 ↓
AUTHORIZATION
 ↓
APPLICATION SERVICE
 ↓
DOMAIN VALIDATION
 ↓
DATABASE
 ↓
LIVE ACADEMIC DATA
 ↓
RESULT CALCULATION
 ↓
VALIDATION
 ↓
MODERATION
 ↓
APPROVAL
 ↓
FINALIZATION
 ↓
IMMUTABLE SNAPSHOT
 ↓
REPORT / PDF / SMS
```

---

# 53. Fundamental Rule

The system must enforce:

```text
LIVE DATA ≠ OFFICIAL RESULT
```

Live data supports operational workflows.

Official result snapshots represent approved academic truth.