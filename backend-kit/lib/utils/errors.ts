/**
 * Error Handling Utility
 * BACK-UTIL-002: Error Handler
 *
 * Provides consistent error responses across all API endpoints.
 * Supports custom error codes, HTTP status codes, and error details.
 *
 * @module lib/utils/errors
 */

import { NextResponse } from 'next/server';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    /** Human-readable error message */
    message: string;
    /** HTTP status code */
    statusCode: number;
    /** Optional error code for programmatic handling */
    code?: string;
    /** Optional additional error details */
    details?: any;
  };
}

/**
 * Custom API Error class with HTTP status code and optional error code
 *
 * @example
 * ```ts
 * throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
 * throw new ApiError('Validation failed', 400, 'VALIDATION_ERROR', {
 *   fields: { email: 'Invalid format' }
 * });
 * ```
 */
export class ApiError extends Error {
  /** HTTP status code for the error */
  public readonly statusCode: number;
  /** Optional error code for programmatic handling */
  public readonly code?: string;
  /** Optional additional error details */
  public readonly details?: any;

  /**
   * Create a new API error
   *
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code (defaults to 500)
   * @param code - Optional error code for programmatic handling
   * @param details - Optional additional error details
   */
  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (only available in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Type guard to check if an error is an ApiError
 *
 * @param error - The error to check
 * @returns true if error is an ApiError instance
 *
 * @example
 * ```ts
 * if (isApiError(error)) {
 *   console.log(error.statusCode);
 * }
 * ```
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Create a standard error response object
 *
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @param code - Optional error code
 * @param details - Optional error details
 * @returns Formatted error response object
 *
 * @example
 * ```ts
 * const errorBody = createErrorResponse('Not found', 404, 'RESOURCE_NOT_FOUND');
 * // { error: { message: 'Not found', statusCode: 404, code: 'RESOURCE_NOT_FOUND' } }
 * ```
 */
export function createErrorResponse(
  message: string,
  statusCode: number,
  code?: string,
  details?: any
): ErrorResponse {
  const errorResponse: ErrorResponse = {
    error: {
      message,
      statusCode,
    },
  };

  if (code !== undefined) {
    errorResponse.error.code = code;
  }

  if (details !== undefined) {
    errorResponse.error.details = details;
  }

  return errorResponse;
}

/**
 * Handle errors and return a consistent NextResponse
 *
 * Converts various error types into a standardized error response:
 * - ApiError: Uses the error's status code and details
 * - Error: Returns 500 with generic message (hides internal details)
 * - String: Returns 500 with generic message
 * - Unknown: Returns 500 with generic message
 *
 * @param error - The error to handle (can be ApiError, Error, string, or unknown)
 * @returns NextResponse with error details and appropriate status code
 *
 * @example
 * ```ts
 * // In an API route
 * try {
 *   // ... some operation
 * } catch (error) {
 *   return handleError(error);
 * }
 *
 * // Throwing an ApiError
 * if (!user) {
 *   throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
 * }
 * ```
 */
export function handleError(error: unknown): NextResponse {
  // Handle custom ApiError
  if (isApiError(error)) {
    const errorResponse = createErrorResponse(
      error.message,
      error.statusCode,
      error.code,
      error.details
    );
    return NextResponse.json(errorResponse, { status: error.statusCode });
  }

  // Handle regular Error instances
  // Don't expose internal error messages to clients
  if (error instanceof Error) {
    const errorResponse = createErrorResponse('Internal server error', 500);
    return NextResponse.json(errorResponse, { status: 500 });
  }

  // Handle string errors
  if (typeof error === 'string') {
    const errorResponse = createErrorResponse('Internal server error', 500);
    return NextResponse.json(errorResponse, { status: 500 });
  }

  // Handle unknown error types
  const errorResponse = createErrorResponse('Internal server error', 500);
  return NextResponse.json(errorResponse, { status: 500 });
}

/**
 * Common error factory functions for standard HTTP errors
 */

/**
 * Create a 400 Bad Request error
 *
 * @param message - Error message (default: 'Bad request')
 * @param details - Optional error details
 * @returns ApiError with 400 status code
 */
export function badRequest(message: string = 'Bad request', details?: any): ApiError {
  return new ApiError(message, 400, 'BAD_REQUEST', details);
}

/**
 * Create a 401 Unauthorized error
 *
 * @param message - Error message (default: 'Unauthorized')
 * @returns ApiError with 401 status code
 */
export function unauthorized(message: string = 'Unauthorized'): ApiError {
  return new ApiError(message, 401, 'UNAUTHORIZED');
}

/**
 * Create a 403 Forbidden error
 *
 * @param message - Error message (default: 'Forbidden')
 * @returns ApiError with 403 status code
 */
export function forbidden(message: string = 'Forbidden'): ApiError {
  return new ApiError(message, 403, 'FORBIDDEN');
}

/**
 * Create a 404 Not Found error
 *
 * @param message - Error message (default: 'Not found')
 * @param resourceType - Optional resource type for the code
 * @returns ApiError with 404 status code
 */
export function notFound(message: string = 'Not found', resourceType?: string): ApiError {
  const code = resourceType ? `${resourceType.toUpperCase()}_NOT_FOUND` : 'NOT_FOUND';
  return new ApiError(message, 404, code);
}

/**
 * Create a 409 Conflict error
 *
 * @param message - Error message (default: 'Conflict')
 * @param details - Optional error details
 * @returns ApiError with 409 status code
 */
export function conflict(message: string = 'Conflict', details?: any): ApiError {
  return new ApiError(message, 409, 'CONFLICT', details);
}

/**
 * Create a 422 Unprocessable Entity error
 *
 * @param message - Error message (default: 'Validation failed')
 * @param details - Optional validation error details
 * @returns ApiError with 422 status code
 */
export function validationError(message: string = 'Validation failed', details?: any): ApiError {
  return new ApiError(message, 422, 'VALIDATION_ERROR', details);
}

/**
 * Create a 500 Internal Server Error
 *
 * @param message - Error message (default: 'Internal server error')
 * @returns ApiError with 500 status code
 */
export function internalError(message: string = 'Internal server error'): ApiError {
  return new ApiError(message, 500, 'INTERNAL_ERROR');
}
