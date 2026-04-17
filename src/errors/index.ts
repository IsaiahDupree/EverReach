/**
 * Error handling and custom error types
 */

export class SunTraceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'SunTraceError';
  }
}

export class ValidationError extends SunTraceError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class StorageError extends SunTraceError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR', 500);
    this.name = 'StorageError';
  }
}

export class AuthenticationError extends SunTraceError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends SunTraceError {
  constructor(message: string) {
    super(message, 'AUTHZ_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends SunTraceError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends SunTraceError {
  constructor(message: string) {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

export function errorToResponse(error: Error): { statusCode: number; body: string } {
  if (error instanceof SunTraceError) {
    return {
      statusCode: error.statusCode,
      body: JSON.stringify({
        error: error.message,
        code: error.code,
      }),
    };
  }

  return {
    statusCode: 500,
    body: JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    }),
  };
}
