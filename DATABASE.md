# DATABASE ARCHITECTURE & SCHEMA

## School Examination & Terminal Report Management System
**Database:** PostgreSQL  
**ORM:** Prisma 6.19.3  

---

## 1. Relational Entities (24 Models)

| Entity / Table | Purpose | Key Constraints |
|---|---|---|
| `school_profiles` | School branding, contact, and headmaster signature | Single profile record |
| `users` | Staff, teachers, students, guardians | `UNIQUE(username)`, `UNIQUE(email)` |
| `roles` | System roles | `UNIQUE(name)` |
| `user_roles` | User-role associations | `PRIMARY KEY(user_id, role_id)` |
| `academic_years` | School years (`2026/2027`) | `UNIQUE(name)`, `is_current` check |
| `terms` | Academic terms with lifecycle state machine | `UNIQUE(academic_year_id, term_sequence)` |
| `classes` | School classes (`Basic 7A`, `Basic 8A`) | `UNIQUE(name)` |
| `subjects` | Academic subjects | `UNIQUE(code)` |
| `subject_allocations` | Teacher-subject-class-term mapping | `UNIQUE(term_id, class_id, subject_id)` |
| `students` | Student bio-data & identification | `UNIQUE(student_id_number)` |
| `student_enrollments` | Student class enrollment per year | `UNIQUE(student_id, academic_year_id)` |
| `student_subject_enrollments` | Elective & core subject enrollments | `UNIQUE(student_enrollment_id, subject_id)` |
| `guardians` | Guardian contact information | Phone / Email |
| `student_guardians` | Student-guardian links | `PRIMARY KEY(student_id, guardian_id)` |
| `grading_policies` | Configurable grading configurations | Versioned policies |
| `grading_components` | CA & Exam weights | `SUM(active component weights) = 100` |
| `assessment_categories` | Quiz, Class Test, Exam categories | Component association |
| `grade_bands` | Grade ranges, points, interpretations | Non-overlapping ranges |
| `assessments` | Operational assessments | Status: `OPEN`, `LOCKED` |
| `student_assessment_scores` | Operational scores (Live Data) | `UNIQUE(assessment_id, student_enrollment_id)` |
| `student_term_evaluations` | Attendance, conduct, remarks | `UNIQUE(student_enrollment_id, term_id)` |
| `term_results` | Official immutable student result snapshot | `UNIQUE(student_enrollment_id, term_id)` |
| `term_result_subjects` | Official immutable subject result snapshot | `UNIQUE(term_result_id, subject_id)` |
| `generated_reports` | Public report access metadata | `UNIQUE(token_hash)` |
| `notification_jobs` & `sms_logs` | Async SMS notifications queue | Delivery status tracking |
| `audit_logs` | Append-only audit trail | Indexed by action, entity, timestamp |

---

## 2. Integrity & Deletion Strategy

1. **Delete Restrictions:**
   - Historical academic records enforce `onDelete: Restrict`.
   - Students, enrollments, terms, and academic years with finalized academic data cannot be deleted.
2. **Deterministic Cohorts:**
   - Class cohort queries strictly filter on: `academic_year_id = current AND class_id = target AND status = ACTIVE`.
   - Historical students are excluded from current cohort rankings.
