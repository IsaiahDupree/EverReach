/**
 * Test suite for .env.example file
 * Ensures all required environment variables are documented
 */

import * as fs from 'fs';
import * as path from 'path';

describe('.env.example', () => {
  const envExamplePath = path.join(__dirname, '..', '.env.example');

  it('should exist in the backend-kit root directory', () => {
    expect(fs.existsSync(envExamplePath)).toBe(true);
  });

  describe('required variables', () => {
    let envContent: string;

    beforeAll(() => {
      if (fs.existsSync(envExamplePath)) {
        envContent = fs.readFileSync(envExamplePath, 'utf-8');
      } else {
        envContent = '';
      }
    });

    // Required Supabase variables
    it('should include NEXT_PUBLIC_SUPABASE_URL', () => {
      expect(envContent).toContain('NEXT_PUBLIC_SUPABASE_URL');
    });

    it('should include NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
      expect(envContent).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    });

    it('should include SUPABASE_SERVICE_ROLE_KEY', () => {
      expect(envContent).toContain('SUPABASE_SERVICE_ROLE_KEY');
    });

    // Required App variables
    it('should include NEXT_PUBLIC_APP_URL', () => {
      expect(envContent).toContain('NEXT_PUBLIC_APP_URL');
    });

    // Optional Payment variables
    it('should include STRIPE_SECRET_KEY', () => {
      expect(envContent).toContain('STRIPE_SECRET_KEY');
    });

    it('should include STRIPE_WEBHOOK_SECRET', () => {
      expect(envContent).toContain('STRIPE_WEBHOOK_SECRET');
    });

    it('should include REVENUECAT_API_KEY', () => {
      expect(envContent).toContain('REVENUECAT_API_KEY');
    });

    it('should include REVENUECAT_WEBHOOK_SECRET', () => {
      expect(envContent).toContain('REVENUECAT_WEBHOOK_SECRET');
    });

    // Optional Rate Limiting
    it('should include RATE_LIMIT_MAX', () => {
      expect(envContent).toContain('RATE_LIMIT_MAX');
    });
  });

  describe('documentation quality', () => {
    let envContent: string;

    beforeAll(() => {
      if (fs.existsSync(envExamplePath)) {
        envContent = fs.readFileSync(envExamplePath, 'utf-8');
      } else {
        envContent = '';
      }
    });

    it('should include comments explaining required vs optional variables', () => {
      expect(envContent).toMatch(/required|optional/i);
    });

    it('should include placeholder values (not actual secrets)', () => {
      // Check that there are placeholder values like "your_", "xxx", etc.
      expect(envContent).toMatch(/your_|xxx|placeholder|\.\.\./);
    });

    it('should have sections or categories for different services', () => {
      // Should organize variables by service (Supabase, Stripe, etc.)
      expect(envContent.toLowerCase()).toContain('supabase');
    });
  });
});
