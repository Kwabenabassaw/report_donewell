# SCHOOL EXAMINATION & TERMINAL REPORT MANAGEMENT SYSTEM

## Product Requirements Document (PRD)

**Version:** 2.0  
**Status:** Revised / Architecture Approved for Implementation  
**Product Type:** School Academic Assessment & Terminal Reporting System  
**Primary Users:** School Administration, Examination Officers, Teachers, Students and Guardians

---

# 1. Executive Summary

The School Examination & Terminal Report Management System is a centralized academic assessment and terminal reporting platform designed for schools to manage continuous assessment, examinations, student academic records, grading, ranking, moderation, approval, report generation and result distribution.

The system replaces fragmented spreadsheets, manual calculations and manually prepared terminal reports with a controlled digital workflow.

The revised architecture introduces an important distinction between:

1. **Live Academic Data**
2. **Calculated Results**
3. **Approved/Finalized Official Results**

This distinction ensures that marks can be entered and corrected during the active academic workflow while officially published results become immutable after finalization.

The system will support:

- Academic year and term management
- Class management
- Student enrollment
- Subject management
- Teacher assignment
- Dynamic continuous assessment
- Examination marks
- Configurable grading policies
- Automated score calculation
- Subject ranking
- Class ranking
- Result validation
- Academic moderation
- Result approval
- Result finalization
- Immutable result snapshots
- Terminal report generation
- PDF generation
- SMS notifications
- Audit logging
- Role-based and scope-based authorization
- CSV student import
- Report access through secure tokens
- Historical academic records

---

# 2. Product Vision

Create a reliable academic result management system where:

> **Teachers enter marks, the system calculates results, academic officers verify them, authorized administrators approve them, and finalized results are permanently preserved as an official academic record.**

The system must prioritize:

- Accuracy
- Data integrity
- Academic history
- Security
- Auditability
- Performance
- Ease of mark entry
- Reliable report generation

---

# 3. Problem Statement

Many schools depend on spreadsheets and manual processes for:

- recording continuous assessment
- recording examination marks
- calculating totals
- calculating averages
- determining class positions
- determining subject positions
- assigning grades
- preparing report cards
- calculating GPA
- checking missing marks
- communicating results

These processes create risks including:

- calculation errors
- duplicate records
- missing marks
- incorrect rankings
- unauthorized mark changes
- inconsistent grading
- historical data loss
- weak auditability
- report-generation errors

The system will centralize these processes.

---

# 4. Goals

## 4.1 Primary Goals

The system shall:

1. Manage academic years and terms.
2. Manage classes and subjects.
3. Manage student enrollment.
4. Manage teacher-subject-class assignments.
5. Allow teachers to enter assessment marks.
6. Support multiple continuous assessment activities.
7. Support examination scores.
8. Automatically calculate weighted results.
9. Automatically calculate grades.
10. Calculate subject positions.
11. Calculate class positions.
12. Detect missing/incomplete marks.
13. Provide a controlled moderation workflow.
14. Allow authorized officers to approve results.
15. Finalize results into immutable snapshots.
16. Generate terminal reports.
17. Generate official PDFs.
18. Notify guardians/students through SMS.
19. Preserve historical academic records.
20. Record sensitive academic actions in an audit log.

---

# 5. Non-Goals

Version 1/2 will NOT attempt to become a complete school management platform.

The following are outside the initial scope:

- School fees management
- Payroll
- Library management
- Hostel management
- Transport management
- Inventory
- Full learning management system
- Online examinations
- Student discipline case management
- Biometric attendance
- AI-based student performance prediction
- Automated promotion decisions

These may become future modules.

---

# 6. Target Users

## 6.1 Headmaster / Principal

Responsibilities:

- View school-wide performance
- Review results
- Approve results
- Finalize results
- Reopen results where authorized
- Sign reports
- View academic analytics

---

## 6.2 Examination Officer / Academic Registrar

