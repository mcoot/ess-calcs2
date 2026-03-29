export const ErrorCodes = {
  PARSE_ERROR: 'PARSE_ERROR',
  MISSING_RATE: 'MISSING_RATE',
  VALIDATION: 'VALIDATION',
  INTERNAL: 'INTERNAL',
  NOT_FOUND: 'NOT_FOUND',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

export class AppError extends Error {
  readonly code: ErrorCode
  readonly cause?: unknown

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.cause = cause
  }
}
