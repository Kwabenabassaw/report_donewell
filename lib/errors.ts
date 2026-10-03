export type ErrorCode =
  | "SCORE_EXCEEDS_MAX"
  | "SCORE_BELOW_ZERO"
  | "STUDENT_NOT_ENROLLED"
  | "STUDENT_NOT_REGISTERED_FOR_SUBJECT"
  | "ASSESSMENT_LOCKED"
  | "TERM_LOCKED"
  | "TERM_NOT_READY"
  | "MISSING_REQUIRED_SCORE"
  | "INCOMPLETE_RESULT"
  | "UNAUTHORIZED_TEACHER"
  | "UNAUTHORIZED_ACTION"
  | "TERM_ALREADY_FINALIZED"
  | "RESULT_ALREADY_PUBLISHED"
  | "INVALID_GRADING_POLICY"
  | "INVALID_GRADE_BANDS"
  | "INVALID_COHORT"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_INACTIVE"
  | "INVALID_ACADEMIC_YEAR"
  | "INVALID_TERM_DATES"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "INVALID_STATE_TRANSITION"
  | "CANNOT_DELETE"

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(code: ErrorCode, message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.statusCode = statusCode
    this.details = details
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