Responsibilities:

- Manage academic years
- Manage terms
- Manage classes
- Manage subjects
- Assign teachers
- Configure grading
- Monitor mark completion
- Validate results
- Generate reports
- Publish reports

---

## 6.3 Class Supervisor / Form Teacher

Responsibilities:

- View class results
- Enter attendance
- Enter student evaluations
- Enter class teacher remarks
- Review student performance
- Participate in moderation

---

## 6.4 Subject Teacher

Responsibilities:

- View assigned classes/subjects
- Create assessments where authorized
- Enter scores
- Correct scores before locking
- Enter subject remarks
- Submit marks for review

Teachers must only access academic records belonging to their authorized class/subject/term assignments.

---

## 6.5 Student

Depending on school configuration:

- View published results
- Download reports
- View academic history

---

## 6.6 Guardian

Depending on school configuration:

- Receive SMS notifications
- Access published reports
- Download student reports

---

# 7. Core Product Modules

The system consists of the following modules:

1. Authentication
2. User Management
3. Role & Permission Management
4. School Profile
5. Academic Year Management
6. Term Management
7. Class Management
8. Subject Management
9. Teacher Assignment
10. Student Management
11. Student Enrollment
12. Subject Enrollment
13. Assessment Management
14. Mark Entry
15. Grading Configuration
16. Result Calculation
17. Result Validation
18. Moderation
19. Result Approval
20. Result Finalization
21. Result Publication
22. Terminal Report Generation
23. PDF Management
24. SMS Notification
25. Audit Logging
26. CSV Import
27. Academic Analytics

---

# 8. Academic Workflow

The complete academic result workflow is:

```text
Academic Year Created
        ↓
Term Created
        ↓
Classes & Subjects Configured
        ↓
Teachers Assigned
        ↓
Students Enrolled
        ↓
Subject Enrollment
        ↓
Assessments Created
        ↓
Mark Entry
        ↓
Teacher Submission
        ↓
Validation
        ↓
Moderation
        ↓
Academic Review
        ↓
Headmaster Approval
        ↓
Finalization
        ↓
Immutable Result Snapshot
        ↓
Publication
        ↓
PDF Generation
        ↓
SMS Notification
```

---

# 9. Term State Machine

A term must have an explicit lifecycle.

Recommended states:

```text
DRAFT
   ↓
MARK_ENTRY
   ↓
SUBMITTED
   ↓
UNDER_REVIEW
   ↓
APPROVED
   ↓
FINALIZED
   ↓
PUBLISHED
```

Exceptional state:

```text
PUBLISHED
   ↓
REOPENED
   ↓
UNDER_REVIEW
```

Reopening must require a privileged role and an audit record.

---

# 10. Assessment Requirements

The system must support multiple assessments.

Example:

```text
Class Score = 30%
Exam Score  = 70%
```

However, 30/70 must not be hardcoded inside the calculation engine.

The system must support configurable grading policies.

Example:

```text
Continuous Assessment = 30%
Final Examination    = 70%
```

Another school configuration could theoretically use:

```text
Continuous Assessment = 40%
Final Examination    = 60%
```

The calculation engine must read the active grading policy.

---

# 11. Assessment Components

A grading policy should contain components.

Example:

```text
Grading Policy: Standard Terminal Policy

Component:
Continuous Assessment
Weight: 30%

Component:
Final Examination
Weight: 70%
```

Within Continuous Assessment:

```text
Quiz 1
Quiz 2
Assignment
Class Test
Project
```

The system must normalize raw marks before applying the component weight.

---

# 12. Score Calculation

For each student and subject:

### Step 1 — Calculate each assessment percentage

```text
Assessment Percentage =
Raw Score / Maximum Score × 100
```

### Step 2 — Calculate component score

For example:

```text
CA Score = normalized CA result × 30%
```

### Step 3 — Calculate examination score

