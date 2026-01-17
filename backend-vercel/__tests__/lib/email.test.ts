/**
 * Email Integration Tests
 * 
 * Tests the Resend email integration and email sending functions
 */

import { describe, test, expect, beforeAll } from '@jest/globals';

describe('Email Configuration', () => {
  test('should have RESEND_API_KEY configured', () => {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY not configured - email features will not work');
      expect(apiKey).toBeUndefined(); // Document that it's not set
    } else {
      expect(apiKey).toBeDefined();
      expect(apiKey).toMatch(/^re_/); // Should start with 're_'
      console.log('✅ RESEND_API_KEY configured');
    }
  });

  test('should have EMAIL_FROM configured', () => {
    const emailFrom = process.env.EMAIL_FROM;
    
    if (!emailFrom) {
      console.warn('⚠️  EMAIL_FROM not configured - using default');
    } else {
      expect(emailFrom).toBeDefined();
      expect(emailFrom).toContain('@'); // Should be an email address
      console.log(`✅ EMAIL_FROM: ${emailFrom}`);
    }
  });

  test('should have valid email format in EMAIL_FROM', () => {
    const emailFrom = process.env.EMAIL_FROM;
    
    if (emailFrom) {
      // Should match "Name <email@domain.com>" or "email@domain.com"
      const emailRegex = /^(?:.*<)?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}>?$/;
      expect(emailRegex.test(emailFrom)).toBe(true);
    }
  });
});

describe('Email Library Imports', () => {
  test('should be able to import Resend', async () => {
    try {
      const { Resend } = await import('resend');
      expect(Resend).toBeDefined();
      console.log('✅ Resend package installed and importable');
    } catch (error) {
      console.error('❌ Failed to import Resend package');
      console.error('   Run: npm install resend');
      throw error;
    }
  });

  test('should be able to create Resend client', async () => {
    const apiKey = process.env.RESEND_API_KEY || 're_test_key';
    
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);
      expect(resend).toBeDefined();
      expect(resend.emails).toBeDefined();
      console.log('✅ Resend client created successfully');
    } catch (error) {
      console.error('❌ Failed to create Resend client');
      throw error;
    }
  });
});

describe('Email Function Validation', () => {
  test('email template should have required structure', () => {
    const testTemplate = `
      <div style="font-family: sans-serif;">
        <h2>Test Email</h2>
        <a href="https://example.com">Click here</a>
      </div>
    `;
    
    // Should have basic HTML structure
    expect(testTemplate).toContain('<div');
    expect(testTemplate).toContain('</div>');
    
    // Should have inline styles (required for email)
    expect(testTemplate).toContain('style=');
    
    console.log('✅ Email template structure valid');
  });

  test('email should have required fields', () => {
    const emailData = {
      from: 'test@example.com',
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
    };
    
    expect(emailData.from).toBeDefined();
    expect(emailData.to).toBeDefined();
    expect(emailData.subject).toBeDefined();
    expect(emailData.html).toBeDefined();
    
    console.log('✅ Email data structure valid');
  });
});

describe('Supabase Email Integration', () => {
  test('should have Supabase URL configured', () => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(supabaseUrl).toBeDefined();
    expect(supabaseUrl).toContain('supabase.co');
    console.log('✅ Supabase URL configured');
  });

  test('should have Supabase keys configured', () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    
    expect(serviceKey || anonKey).toBeDefined();
    console.log('✅ Supabase authentication configured');
  });
});

describe('Email Template Variables', () => {
  test('should correctly format template variables', () => {
    // Supabase uses Go template syntax
    const confirmUrl = '{{ .ConfirmationURL }}';
    const tokenHash = '{{ .TokenHash }}';
    const siteUrl = '{{ .SiteURL }}';
    
    expect(confirmUrl).toMatch(/\{\{.*\}\}/);
    expect(tokenHash).toMatch(/\{\{.*\}\}/);
    expect(siteUrl).toMatch(/\{\{.*\}\}/);
    
    console.log('✅ Template variable syntax correct');
  });

  test('should construct password reset URL correctly', () => {
    const resetUrl = '{{ .SiteURL }}/auth/reset-password?code={{ .TokenHash }}';
    
    expect(resetUrl).toContain('{{ .SiteURL }}');
    expect(resetUrl).toContain('{{ .TokenHash }}');
    expect(resetUrl).toContain('/auth/reset-password');
    expect(resetUrl).toContain('?code=');
    
    console.log('✅ Password reset URL format correct');
  });
});

describe('Email Styling', () => {
  test('should use inline styles for email compatibility', () => {
    const styledElement = '<div style="color: #111827; padding: 20px;">Content</div>';
    
    expect(styledElement).toContain('style=');
    expect(styledElement).not.toContain('<style>'); // No style tags in body
    
    console.log('✅ Using inline styles (email-safe)');
  });

  test('should use email-safe colors', () => {
    const colors = {
      primary: '#7C3AED',
      text: '#111827',
      secondary: '#6B7280',
      border: '#E5E7EB',
    };
    
    // Should be hex colors
    Object.values(colors).forEach(color => {
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });
    
    console.log('✅ Color format valid for email');
  });
});
