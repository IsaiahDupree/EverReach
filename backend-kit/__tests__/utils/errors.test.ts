/**
 * Backend Error Handler Tests
 * BACK-UTIL-002: Error Handler
 *
 * Tests for the error handling utility that provides consistent
 * error responses across all API endpoints.
 */

import { NextResponse } from 'next/server';
import {
  ApiError,
  ErrorResponse,
  handleError,
  createErrorResponse,
  isApiError,
} from '@/lib/utils/errors';

describe('BACK-UTIL-002: Error Handler', () => {
  describe('ApiError class', () => {
    it('should create an ApiError with message and status code', () => {
      const error = new ApiError('Not found', 404);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBeUndefined();
    });

    it('should create an ApiError with optional error code', () => {
      const error = new ApiError('Invalid input', 400, 'VALIDATION_ERROR');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create an ApiError with optional details', () => {
      const details = { field: 'email', issue: 'invalid format' };
      const error = new ApiError('Validation failed', 400, 'VALIDATION_ERROR', details);

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
    });

    it('should default to 500 if no status code provided', () => {
      const error = new ApiError('Something went wrong');

      expect(error.statusCode).toBe(500);
    });
  });

  describe('isApiError function', () => {
    it('should return true for ApiError instances', () => {
      const error = new ApiError('Test error', 400);

      expect(isApiError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Regular error');

      expect(isApiError(error)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      expect(isApiError({ message: 'Not an error' })).toBe(false);
      expect(isApiError('string error')).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
    });
  });

  describe('createErrorResponse function', () => {
    it('should create a standard error response object', () => {
      const response = createErrorResponse('Not found', 404);

      expect(response).toEqual({
        error: {
          message: 'Not found',
          statusCode: 404,
        },
      });
    });

    it('should include error code if provided', () => {
      const response = createErrorResponse('Invalid input', 400, 'VALIDATION_ERROR');

      expect(response).toEqual({
        error: {
          message: 'Invalid input',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should include details if provided', () => {
      const details = { fields: ['email', 'password'] };
      const response = createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        details
      );

      expect(response).toEqual({
        error: {
          message: 'Validation failed',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details,
        },
      });
    });
  });

  describe('handleError function', () => {
    it('should handle ApiError and return NextResponse with correct status', () => {
      const error = new ApiError('Not found', 404, 'RESOURCE_NOT_FOUND');
      const response = handleError(error);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(404);
    });

    it('should handle ApiError and return correct error body', async () => {
      const error = new ApiError('Unauthorized', 401, 'AUTH_REQUIRED');
      const response = handleError(error);
      const body = await response.json();

      expect(body).toEqual({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
          code: 'AUTH_REQUIRED',
        },
      });
    });

    it('should handle regular Error and return 500', () => {
      const error = new Error('Unexpected error');
      const response = handleError(error);

      expect(response.status).toBe(500);
    });

    it('should handle regular Error and return generic message', async () => {
      const error = new Error('Database connection failed');
      const response = handleError(error);
      const body = await response.json();

      expect(body).toEqual({
        error: {
          message: 'Internal server error',
          statusCode: 500,
        },
      });
    });

    it('should handle string errors', () => {
      const response = handleError('Something went wrong');

      expect(response.status).toBe(500);
    });

    it('should handle string errors with generic message', async () => {
      const response = handleError('Database error');
      const body = await response.json();

      expect(body).toEqual({
        error: {
          message: 'Internal server error',
          statusCode: 500,
        },
      });
    });

    it('should handle unknown error types', () => {
      const response = handleError({ unknown: 'error object' });

      expect(response.status).toBe(500);
    });

    it('should include details in ApiError response', async () => {
      const details = { field: 'email', reason: 'already exists' };
      const error = new ApiError('User exists', 409, 'DUPLICATE_USER', details);
      const response = handleError(error);
      const body = await response.json();

      expect(body.error.details).toEqual(details);
    });
  });

  describe('Common HTTP error helpers', () => {
    it('should create 400 Bad Request error', async () => {
      const error = new ApiError('Invalid input', 400);
      const response = handleError(error);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.message).toBe('Invalid input');
    });

    it('should create 401 Unauthorized error', async () => {
      const error = new ApiError('Authentication required', 401);
      const response = handleError(error);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.message).toBe('Authentication required');
    });

    it('should create 403 Forbidden error', async () => {
      const error = new ApiError('Access denied', 403);
      const response = handleError(error);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.message).toBe('Access denied');
    });

    it('should create 404 Not Found error', async () => {
      const error = new ApiError('Resource not found', 404);
      const response = handleError(error);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.message).toBe('Resource not found');
    });

    it('should create 409 Conflict error', async () => {
      const error = new ApiError('Resource already exists', 409);
      const response = handleError(error);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error.message).toBe('Resource already exists');
    });

    it('should create 422 Unprocessable Entity error', async () => {
      const error = new ApiError('Validation failed', 422);
      const response = handleError(error);
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error.message).toBe('Validation failed');
    });

    it('should create 500 Internal Server Error', async () => {
      const error = new ApiError('Server error', 500);
      const response = handleError(error);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.message).toBe('Server error');
    });
  });

  describe('Acceptance Criteria', () => {
    it('Standard error format - all errors follow consistent structure', async () => {
      const testCases = [
        new ApiError('Bad Request', 400),
        new ApiError('Unauthorized', 401),
        new ApiError('Not Found', 404),
        new Error('Unexpected'),
      ];

      for (const testError of testCases) {
        const response = handleError(testError);
        const body = await response.json();

        // All errors should have this structure
        expect(body).toHaveProperty('error');
        expect(body.error).toHaveProperty('message');
        expect(body.error).toHaveProperty('statusCode');
        expect(typeof body.error.message).toBe('string');
        expect(typeof body.error.statusCode).toBe('number');
      }
    });

    it('HTTP status codes - responses use correct HTTP status codes', () => {
      const statusCodes = [400, 401, 403, 404, 409, 422, 500];

      for (const code of statusCodes) {
        const error = new ApiError(`Error with code ${code}`, code);
        const response = handleError(error);

        expect(response.status).toBe(code);
      }
    });
  });

  describe('Production Scenarios', () => {
    it('should handle Supabase errors gracefully', async () => {
      // Simulate a typical Supabase error
      const supabaseError = {
        message: 'duplicate key value violates unique constraint',
        code: '23505',
        details: 'Key (email)=(test@example.com) already exists.',
      };

      const response = handleError(supabaseError);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.message).toBe('Internal server error');
    });

    it('should handle validation errors with field details', async () => {
      const validationDetails = {
        fields: {
          email: 'Invalid email format',
          password: 'Password too short',
        },
      };

      const error = new ApiError('Validation failed', 400, 'VALIDATION_ERROR', validationDetails);
      const response = handleError(error);
      const body = await response.json();

      expect(body.error.details).toEqual(validationDetails);
      expect(response.status).toBe(400);
    });

    it('should handle authentication errors consistently', async () => {
      const authError = new ApiError('Invalid credentials', 401, 'AUTH_FAILED');
      const response = handleError(authError);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('AUTH_FAILED');
      expect(body.error.message).toBe('Invalid credentials');
    });

    it('should never expose sensitive error details in production', async () => {
      // Regular errors should not expose internal details
      const internalError = new Error('Database connection string: postgres://user:pass@localhost');
      const response = handleError(internalError);
      const body = await response.json();

      // Should return generic message, not expose database credentials
      expect(body.error.message).toBe('Internal server error');
      expect(body.error.message).not.toContain('postgres://');
      expect(body.error.message).not.toContain('pass@');
    });
  });

  describe('Type Safety', () => {
    it('should properly type ErrorResponse', () => {
      const response: ErrorResponse = {
        error: {
          message: 'Test',
          statusCode: 400,
        },
      };

      expect(response.error.message).toBe('Test');
      expect(response.error.statusCode).toBe(400);
    });

    it('should properly type ErrorResponse with optional fields', () => {
      const response: ErrorResponse = {
        error: {
          message: 'Test',
          statusCode: 400,
          code: 'TEST_ERROR',
          details: { field: 'test' },
        },
      };

      expect(response.error.code).toBe('TEST_ERROR');
      expect(response.error.details).toEqual({ field: 'test' });
    });
  });
});