```text
Exam Score =
Exam Percentage × 70%
```

### Step 4 — Calculate final subject score

```text
Subject Total =
CA Weighted Score + Exam Weighted Score
```

Example:

```text
CA = 80%

Exam = 70%

Final:
80 × 0.30 = 24
70 × 0.70 = 49

Total = 73
```

---

# 13. Missing Mark Policy

A student must never silently disappear from the ranking because a mark is missing.

The system must distinguish:

```text
COMPLETE
INCOMPLETE
EXEMPT
ABSENT
WITHHELD
```

A student with incomplete mandatory marks must be flagged.

Example:

```text
Student: John Mensah
Mathematics
CA: 25/30
Exam: MISSING

Status: INCOMPLETE
```

The system must prevent finalization if mandatory marks are missing unless an authorized user explicitly resolves the exception.

---

# 14. Result Calculation

The calculation engine must calculate:

### Subject level

- CA score
- Examination score
- Composite score
- Grade
- Grade point
- Interpretation
- Subject position
- Teacher remark

### Student term level

- Total score
- Average score
- GPA
- Class position
- Cohort size
- Attendance
- Conduct
- Attitude
- Interest
- Class teacher remarks
- Headmaster remarks

---

# 15. Ranking

The system will support configurable ranking policy.

Default ranking method:

```text
DENSE_RANK
```

Example:

```text
Student A = 90 → Position 1
Student B = 90 → Position 1
Student C = 85 → Position 2
Student D = 80 → Position 3
```

The ranking method must be explicitly defined as part of the school's academic policy.

Ranking must be calculated against the correct cohort:

```text
Academic Year
+
Term
+
Class
+
Eligible Students
```

Historical enrollments from another academic year must never inflate the cohort.

---

# 16. Immutable Official Results

This is one of the most important architectural requirements.

Before finalization:

```text
Assessment Data
       ↓
Calculated Result
       ↓
Can change
```

After finalization:

```text
Live Academic Data
       ↓
Official Result Snapshot
       ↓
IMMUTABLE
```

The official snapshot must preserve:

- student
- class
- term
- subject
- CA scores
- examination scores
- composite score
- grade
- grade point
- subject position
- teacher remark
- total
- average
- class position
- GPA
- cohort size

Reports must be generated from this snapshot.

---

# 17. Result Approval

Before finalization:

1. Examination Officer validates marks.
2. Missing marks report is checked.
3. Teachers submit marks.
4. Class supervisor reviews evaluation data.
5. Authorized administrator reviews results.
6. Headmaster approves.

Only authorized users can finalize the term.

---

# 18. Result Finalization

Finalization must:

1. Validate term status.
2. Validate mandatory marks.
3. Validate eligible students.
4. Calculate official results.
5. Calculate subject rankings.
6. Calculate class ranking.
7. Generate immutable result snapshots.
8. Store finalization metadata.
9. Lock the academic term.
10. Write an audit log.

Example:

```text
Finalized By:
User ID

Finalized At:
2026-09-29 14:30

Term:
2026/2027 — First Term
```

---

# 19. Publication

Finalization and publication must be treated as separate concepts.

```text
FINALIZED
```

means the result is academically approved and immutable.

```text
PUBLISHED
```

means students/guardians are allowed to access it.

This allows the school to finalize results before the official release date.

---

# 20. Report Card

A report must contain:

### School information

- School name
- Logo/crest
- Address
- Contact
- Motto

### Student information

- Student name
- Student ID
- Class
- Academic year
- Term
- Photo

### Subject table

| Subject | CA | Exam | Total | Grade | Position | Remark |
|---|---:|---:|---:|---|---:|---|

### Summary

- Total score
- Average
- Class position
- Cohort size
- GPA

### Evaluation

- Attendance
- Conduct
- Attitude
- Interest
- Form teacher remarks
- Headmaster remarks

### Administrative information

- Headmaster signature
- Next term resumption date

