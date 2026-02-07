/**
 * API Reference Documentation Test
 *
 * Validates that the API_REFERENCE.md file exists and contains
 * comprehensive documentation for all backend endpoints.
 */

import fs from 'fs';
import path from 'path';

describe('API Reference Documentation', () => {
  const docsPath = path.join(__dirname, '../../docs/API_REFERENCE.md');
  let documentationContent: string;

  beforeAll(() => {
    // Read the documentation file
    if (fs.existsSync(docsPath)) {
      documentationContent = fs.readFileSync(docsPath, 'utf-8');
    }
  });

  test('API_REFERENCE.md file exists', () => {
    expect(fs.existsSync(docsPath)).toBe(true);
  });

  test('documentation contains title and introduction', () => {
    expect(documentationContent).toContain('# API Reference');
    expect(documentationContent).toContain('Backend API');
  });

  describe('Authentication Endpoints', () => {
    test('documents POST /api/auth/login', () => {
      expect(documentationContent).toContain('POST /api/auth/login');
      expect(documentationContent).toContain('email');
      expect(documentationContent).toContain('password');
    });

    test('documents POST /api/auth/signup', () => {
      expect(documentationContent).toContain('POST /api/auth/signup');
    });

    test('documents POST /api/auth/logout', () => {
      expect(documentationContent).toContain('POST /api/auth/logout');
    });

    test('documents POST /api/auth/refresh', () => {
      expect(documentationContent).toContain('POST /api/auth/refresh');
    });

    test('documents GET /api/auth/me', () => {
      expect(documentationContent).toContain('GET /api/auth/me');
    });

    test('documents POST /api/auth/forgot-password', () => {
      expect(documentationContent).toContain('POST /api/auth/forgot-password');
    });
  });

  describe('User Endpoints', () => {
    test('documents GET /api/users/profile', () => {
      expect(documentationContent).toContain('GET /api/users/profile');
    });

    test('documents PUT /api/users/profile', () => {
      expect(documentationContent).toContain('PUT /api/users/profile');
    });

    test('documents DELETE /api/users/profile', () => {
      expect(documentationContent).toContain('DELETE /api/users/profile');
    });
  });

  describe('Items CRUD Endpoints', () => {
    test('documents GET /api/items', () => {
      expect(documentationContent).toContain('GET /api/items');
      expect(documentationContent).toContain('pagination');
    });

    test('documents POST /api/items', () => {
      expect(documentationContent).toContain('POST /api/items');
    });

    test('documents GET /api/items/:id', () => {
      expect(documentationContent).toContain('GET /api/items/');
    });

    test('documents PUT /api/items/:id', () => {
      expect(documentationContent).toContain('PUT /api/items/');
    });

    test('documents DELETE /api/items/:id', () => {
      expect(documentationContent).toContain('DELETE /api/items/');
    });

    test('documents GET /api/items/search', () => {
      expect(documentationContent).toContain('GET /api/items/search');
    });
  });

  describe('Subscription Endpoints', () => {
    test('documents GET /api/subscriptions/status', () => {
      expect(documentationContent).toContain('GET /api/subscriptions/status');
    });

    test('documents GET /api/subscriptions/tiers', () => {
      expect(documentationContent).toContain('GET /api/subscriptions/tiers');
    });

    test('documents POST /api/subscriptions/checkout', () => {
      expect(documentationContent).toContain('POST /api/subscriptions/checkout');
    });

    test('documents POST /api/subscriptions/portal', () => {
      expect(documentationContent).toContain('POST /api/subscriptions/portal');
    });
  });

  describe('Webhook Endpoints', () => {
    test('documents POST /api/webhooks/stripe', () => {
      expect(documentationContent).toContain('POST /api/webhooks/stripe');
      expect(documentationContent).toContain('signature');
    });

    test('documents POST /api/webhooks/revenuecat', () => {
      expect(documentationContent).toContain('POST /api/webhooks/revenuecat');
    });
  });

  describe('Utility Endpoints', () => {
    test('documents GET /api/health', () => {
      expect(documentationContent).toContain('GET /api/health');
    });

    test('documents POST /api/upload', () => {
      expect(documentationContent).toContain('POST /api/upload');
    });
  });

  describe('Request/Response Examples', () => {
    test('includes request examples', () => {
      expect(documentationContent).toContain('Request');
      expect(documentationContent).toContain('```json');
    });

    test('includes response examples', () => {
      expect(documentationContent).toContain('Response');
      expect(documentationContent).toContain('200');
    });

    test('includes error examples', () => {
      expect(documentationContent).toContain('400');
      expect(documentationContent).toContain('401');
      expect(documentationContent).toContain('500');
    });
  });

  describe('Documentation Completeness', () => {
    test('includes authentication section', () => {
      expect(documentationContent).toContain('Authentication');
      expect(documentationContent).toContain('Bearer');
    });

    test('includes error handling section', () => {
      expect(documentationContent).toContain('Error');
    });

    test('includes rate limiting information', () => {
      expect(documentationContent).toContain('Rate Limit');
    });
  });
});
