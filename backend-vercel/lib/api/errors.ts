/**
 * API Error Handling (RFC 7807 Problem Details)
 * 
 * Standardized error responses for public API
 */

import { NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

export interface ProblemDetails {
  type: string; // URI reference that identifies the problem type
  title: string; // Short, human-readable summary
  status: number; // HTTP status code
  detail?: string; // Human-readable explanation specific to this occurrence
  instance?: string; // URI reference that identifies the specific occurrence
  errors?: Array<{ // Validation errors
    field: string;
    message: string;
    code?: string;
  }>;
  [key: string]: any; // Additional members for extensibility
}

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public type: string = 'about:blank',
    public detail?: string,
    public errors?: Array<{ field: string; message: string; code?: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toProblemDetails(requestId?: string): ProblemDetails {
    return {
      type: `https://docs.everreach.app/errors/${this.type}`,
      title: this.message,
      status: this.statusCode,
      detail: this.detail,
      instance: requestId ? `req_${requestId}` : undefined,
      errors: this.errors,
    };
  }
}

// ============================================================================
// SPECIFIC ERROR TYPES
// ============================================================================

export class ValidationError extends ApiError {
  constructor(
    message: string,
    errors?: Array<{ field: string; message: string; code?: string }>
  ) {
    super(message, 422, 'validation', undefined, errors);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 404, 'not-found');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'forbidden');
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'rate-limit', 'Too many requests. Please try again later.');
    this.name = 'RateLimitError';
    if (retryAfter) {
      this.retryAfter = retryAfter;
    }
  }

  retryAfter?: number;
}

export class ConflictError extends ApiError {
  constructor(message: string, detail?: string) {
    super(message, 409, 'conflict', detail);
    this.name = 'ConflictError';
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string, detail?: string) {
    super(message, 400, 'bad-request', detail);
    this.name = 'BadRequestError';
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', detail?: string) {
    super(message, 500, 'internal-error', detail);
    this.name = 'InternalServerError';
  }
}

// ============================================================================
// ERROR RESPONSE BUILDER
// ============================================================================

/**
 * Build error response following RFC 7807
 */
export function buildErrorResponse(
  error: Error | ApiError,
  requestId?: string
): NextResponse<ProblemDetails> {
  let problemDetails: ProblemDetails;

  if (error instanceof ApiError) {
    problemDetails = error.toProblemDetails(requestId);
  } else {
    // Unexpected error
    console.error('Unexpected error:', error);
    problemDetails = {
      type: 'https://docs.everreach.app/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
      instance: requestId ? `req_${requestId}` : undefined,
    };
  }

  const response = NextResponse.json(problemDetails, {
    status: problemDetails.status,
    headers: {
      'Content-Type': 'application/problem+json',
    },
  });

  // Add Retry-After header for rate limit errors
  if (error instanceof RateLimitError && error.retryAfter) {
    response.headers.set('Retry-After', error.retryAfter.toString());
  }

  return response;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Build validation error from field errors
 */
export function validationError(
  errors: Array<{ field: string; message: string; code?: string }>
): ValidationError {
  return new ValidationError('Validation failed', errors);
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const errors: Array<{ field: string; message: string }> = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push({
        field,
        message: `${field} is required`,
      });
    }
  }

  if (errors.length > 0) {
    throw validationError(errors);
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: T,
  allowedValues: readonly T[],
  fieldName: string
): void {
  if (!allowedValues.includes(value)) {
    throw validationError([{
      field: fieldName,
      message: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
    }]);
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  limit?: number,
  maxLimit: number = 100
): void {
  if (limit !== undefined) {
    if (limit < 1) {
      throw validationError([{
        field: 'limit',
        message: 'limit must be at least 1',
      }]);
    }
    if (limit > maxLimit) {
      throw validationError([{
        field: 'limit',
        message: `limit must not exceed ${maxLimit}`,
      }]);
    }
  }
}

// ============================================================================
// ERROR LOGGING
// ============================================================================

/**
 * Log error with context
 */
export function logError(
  error: Error,
  context: {
    requestId?: string;
    orgId?: string;
    apiKeyId?: string;
    method?: string;
    path?: string;
  }
): void {
  console.error('API Error:', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  ConflictError,
  BadRequestError,
  InternalServerError,
  buildErrorResponse,
  validationError,
  validateRequired,
  validateEnum,
  validatePagination,
  logError,
};