---

# 21. Secure Report Access

Public report access must use secure random tokens.

The database must store a token hash rather than a reusable plaintext token.

Token properties:

- Random
- High entropy
- Revocable
- Optional expiry
- Download tracking

---

# 22. SMS

SMS must operate asynchronously.

The academic transaction must NOT wait for an SMS provider.

Workflow:

```text
Finalize Result
      ↓
Commit Database Transaction
      ↓
Create Notification Job
      ↓
Background Worker
      ↓
SMS Provider
      ↓
Delivery Status
```

SMS logs must store:

- recipient
- message
- gateway reference
- status
- timestamp

---

# 23. CSV Import

Student import workflow:

```text
Upload CSV
    ↓
Parse
    ↓
Validate
    ↓
Show Preview
    ↓
Display Errors
    ↓
User Confirms
    ↓
Transaction
    ↓
Import
```

The system must not partially import invalid records unless explicitly designed to do so.

---

# 24. Audit Logging

The following actions must be logged:

- Login
- Logout
- Student creation
- Student update
- Enrollment
- Assessment creation
- Score creation
- Score update
- Score deletion
- Grade policy changes
- Teacher assignment
- Result submission
- Result approval
- Result finalization
- Result reopening
- Result publication
- Report generation
- Report access
- CSV import

Audit logs should contain:

```text
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

---

# 25. Security Requirements

The system must implement:

- Authentication
- Role-based authorization
- Scope-based authorization
- Server-side authorization checks
- Input validation
- Database constraints
- Secure password/session handling
- CSRF protection where applicable
- Secure report tokens
- Audit logging
- Rate limiting for public report endpoints
- Protection against unauthorized score modification

---

# 26. Teacher Access Scope

A teacher must not receive access merely because they have the `TEACHER` role.

Access must be evaluated against:

```text
User
+
Role
+
Term
+
Class
+
Subject
+
Teacher Assignment
```

Example:

```text
Mr. Mensah

Assigned:
Mathematics
Basic 8A
First Term

Allowed:
Basic 8A Mathematics First Term

Denied:
Basic 9B Mathematics
Basic 8A English
Second Term Mathematics
```

---

# 27. Performance Requirements

The system should target:

- Fast mark-entry screens
- Batch score saving
- Server-side pagination
- Indexed academic queries
- Efficient ranking queries
- Transactional finalization
- Background PDF/SMS processing

Mark-entry interfaces should support:

- keyboard navigation
- tab navigation
- direct score input
- validation feedback
- unsaved-cell indicators
- batch save

---

# 28. Success Criteria

The system will be considered successful when:

1. A school can configure an academic year.
2. A term can be created and managed.
3. Students can be enrolled.
4. Teachers can be assigned.
5. Assessments can be created.
6. Teachers can enter scores.
7. Results are automatically calculated.
8. Missing marks are detected.
9. Rankings are correctly calculated.
10. Results can be reviewed.
11. Approved results can be finalized.
12. Finalized results cannot be silently changed.
13. Reports can be generated.
14. Published reports can be securely accessed.
15. SMS notifications can be queued.
16. Every sensitive academic action is auditable.
17. Historical results remain available.

---

# 29. Future Enhancements

Potential future modules:

- Parent portal
- Student portal
- Promotion management
- Transcript generation
- Alumni records
- Advanced analytics
- Attendance management
- Online examination
- Mobile application
- WhatsApp notifications
- AI academic insights
- Multi-school tenancy
- School comparison analytics

These should not compromise the integrity of the core academic record.

---

# 30. Product Principle

The most important product rule is:

> **Never treat a generated report as the source of truth.**

The source of truth progresses through:

```text
Academic Input
      ↓
Validated Live Data
      ↓
Calculated Result
      ↓
Approved Result
      ↓
Immutable Official Result
      ↓
Report / PDF / SMS
```

The official result snapshot is the source used for published academic records.